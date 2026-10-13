import test from 'node:test';
import assert from 'node:assert/strict';
import { createGames, tttWinner, c4Drop, c4Winner, rpsRound, C4_COLS, C4_ROWS } from '../src/games.js';

const U = (id) => ({ id, name: id.toUpperCase() });
const mk = () => { let t = 1000; const clock = () => t; const g = createGames({ clock, random: () => 0.5 }); return { g, adv: (ms) => { t += ms; }, clock }; };

test('tic-tac-toe rules: lines and draws', () => {
  assert.deepEqual(tttWinner([0, 0, 0, null, null, null, null, null, null]).line, [0, 1, 2]);
  assert.equal(tttWinner([0, 1, 0, 0, 1, 1, 1, 0, 0]).who, -1);
  assert.equal(tttWinner(Array(9).fill(null)), null);
});

test('connect four: gravity, full columns and four in a row', () => {
  const board = Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(null));
  assert.equal(c4Drop(board, 3, 0), C4_ROWS - 1);
  assert.equal(c4Drop(board, 3, 1), C4_ROWS - 2);
  for (let i = 0; i < C4_ROWS - 2; i += 1) c4Drop(board, 3, 0);
  assert.equal(c4Drop(board, 3, 0), -1);
  assert.equal(c4Drop(board, 9, 0), -1);
  const b2 = Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(null));
  [0, 1, 2, 3].forEach((c) => c4Drop(b2, c, 1));
  assert.equal(c4Winner(b2).who, 1);
});

test('rock paper scissors: who wins a round', () => {
  assert.equal(rpsRound('rock', 'scissors'), 0);
  assert.equal(rpsRound('rock', 'paper'), 1);
  assert.equal(rpsRound('paper', 'paper'), -1);
});

test('two-player games start when the second person joins and enforce turns', () => {
  const { g } = mk();
  const room = g.create(U('a'), 'ttt');
  assert.equal(room.status, 'lobby');
  g.join(U('b'), room.id);
  assert.equal(room.status, 'playing');
  assert.throws(() => g.move(U('b'), room.id, { cell: 0 }), /Not your turn/);
  g.move(U('a'), room.id, { cell: 0 });
  assert.throws(() => g.move(U('b'), room.id, { cell: 0 }), /empty square/);
  [[ 'b', 3 ], ['a', 1], ['b', 4], ['a', 2]].forEach(([u, cell]) => g.move(U(u), room.id, { cell }));
  assert.equal(room.status, 'done');
  assert.equal(room.state.winner, 0);
  g.rematch(U('b'), room.id);
  assert.equal(room.status, 'playing');
});

test('nobody can be in two games, a third player is turned away, leaving forfeits', () => {
  const { g } = mk();
  const room = g.create(U('a'), 'c4');
  assert.throws(() => g.create(U('a'), 'ttt'), /current game/);
  g.join(U('b'), room.id);
  assert.throws(() => g.join(U('c'), room.id), /already started|full/);
  g.leave(U('b'), room.id);
  assert.equal(room.status, 'done');
  assert.equal(room.state.winner, 0);
});

test('rock paper scissors hides the first pick and is best of three', () => {
  const { g } = mk();
  const room = g.create(U('a'), 'rps');
  g.join(U('b'), room.id);
  g.move(U('a'), room.id, { pick: 'rock' });
  const theirs = g.view(room, 'b');
  assert.equal(theirs.state.picks[0], true); // b only learns that a has picked
  assert.throws(() => g.move(U('a'), room.id, { pick: 'paper' }), /already picked/);
  g.move(U('b'), room.id, { pick: 'scissors' });
  g.move(U('a'), room.id, { pick: 'rock' }); g.move(U('b'), room.id, { pick: 'scissors' });
  assert.equal(room.status, 'done');
  assert.equal(room.state.winner, 0);
});

test('reaction race: false start, first tap wins, five rounds decide the winner', () => {
  const { g, adv } = mk();
  const room = g.create(U('a'), 'race');
  g.join(U('b'), room.id);
  g.join(U('c'), room.id);
  assert.equal(room.status, 'lobby');
  assert.throws(() => g.start(U('b'), room.id), /Only the host/);
  g.start(U('a'), room.id);
  assert.equal(g.view(room, 'a').state.goAt, null); // the GO moment is not leaked
  g.move(U('c'), room.id, { tap: 1 }); // too early
  assert.deepEqual(room.state.early, [2]);
  for (let r = 1; r <= 5; r += 1) {
    adv(6000); g.tick(room); assert.equal(room.state.phase, 'go');
    g.move(U('a'), room.id, { tap: 1 });
    g.move(U('b'), room.id, { tap: 1 }); // too late: round already won
    assert.equal(room.state.phase, 'result');
    adv(3000); g.tick(room);
  }
  assert.equal(room.status, 'done');
  assert.equal(room.state.winner, 0);
  assert.deepEqual(room.state.scores, [5, 0, 0]);
});

test('lobbies and your own games are listed; stale rooms are swept away', () => {
  const { g, adv } = mk();
  const room = g.create(U('a'), 'race');
  assert.equal(g.listFor('b').length, 1);
  g.join(U('b'), room.id); g.start(U('a'), room.id);
  assert.equal(g.listFor('c').length, 0); // started games are private to their players
  adv(31 * 60 * 1000);
  g.sweep();
  assert.equal(g.rooms.size, 0);
});

test('closing a finished game hides it for that player only', () => {
  const { g } = mk();
  const room = g.create(U('a'), 'rps'); g.join(U('b'), room.id);
  g.leave(U('a'), room.id); // forfeit: finished
  g.leave(U('a'), room.id); // close
  assert.equal(g.listFor('a').length, 0);
  assert.equal(g.listFor('b').length, 1);
  g.leave(U('b'), room.id);
  assert.equal(g.rooms.size, 0);
});

test('battleship: fleets fit, hits and sinks, turns, hidden boards', async () => {
  const { placeFleet, bsFire, bsAllSunk, BS_FLEET, BS_SIZE } = await import('../src/games.js');
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 0; k < 30; k += 1) {
    const f = placeFleet(rnd); const all = f.flatMap((x) => x.cells);
    assert.equal(new Set(all).size, BS_FLEET.reduce((a, b) => a + b, 0));
    assert.ok(all.every((c) => c >= 0 && c < BS_SIZE * BS_SIZE));
    f.forEach((x) => { const rows = new Set(x.cells.map((c) => Math.floor(c / BS_SIZE))); const cols = new Set(x.cells.map((c) => c % BS_SIZE)); assert.ok(rows.size === 1 || cols.size === 1); });
  }
  const fleet = [{ cells: [0, 1], hits: [] }];
  assert.equal(bsFire(fleet, 5).result, 'miss');
  assert.equal(bsFire(fleet, 0).result, 'hit');
  assert.equal(bsFire(fleet, 1).result, 'sunk');
  assert.ok(bsAllSunk(fleet));
  const { g } = mk(); const room = g.create(U('a'), 'bs'); g.join(U('b'), room.id);
  assert.throws(() => g.move(U('b'), room.id, { cell: 0 }), /Not your turn/);
  const v = g.view(room, 'a');
  assert.equal(v.state.fleets, undefined);
  assert.equal(v.state.mine.length, BS_FLEET.length);
  assert.equal(v.state.foeCells, null);
  g.move(U('a'), room.id, { cell: 3 });
  assert.throws(() => g.move(U('b'), room.id, { cell: 99 }), /have not fired/);
  g.move(U('b'), room.id, { cell: 3 });
  assert.throws(() => g.move(U('a'), room.id, { cell: 3 }), /have not fired/);
  // sink everything: a wins and the enemy fleet is shown at the end
  const foe = room.state.fleets[1].flatMap((x) => x.cells);
  let a = 0; for (const c of foe) { while (room.state.turn !== 0) g.move(U('b'), room.id, { cell: [...Array(64).keys()].find((x) => !room.state.shots[1][x]) }); if (room.state.shots[0][c]) continue; g.move(U('a'), room.id, { cell: c }); a += 1; }
  assert.equal(room.status, 'done'); assert.equal(room.state.winner, 0);
  assert.ok(g.view(room, 'b').state.foeCells);
});

test('pig dice: a 1 loses the turn total, hold banks it, first to the target wins', () => {
  const rolls = [3, 4, 1, 6, 6]; let i = 0;
  const g = createGames({ clock: () => 1, random: () => (rolls[i++ % rolls.length] - 1) / 6 + 0.01 });
  const room = g.create(U('a'), 'pig'); g.join(U('b'), room.id); g.join(U('c'), room.id);
  assert.equal(room.status, 'lobby'); g.start(U('a'), room.id); i = 0;
  assert.throws(() => g.move(U('b'), room.id, { act: 'roll' }), /Not your turn/);
  assert.throws(() => g.move(U('a'), room.id, { act: 'hold' }), /Roll first/);
  g.move(U('a'), room.id, { act: 'roll' }); g.move(U('a'), room.id, { act: 'roll' });
  assert.equal(room.state.turnTotal, 7);
  g.move(U('a'), room.id, { act: 'roll' }); // a 1
  assert.equal(room.state.turnTotal, 0); assert.equal(room.state.turn, 1); assert.deepEqual(room.state.scores, [0, 0, 0]);
  g.move(U('b'), room.id, { act: 'roll' }); g.move(U('b'), room.id, { act: 'hold' });
  assert.equal(room.state.scores[1], 6); assert.equal(room.state.turn, 2);
  room.state.scores[2] = 45; room.state.turn = 2; i = 3; // next roll is a 6... bank to win
  g.move(U('c'), room.id, { act: 'roll' }); g.move(U('c'), room.id, { act: 'hold' });
  assert.equal(room.status, 'done'); assert.equal(room.state.winner, 2);
});

test('memory duel: matches keep the turn, misses pass it, faces stay hidden', () => {
  const { g } = mk(); const room = g.create(U('a'), 'mem'); g.join(U('b'), room.id); g.start(U('a'), room.id);
  const deck = room.state.deck;
  const view = g.view(room, 'a'); assert.equal(view.state.deck, undefined); assert.deepEqual(view.state.faces, {});
  const first = 0; const mate = deck.findIndex((x, k) => k !== 0 && x === deck[0]); const other = deck.findIndex((x) => x !== deck[0]);
  g.move(U('a'), room.id, { cell: first });
  assert.equal(Object.keys(g.view(room, 'b').state.faces).length, 1);
  assert.throws(() => g.move(U('a'), room.id, { cell: first }), /face-down/);
  g.move(U('a'), room.id, { cell: mate });
  assert.equal(room.state.turn, 0); assert.equal(room.state.scores[0], 1);
  const free = deck.map((_, k) => k).filter((k) => room.state.matched[k] === null);
  const x = free[0]; const y = free.find((k) => deck[k] !== deck[x]);
  g.move(U('a'), room.id, { cell: x }); g.move(U('a'), room.id, { cell: y });
  assert.equal(room.state.turn, 1);
  assert.equal(Object.keys(g.view(room, 'b').state.faces).length, 4); // the pair a just missed is visible to everyone
  g.move(U('b'), room.id, { cell: free.find((k) => k !== x && k !== y) });
  assert.equal(room.state.reveal, null);
  void other;
});

test('tug of war: waits for the start, ignores auto-clicking, pulls the rope', () => {
  const { g, adv } = mk(); const room = g.create(U('a'), 'tug'); g.join(U('b'), room.id);
  g.move(U('a'), room.id, { tap: 1 }); assert.equal(room.state.pos, 0); // not started
  adv(4000);
  g.move(U('a'), room.id, { tap: 1 }); g.move(U('a'), room.id, { tap: 1 });
  assert.equal(room.state.pos, 1); // the second tap came too fast
  adv(100); g.move(U('b'), room.id, { tap: 1 }); assert.equal(room.state.pos, 0);
  for (let k = 0; k < 40 && room.status === 'playing'; k += 1) { adv(100); g.move(U('a'), room.id, { tap: 1 }); }
  assert.equal(room.status, 'done'); assert.equal(room.state.winner, 0);
  assert.equal(g.view(room, 'a').state.lastTap, undefined);
});
