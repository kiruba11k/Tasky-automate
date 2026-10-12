import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useFun } from '@/fun/FunProvider';
import { hasWebGL } from '@/fun/three/species';
import { request, getToken } from '@/api/client';
import { Panel, Err, primary, subtle } from './ui';

const GameStage = lazy(() => import('@/fun/three/MultiStages'));
const ICON = { ttt: '❌', c4: '🔴', rps: '✊', race: '⚡' };
const BLURB = {
  ttt: 'Three in a row wins. Two players.',
  c4: 'Drop discs, connect four. Two players.',
  rps: 'Best of three. Picks stay secret until both have chosen.',
  race: 'Tap the moment the light turns green. Five rounds, 2 to 8 players. Tap early and you are out of that round.',
};
const MARK = ['✕', '○'];
const DISC = ['bg-rose-500', 'bg-yellow-300'];

/** Rooms and games, kept live: the server pushes "changed" and we re-read our own view. */
function useGames() {
  const [data, setData] = useState({ games: {}, rooms: [] });
  const [error, setError] = useState('');
  const busy = useRef(false); const again = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    try { setData(await request('GET', '/api/games')); setError(''); } catch (e) { setError(e.message); }
    busy.current = false;
    if (again.current) { again.current = false; refresh(); }
  }, []);
  useEffect(() => {
    refresh();
    let stopped = false; const ctl = new AbortController();
    (async () => {
      while (!stopped) {
        try {
          const res = await fetch('/api/games/stream', { headers: { authorization: `Bearer ${getToken()}` }, signal: ctl.signal });
          if (!res.ok || !res.body) throw new Error('stream unavailable');
          const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const parts = buf.split('\n\n'); buf = parts.pop();
            if (parts.some((p) => p.includes('data: changed'))) refresh();
          }
        } catch { /* reconnect below */ }
        if (!stopped) await new Promise((r) => setTimeout(r, 2500));
      }
    })();
    const poll = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    return () => { stopped = true; ctl.abort(); clearInterval(poll); };
  }, [refresh]);
  const act = useCallback(async (path, body) => {
    try { const r = await request('POST', path, body || {}); setError(''); await refresh(); return r; } catch (e) { setError(e.message); await refresh(); return null; }
  }, [refresh]);
  return { ...data, error, act };
}

const nameOf = (room, i) => room.players[i]?.name || '…';
const firstName = (n) => String(n).split(/[ @]/)[0];

function Status({ room }) {
  const s = room.state; const me = room.you;
  if (room.status === 'lobby') return <p className="text-slate-300">Waiting for players ({room.players.length}/{room.max})…</p>;
  if (room.status === 'done') {
    const w = s.winner;
    if (s.forfeit) return <p className="text-lg font-extrabold text-white">{w === me ? 'They left. You win! 🏆' : 'You left the game.'}</p>;
    return <p className="text-lg font-extrabold text-white">{w === -1 ? "It's a draw 🤝" : w === me ? 'You win! 🏆' : `${firstName(nameOf(room, w))} wins`}</p>;
  }
  if (room.game === 'ttt' || room.game === 'c4') return <p className="text-lg font-extrabold text-white">{s.turn === me ? 'Your turn' : `${firstName(nameOf(room, s.turn))} is thinking…`}</p>;
  if (room.game === 'rps') return <p className="text-lg font-extrabold text-white">Round {s.round} · {firstName(nameOf(room, 0))} {s.score[0]} – {s.score[1]} {firstName(nameOf(room, 1))}</p>;
  return <p className="text-lg font-extrabold text-white">Round {Math.min(s.round, room.rounds)} of {room.rounds}</p>;
}

function Ttt({ room, act }) {
  const s = room.state; const mine = room.status === 'playing' && s.turn === room.you;
  return (
    <div className="mx-auto grid w-64 grid-cols-3 gap-2">
      {s.board.map((c, i) => (
        <button key={i} type="button" disabled={!mine || c !== null} onClick={() => act(`/api/games/${room.id}/move`, { cell: i })} aria-label={`Square ${i + 1}${c === null ? '' : c === 0 ? ' cross' : ' circle'}`}
          className={`aspect-square rounded-xl border-2 border-slate-900 text-4xl font-extrabold ${s.line.includes(i) ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-white'} ${mine && c === null ? 'hover:bg-slate-700' : ''}`}>{c === null ? '' : MARK[c]}</button>
      ))}
    </div>
  );
}

function C4({ room, act }) {
  const s = room.state; const mine = room.status === 'playing' && s.turn === room.you;
  const hot = new Set(s.line.map(([r, c]) => `${r}-${c}`));
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border-2 border-slate-900 bg-blue-700 p-2">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, c) => (
          <button key={c} type="button" disabled={!mine || s.board[0][c] !== null} onClick={() => act(`/api/games/${room.id}/move`, { col: c })} aria-label={`Drop in column ${c + 1}`}
            className="flex flex-col gap-1 rounded-lg p-0.5 enabled:hover:bg-blue-500/60 disabled:cursor-default">
            {s.board.map((row, r) => (
              <span key={r} className={`block aspect-square rounded-full border-2 ${hot.has(`${r}-${c}`) ? 'border-white' : 'border-blue-900'} ${row[c] === null ? 'bg-slate-900' : DISC[row[c]]}`} />
            ))}
          </button>
        ))}
      </div>
      <p className="mt-1 text-center text-xs text-blue-100">{nameOf(room, 0)} <span className="text-rose-300">●</span> vs <span className="text-yellow-300">●</span> {nameOf(room, 1)}</p>
    </div>
  );
}

const RPS = { rock: '✊', paper: '✋', scissors: '✌️' };
function Rps({ room, act }) {
  const s = room.state; const mine = s.picks[room.you];
  return (
    <div className="text-center space-y-3">
      {s.last && <p className="text-slate-200">Last round: {firstName(nameOf(room, 0))} {RPS[s.last.picks[0]]} vs {RPS[s.last.picks[1]]} {firstName(nameOf(room, 1))} · {s.last.winner === -1 ? 'draw' : `${firstName(nameOf(room, s.last.winner))} scored`}</p>}
      <div className="flex justify-center gap-3">
        {Object.entries(RPS).map(([k, e]) => (
          <button key={k} type="button" disabled={room.status !== 'playing' || Boolean(mine)} onClick={() => act(`/api/games/${room.id}/move`, { pick: k })} aria-label={k}
            className={`h-20 w-20 rounded-2xl border-2 border-slate-900 text-4xl ${mine === k ? 'bg-emerald-400' : 'bg-slate-800 enabled:hover:bg-slate-700'} disabled:opacity-60`}>{e}</button>
        ))}
      </div>
      <p className="text-sm text-slate-300">{room.status !== 'playing' ? '' : mine ? 'Locked in. Waiting for them…' : 'Pick one'}</p>
    </div>
  );
}

function Race({ room, act }) {
  const s = room.state; const me = room.you; const out = s.early.includes(me);
  const tone = room.status !== 'playing' ? 'bg-slate-700' : s.phase === 'go' ? 'bg-emerald-400 text-ink' : s.phase === 'result' ? 'bg-sky-500 text-white' : out ? 'bg-slate-600' : 'bg-rose-500 text-white';
  const label = room.status !== 'playing' ? 'Game over' : s.phase === 'go' ? 'TAP NOW!' : s.phase === 'result' ? (s.lastWinner === null ? 'Nobody tapped' : `${s.lastWinner === me ? 'You were' : `${firstName(nameOf(room, s.lastWinner))} was`} first (${s.lastMs} ms)`) : out ? 'Too early. Sit this one out' : 'Wait for green…';
  return (
    <div className="space-y-3">
      <button type="button" onPointerDown={() => room.status === 'playing' && act(`/api/games/${room.id}/move`, { tap: 1 })} disabled={room.status !== 'playing'} aria-label="Reaction button"
        className={`block h-40 w-full rounded-2xl border-2 border-slate-900 text-2xl font-extrabold transition-colors ${tone}`}>{label}</button>
      <ul className="flex flex-wrap gap-2">
        {room.players.map((p, i) => <li key={p.id} className={`rounded-full border px-3 py-1 text-sm font-bold ${i === me ? 'border-emerald-400 text-emerald-300' : 'border-slate-600 text-slate-200'}`}>{firstName(p.name)}{i === me ? ' (you)' : ''} · {s.scores[i]}{s.early.includes(i) ? ' · early' : ''}</li>)}
      </ul>
    </div>
  );
}

function Invite({ room, act }) {
  const [msg, setMsg] = useState('');
  const [people, setPeople] = useState(null);
  const [picked, setPicked] = useState([]);
  const [q, setQ] = useState('');
  useEffect(() => { request('GET', '/api/birds/recipients').then(setPeople).catch(() => setPeople([])); }, []);
  const here = new Set(room.players.map((p) => p.id));
  const list = (people || []).filter((p) => !here.has(p.id) && p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const send = async (to) => { const r = await act(`/api/games/${room.id}/invite`, { to }); if (r) { setMsg(`Invited ${r.invited} teammate${r.invited === 1 ? '' : 's'}`); setPicked([]); } };
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-slate-200">Invite teammates</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teammates…" aria-label="Search teammates to invite" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder:text-slate-500" />
      <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-700">
        {list.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-white hover:bg-slate-800">
              <input type="checkbox" checked={picked.includes(p.id)} onChange={() => setPicked((x) => (x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id]))} /> {p.name}
            </label>
          </li>
        ))}
        {people && list.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Nobody to invite{q ? ' with that name' : ''}</li>}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={primary} disabled={!picked.length} onClick={() => send(picked)}>Invite {picked.length || ''} selected</button>
        <button type="button" className={subtle} onClick={() => send('all')}>📣 Invite everyone</button>
        {msg && <span className="text-sm text-slate-300">{msg}</span>}
      </div>
    </div>
  );
}

function Room({ room, act }) {
  const { settings, celebrate } = useFun();
  const three = settings.view3d && hasWebGL();
  const Board = { ttt: Ttt, c4: C4, rps: Rps, race: Race }[room.game];
  const move = (m) => act(`/api/games/${room.id}/move`, m);
  const won = room.status === 'done' && room.state?.winner === room.you && !room.state?.forfeit;
  useEffect(() => { if (won) celebrate('party'); }, [won]); // eslint-disable-line react-hooks/exhaustive-deps
  const host = room.players[0] && room.hostId === room.players[room.you]?.id;
  return (
    <Panel title={`${ICON[room.game]} ${room.title}`} hint={room.players.map((p) => firstName(p.name)).join(' vs ')}
      right={<button type="button" className={subtle} onClick={() => act(`/api/games/${room.id}/leave`)}>{room.status === 'done' ? 'Close' : 'Leave'}</button>}>
      <div className="space-y-4">
        <Status room={room} />
        {room.status === 'lobby' && (
          <div className="space-y-3">
            <ul className="flex flex-wrap gap-2">{room.players.map((p) => <li key={p.id} className="rounded-full border border-slate-600 px-3 py-1 text-sm font-bold text-slate-100">{firstName(p.name)}</li>)}</ul>
            <Invite room={room} act={act} />
            {host && room.max > 2 && <button type="button" className={primary} disabled={room.players.length < room.min} onClick={() => act(`/api/games/${room.id}/start`)}>Start the race ({room.players.length} in)</button>}
          </div>
        )}
        {room.status !== 'lobby' && three && (
          <Suspense fallback={<div className="h-64 rounded-2xl bg-slate-800/60" />}>
            <GameStage room={room} onMove={move} calm={settings.anim === 'calm'} />
          </Suspense>
        )}
        {room.status !== 'lobby' && Board && !(three && (room.game === 'ttt' || room.game === 'c4')) && <Board room={room} act={act} />}
        {room.status === 'done' && <button type="button" className={primary} onClick={() => act(`/api/games/${room.id}/rematch`)}>Play again</button>}
      </div>
    </Panel>
  );
}

/** Play against teammates in real time: pick a game, invite people or join an open lobby. */
export default function Multiplayer() {
  const { games, rooms, error, act } = useGames();
  const mine = rooms.find((r) => r.you >= 0);
  const open = rooms.filter((r) => r.you < 0 && r.status === 'lobby');
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        {mine ? <Room room={mine} act={act} /> : (
          <Panel title="Host a game" hint="Pick one, then invite teammates or wait for someone to join.">
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(games).map(([id, g]) => (
                <button key={id} type="button" onClick={() => act('/api/games', { game: id })} className="rounded-xl border-2 border-slate-900 bg-slate-800 p-3 text-left hover:bg-slate-700">
                  <span className="text-2xl">{ICON[id]}</span> <b className="text-white">{g.name}</b>
                  <span className="mt-1 block text-xs text-slate-300">{BLURB[id]}</span>
                </button>
              ))}
            </div>
          </Panel>
        )}
        <Err text={error} />
      </div>
      <Panel title="Open games" hint="Lobbies your teammates are waiting in.">
        {open.length === 0 && <p className="text-sm text-slate-300">Nobody is waiting right now. Host one and invite the team 🎮</p>}
        <ul className="space-y-2">
          {open.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 p-3">
              <span className="text-white"><b>{ICON[r.game]} {r.title}</b><span className="block text-xs text-slate-300">{r.players.map((p) => firstName(p.name)).join(', ')} · {r.players.length}/{r.max}</span></span>
              <button type="button" className={primary} disabled={Boolean(mine)} onClick={() => act(`/api/games/${r.id}/join`)}>Join</button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
