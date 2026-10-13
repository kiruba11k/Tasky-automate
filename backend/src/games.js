// Multiplayer games between teammates. Rooms live in memory (they are short-lived: a lobby, a match, a rematch) and the server is
// the referee, so nobody can cheat by editing their browser. Everyone connected to /api/games/stream is told "changed" and re-reads
// their own view of the rooms. Games: tic-tac-toe, connect four, rock-paper-scissors and a reaction race (2-8 players).

export const GAMES = {
  ttt: { name: 'Tic-tac-toe', min: 2, max: 2 },
  c4: { name: 'Connect four', min: 2, max: 2 },
  rps: { name: 'Rock paper scissors', min: 2, max: 2 },
  race: { name: 'Reaction race', min: 2, max: 8 },
  bs: { name: 'Battleship', min: 2, max: 2 },
  pig: { name: 'Pig dice', min: 2, max: 4 },
  mem: { name: 'Memory duel', min: 2, max: 4 },
  tug: { name: 'Tug of war', min: 2, max: 2 },
  ludo: { name: 'Ludo', min: 2, max: 4 },
  spin: { name: 'Spin the bottle', min: 2, max: 8 },
};
export const LUDO_HOME = 56; // 0..50 on the shared ring, 51..55 up the home column, 56 = home
export const LUDO_OFFSETS = { 2: [0, 26], 3: [0, 13, 26], 4: [0, 13, 26, 39] };
export const SPIN_TRUTHS = [
  'What is one thing about your job that you secretly love?', 'What was your very first job?', 'What is the best piece of advice a teammate ever gave you?',
  'Which meeting would you delete from the calendar forever?', 'What is your most embarrassing video-call moment?', 'What song gets you into work mode?',
  'What is a small win you are proud of this month?', 'If you could swap jobs with anyone on the team for a day, who and why?', 'What is your go-to snack at your desk?',
  'What skill do you wish you had learned earlier?', 'Which teammate would you want on your side in a quiz night?', 'What is the weirdest thing in your bag right now?',
  'What is the funniest thing that ever happened at work?', 'What would your autobiography be called?', 'What is one thing you would change about Mondays?',
  'Which app do you spend the most time on besides work?', 'What is your hidden talent?', 'What is your dream holiday destination?',
];
export const SPIN_DARES = [
  'Do your best impression of a teammate (kindly!)', 'Speak like a news reporter until your next turn', 'Do ten jumping jacks',
  'Sing the chorus of any song', 'Say the alphabet backwards as fast as you can', 'Show the last photo in your gallery (only if you are happy to)',
  'Give a one-minute pitch for a pencil', 'Talk in a robot voice for the next minute', 'Do a dramatic slow-motion walk across the room',
  'Compliment every player in the game', 'Balance something on your head for ten seconds', 'Draw a cat with your eyes closed and show it',
  'Do your best victory dance', 'Tell a joke. If nobody laughs, tell another', 'Hold a plank for twenty seconds',
  'Mime your job and let everyone guess what you are doing', 'Say "synergy" in five different accents', 'Make up a slogan for the team in ten seconds',
];
export const BS_SIZE = 8;
export const BS_FLEET = [4, 3, 3, 2];
export const PIG_TARGET = 50;
export const MEM_SYMBOLS = ['🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐙', '🦄'];
export const TUG_REACH = 24; // net taps that win the rope
export const TUG_GAP_MS = 60; // faster than this from one player is ignored (no auto-clickers)
export const RACE_ROUNDS = 5;
const ROOM_TTL_MS = 30 * 60 * 1000; // a room with no activity for half an hour is dropped

// ---------- pure rules (exported for tests) ----------
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export function tttWinner(board) {
  for (const [a, b, c] of LINES) if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) return { who: board[a], line: [a, b, c] };
  return board.every((x) => x !== null) ? { who: -1, line: [] } : null; // -1 = draw
}
export const C4_COLS = 7;
export const C4_ROWS = 6;
export function c4Drop(board, col, who) { // board[r][c], r = 0 is the top; returns the row it landed in, or -1
  if (!Number.isInteger(col) || col < 0 || col >= C4_COLS) return -1;
  for (let r = C4_ROWS - 1; r >= 0; r -= 1) if (board[r][col] === null) { board[r][col] = who; return r; }
  return -1;
}
export function c4Winner(board) {
  const at = (r, c) => (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS ? board[r][c] : undefined);
  for (let r = 0; r < C4_ROWS; r += 1) {
    for (let c = 0; c < C4_COLS; c += 1) {
      const w = board[r][c];
      if (w === null) continue;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const cells = [0, 1, 2, 3].map((k) => [r + dr * k, c + dc * k]);
        if (cells.every(([rr, cc]) => at(rr, cc) === w)) return { who: w, line: cells };
      }
    }
  }
  return board[0].every((x) => x !== null) ? { who: -1, line: [] } : null;
}
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
export const rpsRound = (a, b) => (a === b ? -1 : BEATS[a] === b ? 0 : 1); // index of the winner, -1 draw

/** Random fleet on a BS_SIZE grid: ships never touch the edge of another (they may not overlap). */
export function placeFleet(random = Math.random) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const taken = new Set(); const fleet = []; let ok = true;
    for (const len of BS_FLEET) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries += 1) {
        const horiz = random() < 0.5;
        const r = Math.floor(random() * (horiz ? BS_SIZE : BS_SIZE - len + 1));
        const c = Math.floor(random() * (horiz ? BS_SIZE - len + 1 : BS_SIZE));
        const cells = Array.from({ length: len }, (_, k) => (horiz ? r * BS_SIZE + c + k : (r + k) * BS_SIZE + c));
        if (cells.some((x) => taken.has(x))) continue;
        cells.forEach((x) => taken.add(x)); fleet.push({ cells, hits: [] }); placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return fleet;
  }
  return BS_FLEET.map((len, r) => ({ cells: Array.from({ length: len }, (_, k) => r * 2 * BS_SIZE + k), hits: [] })); // a stuck random source still gets a legal fleet
}
/** Fire at a cell of someone's fleet: { result: 'miss'|'hit'|'sunk', ship } */
export function bsFire(fleet, cell) {
  for (const ship of fleet) {
    if (ship.cells.includes(cell)) {
      if (!ship.hits.includes(cell)) ship.hits.push(cell);
      return { result: ship.hits.length === ship.cells.length ? 'sunk' : 'hit', ship };
    }
  }
  return { result: 'miss', ship: null };
}
export const bsAllSunk = (fleet) => fleet.every((s) => s.hits.length === s.cells.length);

export const ludoCell = (offset, p) => (p >= 0 && p <= 50 ? (offset + p) % 52 : null);
export const ludoSafe = (cell) => cell % 13 === 0 || cell % 13 === 8;
/** Token numbers that can legally move with this die. A 6 brings a token out; a token must finish with an exact count. */
export function ludoMoves(tokens, d) {
  return tokens.map((p, i) => (p === -1 ? (d === 6 ? i : -1) : p < LUDO_HOME && p + d <= LUDO_HOME ? i : -1)).filter((i) => i >= 0);
}
/** Moves a token; returns who it sent back to the yard. */
export function ludoMove(state, who, token, d) {
  const mine = state.tokens[who]; const from = mine[token]; const to = from === -1 ? 0 : from + d;
  mine[token] = to; const sent = [];
  const cell = ludoCell(state.offsets[who], to);
  if (cell !== null && !ludoSafe(cell)) {
    state.tokens.forEach((ts, w) => { if (w !== who) ts.forEach((p, i) => { if (ludoCell(state.offsets[w], p) === cell) { ts[i] = -1; sent.push({ who: w, token: i }); } }); });
  }
  return { from, to, sent };
}

// ---------- room engine ----------
const newState = (game, players, { random = Math.random, clock = Date.now } = {}) => {
  if (game === 'ttt') return { board: Array(9).fill(null), turn: 0, winner: null, line: [] };
  if (game === 'c4') return { board: Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(null)), turn: 0, winner: null, line: [] };
  if (game === 'rps') return { round: 1, picks: [null, null], last: null, score: [0, 0], winner: null };
  if (game === 'bs') return { fleets: [placeFleet(random), placeFleet(random)], shots: [{}, {}], turn: 0, winner: null, last: null, seq: 0 };
  if (game === 'pig') return { scores: players.map(() => 0), turn: 0, turnTotal: 0, roll: null, rollSeq: 0, winner: null, target: PIG_TARGET };
  if (game === 'mem') {
    const deck = [...MEM_SYMBOLS, ...MEM_SYMBOLS];
    for (let i = deck.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return { deck, matched: deck.map(() => null), up: [], reveal: null, seq: 0, scores: players.map(() => 0), turn: 0, winner: null };
  }
  if (game === 'ludo') return { offsets: LUDO_OFFSETS[players.length], tokens: players.map(() => [-1, -1, -1, -1]), turn: 0, phase: 'roll', dice: null, legal: [], last: null, seq: 0, winner: null };
  if (game === 'spin') return { turn: 0, phase: 'spin', target: null, bottle: { angle: 0, seq: 0 }, card: null, used: [], scores: players.map(() => 0), rounds: 0, totalRounds: players.length * 2, last: null, winner: null };
  if (game === 'tug') return { pos: 0, taps: [0, 0], lastTap: [0, 0], startAt: clock() + 3500, winner: null };
  return { round: 0, phase: 'wait', goAt: null, nextAt: null, scores: players.map(() => 0), tapped: {}, early: [], lastWinner: null, lastMs: null, winner: null };
};

export function createGames({ clock = Date.now, random = Math.random, onChange = () => {}, onResult = () => {} } = {}) {
  const rooms = new Map();
  let seq = 0;

  const touch = (room) => { room.updated = clock(); onChange(room); };
  const slot = (room, id) => room.players.findIndex((p) => p.id === id);

  function begin(room) {
    room.status = 'playing';
    room.state = newState(room.game, room.players, { random, clock });
    if (room.game === 'race') nextRound(room);
  }
  function nextRound(room) {
    const s = room.state;
    s.round += 1; s.phase = 'wait'; s.tapped = {}; s.early = []; s.nextAt = null; s.lastWinner = null; s.lastMs = null;
    s.goAt = clock() + 1800 + Math.floor(random() * 3200);
  }
  function finish(room, winner) { const was = room.status; room.status = 'done'; room.state.winner = winner; if (was !== 'done') onResult(room); }

  /** Moves time-based games along (the GO signal, the pause between rounds). Returns true if something changed. */
  function tick(room) {
    if (room.status !== 'playing' || room.game !== 'race') return false;
    const s = room.state; const now = clock();
    if (s.phase === 'wait' && now >= s.goAt) { s.phase = 'go'; return true; }
    if (s.phase === 'go' && now >= s.goAt + 6000) { // nobody reacted
      s.phase = 'result'; s.nextAt = now + 2500; return true;
    }
    if (s.phase === 'result' && now >= s.nextAt) {
      if (s.round >= RACE_ROUNDS) {
        const best = Math.max(...s.scores);
        finish(room, s.scores.indexOf(best) >= 0 && s.scores.filter((x) => x === best).length === 1 ? s.scores.indexOf(best) : -1);
      } else nextRound(room);
      return true;
    }
    return false;
  }
  function sweep() {
    const now = clock(); let n = 0;
    for (const [id, room] of rooms) {
      if (now - room.updated > ROOM_TTL_MS) { rooms.delete(id); n += 1; continue; }
      if (tick(room)) touch(room);
    }
    return n;
  }

  function create(user, game) {
    if (!GAMES[game]) throw Object.assign(new Error('Unknown game'), { status: 400 });
    for (const r of rooms.values()) if (r.status !== 'done' && slot(r, user.id) >= 0) throw Object.assign(new Error('Finish or leave your current game first'), { status: 409 });
    seq += 1;
    const room = { id: `g${seq}-${Math.floor(random() * 1e6).toString(36)}`, game, hostId: user.id, players: [{ id: user.id, name: user.name, buddy: user.buddy }], status: 'lobby', state: null, created: clock(), updated: clock() };
    rooms.set(room.id, room);
    touch(room);
    return room;
  }
  function get(id) {
    const room = rooms.get(id);
    if (!room) throw Object.assign(new Error('That game is gone'), { status: 404 });
    return room;
  }
  function join(user, id) {
    const room = get(id);
    if (slot(room, user.id) >= 0) return room;
    if (room.status !== 'lobby') throw Object.assign(new Error('That game already started'), { status: 409 });
    if (room.players.length >= GAMES[room.game].max) throw Object.assign(new Error('That game is full'), { status: 409 });
    for (const r of rooms.values()) if (r.status !== 'done' && slot(r, user.id) >= 0) throw Object.assign(new Error('Finish or leave your current game first'), { status: 409 });
    room.players.push({ id: user.id, name: user.name, buddy: user.buddy });
    if (room.players.length === GAMES[room.game].max && GAMES[room.game].max === 2) begin(room);
    touch(room);
    return room;
  }
  function leave(user, id) {
    const room = get(id);
    const i = slot(room, user.id);
    if (i < 0) return room;
    if (room.status === 'done') { (room.dismissed ||= new Set()).add(user.id); if (room.players.every((p) => room.dismissed.has(p.id))) { rooms.delete(id); onChange(room); } return room; }
    if (room.status === 'playing' && room.players.length === 2) { room.state.forfeit = user.id; finish(room, 1 - i); }
    else if (room.status === 'playing') {
      room.players.splice(i, 1); room.state.scores?.splice(i, 1);
      if (room.game === 'ludo') { room.state.tokens.splice(i, 1); room.state.offsets.splice(i, 1); }
      if (room.state.turn !== undefined) { if (i < room.state.turn) room.state.turn -= 1; else if (i === room.state.turn) { room.state.turn %= room.players.length; room.state.turnTotal = 0; room.state.up = []; } }
      if (room.game === 'ludo') Object.assign(room.state, { phase: 'roll', dice: null, legal: [] });
      if (room.game === 'spin') Object.assign(room.state, { phase: 'spin', target: null, card: null, totalRounds: Math.max(room.state.rounds + 1, room.players.length * 2) });
      if (room.game === 'mem') room.state.matched = room.state.matched.map((o) => (o === null ? null : o === i ? -1 : o > i ? o - 1 : o));
      if (room.players.length < 2) finish(room, 0);
    }
    else if (room.status === 'lobby') {
      room.players.splice(i, 1);
      if (!room.players.length) { rooms.delete(id); onChange(room); return room; }
      if (room.hostId === user.id) room.hostId = room.players[0].id;
    }
    touch(room);
    return room;
  }
  function start(user, id) {
    const room = get(id);
    if (room.hostId !== user.id) throw Object.assign(new Error('Only the host can start'), { status: 403 });
    if (room.status !== 'lobby') throw Object.assign(new Error('Already started'), { status: 409 });
    if (room.players.length < GAMES[room.game].min) throw Object.assign(new Error('Waiting for more players'), { status: 409 });
    begin(room); touch(room);
    return room;
  }
  function rematch(user, id) {
    const room = get(id);
    if (slot(room, user.id) < 0) throw Object.assign(new Error('You are not in this game'), { status: 403 });
    if (room.status !== 'done') throw Object.assign(new Error('The game is not over yet'), { status: 409 });
    room.dismissed = new Set();
    room.players = room.players.slice();
    room.players.reverse(); // loser/other side opens next time
    begin(room); touch(room);
    return room;
  }

  function move(user, id, m = {}) {
    const room = get(id);
    const me = slot(room, user.id);
    if (me < 0) throw Object.assign(new Error('You are not in this game'), { status: 403 });
    if (room.status !== 'playing') throw Object.assign(new Error('The game is not running'), { status: 409 });
    const s = room.state;
    const bad = (msg) => Object.assign(new Error(msg), { status: 400 });
    if (room.game === 'ttt' || room.game === 'c4') {
      if (s.turn !== me) throw bad('Not your turn');
      if (room.game === 'ttt') {
        if (!Number.isInteger(m.cell) || m.cell < 0 || m.cell > 8 || s.board[m.cell] !== null) throw bad('Pick an empty square');
        s.board[m.cell] = me;
      } else if (c4Drop(s.board, m.col, me) < 0) throw bad('That column is full');
      const w = room.game === 'ttt' ? tttWinner(s.board) : c4Winner(s.board);
      if (w) { s.line = w.line; finish(room, w.who); } else s.turn = 1 - me;
    } else if (room.game === 'rps') {
      if (!BEATS[m.pick]) throw bad('Rock, paper or scissors');
      if (s.picks[me]) throw bad('You already picked');
      s.picks[me] = m.pick;
      if (s.picks[0] && s.picks[1]) {
        const w = rpsRound(s.picks[0], s.picks[1]);
        if (w >= 0) s.score[w] += 1;
        s.last = { picks: s.picks, winner: w };
        s.picks = [null, null]; s.round += 1;
        if (s.score[0] === 2 || s.score[1] === 2) finish(room, s.score[0] === 2 ? 0 : 1);
      }
    } else if (room.game === 'bs') {
      if (s.turn !== me) throw bad('Not your turn');
      if (!Number.isInteger(m.cell) || m.cell < 0 || m.cell >= BS_SIZE * BS_SIZE || s.shots[me][m.cell]) throw bad('Pick a square you have not fired at');
      const foe = 1 - me; const out = bsFire(s.fleets[foe], m.cell);
      s.shots[me][m.cell] = out.result === 'miss' ? 'miss' : 'hit';
      s.seq += 1; s.last = { by: me, cell: m.cell, result: out.result, ship: out.result === 'sunk' ? out.ship.cells : null, seq: s.seq };
      if (bsAllSunk(s.fleets[foe])) finish(room, me); else s.turn = foe;
    } else if (room.game === 'pig') {
      if (s.turn !== me) throw bad('Not your turn');
      if (m.act === 'roll') {
        const d = 1 + Math.floor(random() * 6); s.rollSeq += 1; s.roll = { by: me, d, seq: s.rollSeq, bust: d === 1 };
        if (d === 1) { s.turnTotal = 0; s.turn = (me + 1) % room.players.length; } else s.turnTotal += d;
      } else if (m.act === 'hold') {
        if (s.turnTotal === 0) throw bad('Roll first');
        s.scores[me] += s.turnTotal; s.turnTotal = 0; s.roll = { by: me, d: null, seq: (s.rollSeq += 1), bust: false, held: true };
        if (s.scores[me] >= s.target) finish(room, me); else s.turn = (me + 1) % room.players.length;
      } else throw bad('Roll or hold');
    } else if (room.game === 'mem') {
      if (s.turn !== me) throw bad('Not your turn');
      if (!Number.isInteger(m.cell) || m.cell < 0 || m.cell >= s.deck.length || s.matched[m.cell] !== null || s.up.includes(m.cell)) throw bad('Pick a face-down card');
      if (!s.up.length) { s.reveal = null; s.up = [m.cell]; } else {
        const pair = [s.up[0], m.cell]; s.up = []; s.seq += 1;
        const hit = s.deck[pair[0]] === s.deck[pair[1]];
        s.reveal = { cells: pair, match: hit, by: me, seq: s.seq };
        if (hit) { pair.forEach((c) => { s.matched[c] = me; }); s.scores[me] += 1; } else s.turn = (me + 1) % room.players.length;
        if (s.matched.every((o) => o !== null)) { const best = Math.max(...s.scores); finish(room, s.scores.filter((x) => x === best).length === 1 ? s.scores.indexOf(best) : -1); }
      }
    } else if (room.game === 'ludo') {
      if (s.turn !== me) throw bad('Not your turn');
      if (m.act === 'roll') {
        if (s.phase !== 'roll') throw bad('Move a token first');
        const d = 1 + Math.floor(random() * 6); s.seq += 1; s.legal = ludoMoves(s.tokens[me], d);
        s.dice = { by: me, d, seq: s.seq, stuck: s.legal.length === 0 };
        if (s.legal.length) s.phase = 'move'; else s.turn = (me + 1) % room.players.length;
      } else if (m.act === 'move') {
        if (s.phase !== 'move' || !s.legal.includes(m.token)) throw bad('Pick a token that can move');
        const d = s.dice.d; const out = ludoMove(s, me, m.token, d); s.seq += 1;
        s.last = { by: me, token: m.token, from: out.from, to: out.to, sent: out.sent, seq: s.seq };
        s.phase = 'roll'; s.legal = [];
        if (s.tokens[me].every((p) => p === LUDO_HOME)) finish(room, me);
        else if (d !== 6) s.turn = (me + 1) % room.players.length; // a six earns another roll
      } else throw bad('Roll or move');
    } else if (room.game === 'spin') {
      const n = room.players.length;
      if (m.act === 'spin') {
        if (s.turn !== me || s.phase !== 'spin') throw bad('Not your turn to spin');
        let target = Math.floor(random() * (n - 1)); if (target >= me) target += 1;
        const prev = s.bottle.angle;
        s.bottle = { angle: Math.floor(prev / 360) * 360 + 360 * (3 + Math.floor(random() * 3)) + (target * 360) / n, seq: s.bottle.seq + 1 };
        s.target = target; s.phase = 'choose'; s.card = null;
      } else if (m.act === 'choose') {
        if (s.phase !== 'choose' || s.target !== me) throw bad('Not your pick');
        if (m.kind !== 'truth' && m.kind !== 'dare') throw bad('Truth or dare');
        const deck = m.kind === 'truth' ? SPIN_TRUTHS : SPIN_DARES;
        let pool = deck.map((_, k) => k).filter((k) => !s.used.includes(`${m.kind}${k}`)); if (!pool.length) { s.used = s.used.filter((u) => !u.startsWith(m.kind)); pool = deck.map((_, k) => k); }
        const k = pool[Math.floor(random() * pool.length)]; s.used.push(`${m.kind}${k}`);
        s.card = { kind: m.kind, text: deck[k] }; s.phase = 'task';
      } else if (m.act === 'done' || m.act === 'skip') {
        if (s.phase !== 'task' || s.turn !== me) throw bad('The spinner decides');
        if (m.act === 'done') s.scores[s.target] += 1;
        s.last = { spinner: me, target: s.target, kind: s.card.kind, done: m.act === 'done' }; s.rounds += 1;
        if (s.rounds >= s.totalRounds) { const best = Math.max(...s.scores); finish(room, s.scores.filter((x) => x === best).length === 1 ? s.scores.indexOf(best) : -1); }
        else { s.turn = (me + 1) % n; s.phase = 'spin'; s.target = null; s.card = null; }
      } else throw bad('Spin, choose, done or skip');
    } else if (room.game === 'tug') {
      const now = clock();
      if (now >= s.startAt && now - s.lastTap[me] >= TUG_GAP_MS) {
        s.lastTap[me] = now; s.taps[me] += 1;
        s.pos = s.taps[0] - s.taps[1];
        if (s.pos >= TUG_REACH) finish(room, 0); else if (s.pos <= -TUG_REACH) finish(room, 1);
      }
    } else if (room.game === 'race') {
      tick(room);
      if (s.phase === 'wait') { // too early: out for this round
        if (!s.early.includes(me)) s.early.push(me);
        if (s.early.length === room.players.length) { s.phase = 'result'; s.nextAt = clock() + 2500; }
      } else if (s.phase === 'go' && !s.early.includes(me)) {
        s.scores[me] += 1; s.lastWinner = me; s.lastMs = clock() - s.goAt;
        s.phase = 'result'; s.nextAt = clock() + 2500;
      }
    }
    touch(room);
    return room;
  }

  /** What one person is allowed to see of a room. */
  function view(room, userId) {
    const me = slot(room, userId);
    const s = room.state && JSON.parse(JSON.stringify(room.state));
    if (s && room.game === 'rps') s.picks = s.picks.map((p, i) => (p ? (i === me ? p : true) : null)); // your pick, and only whether they have picked
    if (s && room.game === 'race') { delete s.tapped; if (s.phase === 'wait') s.goAt = null; else s.goAt = undefined; }
    if (s && room.game === 'bs') {
      const mine = me >= 0 ? me : 0;
      s.mine = s.fleets[mine].map((x) => ({ cells: x.cells, hits: x.hits }));
      s.foeSunk = s.fleets[1 - mine].filter((x) => x.hits.length === x.cells.length).map((x) => x.cells);
      s.foeCells = room.status === 'done' ? s.fleets[1 - mine].map((x) => x.cells) : null; // the whole fleet is shown once it is over
      s.mineShots = s.shots[mine]; s.theirShots = s.shots[1 - mine]; // what I fired / what was fired at me
      delete s.fleets; delete s.shots;
    }
    if (s && room.game === 'mem') {
      const faces = {};
      s.matched.forEach((o, c) => { if (o !== null) faces[c] = s.deck[c]; });
      s.up.forEach((c) => { faces[c] = s.deck[c]; });
      s.reveal?.cells.forEach((c) => { faces[c] = s.deck[c]; });
      s.faces = faces; delete s.deck;
    }
    if (s && room.game === 'spin') delete s.used;
    if (s && room.game === 'tug') { s.startIn = Math.max(0, s.startAt - clock()); delete s.lastTap; delete s.startAt; }
    return { id: room.id, game: room.game, title: GAMES[room.game].name, hostId: room.hostId, players: room.players, status: room.status, state: s, you: me, min: GAMES[room.game].min, max: GAMES[room.game].max, now: clock(), rounds: RACE_ROUNDS };
  }
  /** Rooms this person can see: lobbies anyone can join, and the games they are in (a finished one stays for a few minutes). */
  function listFor(userId) {
    const now = clock();
    return [...rooms.values()]
      .filter((r) => slot(r, userId) >= 0 ? (r.status !== 'done' || (now - r.updated < 10 * 60 * 1000 && !r.dismissed?.has(userId))) : r.status === 'lobby')
      .sort((a, b) => b.updated - a.updated)
      .map((r) => view(r, userId));
  }
  return { create, join, leave, start, move, rematch, view, listFor, tick, sweep, rooms };
}

// ---------- leaderboard ----------
/** Adds one finished game to the running totals { players: { id: { name, played, wins, byGame } } }. */
export function applyResult(stats, room) {
  const w = room.state?.winner;
  room.players.forEach((p, i) => {
    const row = (stats.players[p.id] ||= { name: p.name, played: 0, wins: 0, byGame: {} });
    row.name = p.name; row.played += 1;
    const g = (row.byGame[room.game] ||= { played: 0, wins: 0 }); g.played += 1;
    if (w === i) { row.wins += 1; g.wins += 1; }
  });
  return stats;
}
export function rankings(stats, game = null, limit = 20) {
  return Object.entries(stats.players).map(([id, r]) => { const x = game ? r.byGame[game] || { played: 0, wins: 0 } : r; return { id, name: r.name, played: x.played, wins: x.wins }; })
    .filter((r) => r.played > 0).sort((a, b) => b.wins - a.wins || (b.wins / b.played) - (a.wins / a.played) || a.played - b.played || a.name.localeCompare(b.name)).slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// ---------- HTTP ----------
export function registerGames(app, { store, notifier, wrap, clock = Date.now }) {
  const listeners = new Set(); // { res, userId }
  let stats = { players: {} }; let loaded = null;
  const statsDoc = async () => (await store.list('TrackerDoc', { query: { kind: 'config', key: 'gamestats' }, limit: 1 }))[0];
  const load = () => (loaded ||= statsDoc().then((d) => { if (d?.data?.players) stats = { players: d.data.players }; }).catch(() => {}));
  let saving = Promise.resolve();
  const save = () => { saving = saving.then(async () => { const d = await statsDoc(); if (d) await store.update('TrackerDoc', d.id, { data: stats }); else await store.insert('TrackerDoc', { kind: 'config', key: 'gamestats', data: stats, owner_id: 'system', deleted: false, born: clock() }, 'system'); }).catch(() => {}); };
  const games = createGames({ clock, onResult: async (room) => { await load(); applyResult(stats, room); save(); }, onChange: () => listeners.forEach(({ res }) => { try { res.write('data: changed\n\n'); } catch { /* closed */ } }) });
  const timer = setInterval(() => games.sweep(), 150);
  timer.unref?.();
  const who = (req) => ({ id: req.user.id, name: req.user.full_name || req.user.email, buddy: req.user.buddy || null });
  const fail = (res, e) => (e.status ? res.status(e.status).json({ error: e.message }) : (() => { throw e; })());
  const run = (fn) => wrap(async (req, res) => { try { await fn(req, res); } catch (e) { fail(res, e); } });

  app.get('/api/games/stream', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write(': connected\n\n');
    const entry = { res, userId: req.user.id };
    listeners.add(entry);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(heartbeat); listeners.delete(entry); });
  });
  app.get('/api/games/leaderboard', run(async (req, res) => { await load(); const g = GAMES[req.query.game] ? req.query.game : null; res.json({ game: g, rows: rankings(stats, g), you: req.user.id }); }));
  app.get('/api/games', run((req, res) => res.json({ games: GAMES, rooms: games.listFor(req.user.id) })));
  app.post('/api/games', run((req, res) => res.status(201).json(games.view(games.create(who(req), req.body?.game), req.user.id))));
  app.post('/api/games/:id/join', run((req, res) => res.json(games.view(games.join(who(req), req.params.id), req.user.id))));
  app.post('/api/games/:id/leave', run((req, res) => { const r = games.leave(who(req), req.params.id); res.json(games.rooms.has(r.id) ? games.view(r, req.user.id) : { gone: true }); }));
  app.post('/api/games/:id/start', run((req, res) => res.json(games.view(games.start(who(req), req.params.id), req.user.id))));
  app.post('/api/games/:id/rematch', run((req, res) => res.json(games.view(games.rematch(who(req), req.params.id), req.user.id))));
  app.post('/api/games/:id/move', run((req, res) => res.json(games.view(games.move(who(req), req.params.id, req.body || {}), req.user.id))));
  // Ask teammates to join: a notification with a link to the Games tab.
  app.post('/api/games/:id/invite', run(async (req, res) => {
    const room = games.rooms.get(req.params.id);
    if (!room || room.status !== 'lobby' || !room.players.some((p) => p.id === req.user.id)) return res.status(409).json({ error: 'Open a lobby first' });
    const everyone = (await store.list('User', { limit: 1000 })).filter((u) => u.status !== 'Inactive' && u.id !== req.user.id && !room.players.some((p) => p.id === u.id));
    const to = req.body?.to === 'all' ? everyone : everyone.filter((u) => (req.body?.to || []).map(String).includes(u.id));
    const name = req.user.full_name || req.user.email;
    for (const u of to.slice(0, 100)) await notifier.notify(u.id, { type: 'game_invite', title: `${name} wants to play ${GAMES[room.game].name}`, message: 'Open Team hub, Games, and jump in.', link: '/hub', actor_name: name });
    res.json({ invited: to.length });
  }));
  return games;
}
