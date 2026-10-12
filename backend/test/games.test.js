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
