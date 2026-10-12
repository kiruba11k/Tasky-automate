// Multiplayer games between teammates. Rooms live in memory (they are short-lived: a lobby, a match, a rematch) and the server is
// the referee, so nobody can cheat by editing their browser. Everyone connected to /api/games/stream is told "changed" and re-reads
// their own view of the rooms. Games: tic-tac-toe, connect four, rock-paper-scissors and a reaction race (2-8 players).

export const GAMES = {
  ttt: { name: 'Tic-tac-toe', min: 2, max: 2 },
  c4: { name: 'Connect four', min: 2, max: 2 },
  rps: { name: 'Rock paper scissors', min: 2, max: 2 },
  race: { name: 'Reaction race', min: 2, max: 8 },
};
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

// ---------- room engine ----------
const newState = (game, players) => {
  if (game === 'ttt') return { board: Array(9).fill(null), turn: 0, winner: null, line: [] };
  if (game === 'c4') return { board: Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(null)), turn: 0, winner: null, line: [] };
  if (game === 'rps') return { round: 1, picks: [null, null], last: null, score: [0, 0], winner: null };
  return { round: 0, phase: 'wait', goAt: null, nextAt: null, scores: players.map(() => 0), tapped: {}, early: [], lastWinner: null, lastMs: null, winner: null };
};

export function createGames({ clock = Date.now, random = Math.random, onChange = () => {} } = {}) {
  const rooms = new Map();
  let seq = 0;

  const touch = (room) => { room.updated = clock(); onChange(room); };
  const slot = (room, id) => room.players.findIndex((p) => p.id === id);

  function begin(room) {
    room.status = 'playing';
    room.state = newState(room.game, room.players);
    if (room.game === 'race') nextRound(room);
  }
  function nextRound(room) {
    const s = room.state;
    s.round += 1; s.phase = 'wait'; s.tapped = {}; s.early = []; s.nextAt = null; s.lastWinner = null; s.lastMs = null;
    s.goAt = clock() + 1800 + Math.floor(random() * 3200);
  }
  function finish(room, winner) { room.status = 'done'; room.state.winner = winner; }

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
    else if (room.status === 'playing') { room.players.splice(i, 1); room.state.scores.splice(i, 1); if (room.players.length < 2) finish(room, 0); }
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

// ---------- HTTP ----------
export function registerGames(app, { store, notifier, wrap, clock = Date.now }) {
  const listeners = new Set(); // { res, userId }
  const games = createGames({ clock, onChange: () => listeners.forEach(({ res }) => { try { res.write('data: changed\n\n'); } catch { /* closed */ } }) });
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
