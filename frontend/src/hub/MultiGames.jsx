import React, { useEffect, useMemo, useState } from 'react';

const firstName = (n) => String(n || '…').split(/[ @]/)[0];
const url = (room, p) => `/api/games/${room.id}/${p}`;
export const OWNER = ['#fb7185', '#38bdf8', '#fcd34d', '#34d399'];

// ---------------------------------------------------------------- Battleship
const N = 8;
function Water({ onFire, shots, sunkSet, fresh, hulls, hitSet, label, hot }) {
  return (
    <div className={`bs-sea ${hot ? 'bs-sea-hot' : ''}`} role="group" aria-label={label}>
      {Array.from({ length: N * N }, (_, c) => {
        const shot = shots?.[c]; const ship = hulls?.has(c);
        const isFresh = fresh === c;
        return (
          <button key={c} type="button" className={`bs-cell ${ship ? 'bs-ship' : ''} ${sunkSet?.has(c) ? 'bs-sunk' : ''}`} disabled={!onFire || Boolean(shot)} onClick={() => onFire?.(c)} aria-label={`${label} ${String.fromCharCode(65 + Math.floor(c / N))}${(c % N) + 1}${shot ? (shot === 'hit' ? ' hit' : ' miss') : ''}`}>
            {(hitSet?.has(c) || shot === 'hit') && <span key={isFresh ? `f${fresh}` : 'h'} className={`bs-fire ${isFresh ? 'bs-fresh' : ''}`}>{sunkSet?.has(c) ? '💀' : '🔥'}</span>}
            {shot === 'miss' && <span key={isFresh ? `f${fresh}` : 'm'} className={`bs-ripple ${isFresh ? 'bs-fresh' : ''}`}><i /><i /><i /></span>}
          </button>
        );
      })}
    </div>
  );
}
export function Battleship({ room, act }) {
  const s = room.state; const me = room.you; const playing = room.status === 'playing';
  const mine = playing && s.turn === me;
  const mineSet = useMemo(() => new Set(s.mine.flatMap((x) => x.cells)), [s.mine]);
  const myHits = useMemo(() => new Set(s.mine.flatMap((x) => x.hits)), [s.mine]);
  const sunkMine = useMemo(() => new Set(s.mine.filter((x) => x.hits.length === x.cells.length).flatMap((x) => x.cells)), [s.mine]);
  const sunkFoe = useMemo(() => new Set((s.foeSunk || []).flat()), [s.foeSunk]);
  const foeAll = useMemo(() => new Set((s.foeCells || []).flat()), [s.foeCells]);
  const last = s.last;
  const freshMine = last && last.by !== me ? last.cell : -1; // the shot I just took
  const freshFoe = last && last.by === me ? last.cell : -1;
  const [flash, setFlash] = useState(null);
  useEffect(() => { if (!last) return undefined; setFlash(last); const t = setTimeout(() => setFlash(null), 1600); return () => clearTimeout(t); }, [last?.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const msg = flash ? `${flash.by === me ? 'You' : firstName(room.players[flash.by]?.name)} ${flash.result === 'sunk' ? 'sank a ship!' : flash.result === 'hit' ? 'scored a hit!' : 'missed.'}` : '';
  return (
    <div className="space-y-3">
      <div className={`bs-banner ${flash?.result === 'sunk' ? 'bs-banner-sunk' : flash?.result === 'hit' ? 'bs-banner-hit' : ''}`} key={flash?.seq || 'idle'} aria-live="polite">{msg || (mine ? 'Your turn. Fire at the enemy waters.' : playing ? `${firstName(room.players[s.turn]?.name)} is aiming…` : '')}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-300">Enemy waters</p>
          <Water label="Enemy waters" hot={mine} shots={s.mineShots} onFire={mine ? (c) => act(url(room, 'move'), { cell: c }) : null} sunkSet={sunkFoe} hulls={foeAll} fresh={freshFoe} /></div>
        <div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-300">Your fleet</p>
          <Water label="Your fleet" shots={s.theirShots} hulls={mineSet} hitSet={myHits} sunkSet={sunkMine} fresh={freshMine} /></div>
      </div>
      <p className="text-xs text-slate-400">Ships are placed for you at random. Sink all four of theirs before they sink yours.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Pig dice
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const FACE_TURN = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
function Die({ value, seq, bust }) {
  const [rx, ry] = FACE_TURN[value] || [-25, 25];
  return (
    <div className="die-stage" aria-label={value ? `Rolled a ${value}` : 'Die'}>
      <div key={seq} className={`die ${seq ? 'die-rolling' : ''} ${bust ? 'die-bust' : ''}`} style={{ '--rx': `${rx}deg`, '--ry': `${ry}deg` }}>
        {[[1, 'f'], [6, 'b'], [2, 'r'], [5, 'l'], [3, 't'], [4, 'u']].map(([n, k]) => (
          <div key={k} className={`die-face die-${k}`}>{PIPS[n].map((p) => <i key={p} style={{ gridArea: `${Math.floor(p / 3) + 1} / ${(p % 3) + 1}` }} />)}</div>
        ))}
      </div>
      <div className="die-shadow" />
    </div>
  );
}
export function Pig({ room, act }) {
  const s = room.state; const me = room.you; const playing = room.status === 'playing'; const mine = playing && s.turn === me;
  const r = s.roll;
  const [coin, setCoin] = useState(0);
  useEffect(() => { if (r?.held) setCoin((c) => c + 1); }, [r?.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${room.players.length}, minmax(0, 1fr))` }}>
        {room.players.map((p, i) => (
          <div key={p.id} className={`pig-score ${s.turn === i && playing ? 'pig-score-on' : ''}`} style={{ '--tone': OWNER[i] }}>
            <b className="block truncate text-sm mg-w">{firstName(p.name)}{i === me ? ' (you)' : ''}</b>
            <span className="text-2xl font-extrabold mg-w">{s.scores[i]}</span>
            <div className="pig-bar"><div style={{ width: `${Math.min(100, (s.scores[i] / s.target) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="pig-table">
        <Die value={r && !r.held ? r.d : null} seq={r && !r.held ? r.seq : 0} bust={r?.bust} />
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide mg-w">This turn</p>
          <p key={s.turnTotal} className="pig-total">{s.turnTotal}</p>
          {r?.bust && <p key={`b${r.seq}`} className="pig-oops">Oink! A 1. {r.by === me ? 'You lose' : `${firstName(room.players[r.by]?.name)} loses`} the turn total.</p>}
          {r?.held && <p key={`h${r.seq}`} className="pig-banked">🪙 {r.by === me ? 'You' : firstName(room.players[r.by]?.name)} banked it!<span key={coin} className="pig-coin" /></p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!mine} onClick={() => act(url(room, 'move'), { act: 'roll' })} className="rounded-lg border-2 border-slate-900 bg-rose-500 px-5 py-2 font-extrabold mg-w enabled:hover:bg-rose-400 disabled:opacity-50">Roll</button>
        <button type="button" disabled={!mine || s.turnTotal === 0} onClick={() => act(url(room, 'move'), { act: 'hold' })} className="rounded-lg border-2 border-slate-900 bg-emerald-400 px-5 py-2 font-extrabold text-ink enabled:hover:bg-emerald-300 disabled:opacity-50">Hold ({s.turnTotal})</button>
        <span className="text-sm text-slate-300">{playing ? (mine ? 'Your turn. Push your luck or bank it.' : `${firstName(room.players[s.turn]?.name)} is rolling…`) : ''}</span>
      </div>
      <p className="text-xs text-slate-400">First to {s.target} wins. Keep rolling to add up points, but a 1 wipes out everything you rolled this turn.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Memory duel
export function Memory({ room, act }) {
  const s = room.state; const me = room.you; const playing = room.status === 'playing'; const mine = playing && s.turn === me;
  const miss = s.reveal && !s.reveal.match ? new Set(s.reveal.cells) : null;
  const win = s.reveal?.match ? new Set(s.reveal.cells) : null;
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2">
        {room.players.map((p, i) => <li key={p.id} className={`rounded-full border-2 px-3 py-1 text-sm font-bold text-white ${s.turn === i && playing ? 'mem-turn' : ''}`} style={{ borderColor: OWNER[i] }}>{firstName(p.name)}{i === me ? ' (you)' : ''} · {s.scores[i]}</li>)}
      </ul>
      <div className="mem-grid">
        {s.matched.map((o, c) => {
          const face = s.faces[c]; const up = face !== undefined;
          return (
            <button key={c} type="button" disabled={!mine || up} onClick={() => act(url(room, 'move'), { cell: c })} aria-label={up ? `Card ${c + 1} ${face}` : `Card ${c + 1} face down`}
              className={`mem-card ${up ? 'mem-up' : ''} ${o !== null ? 'mem-won' : ''} ${miss?.has(c) ? 'mem-miss' : ''} ${win?.has(c) ? 'mem-pop' : ''}`} style={o !== null ? { '--tone': OWNER[o] ?? '#94a3b8' } : undefined}>
              <span className="mem-inner"><span className="mem-back">?</span><span className="mem-front">{face}</span></span>
            </button>
          );
        })}
      </div>
      <p className="text-sm text-slate-300">{playing ? (mine ? 'Your turn. Flip two cards. A match lets you go again.' : `${firstName(room.players[s.turn]?.name)} is flipping…`) : ''}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Tug of war
function Puller({ color }) {
  return (
    <svg viewBox="0 0 60 70" width="64" height="74" aria-hidden="true" className="tug-bob">
      <circle cx="30" cy="12" r="9" fill="#fcd9b0" stroke="#0b1220" strokeWidth="2.5" />
      <path d="M21 10 Q30 0 39 10" fill={color} stroke="#0b1220" strokeWidth="2" />
      <path d="M30 21 L30 46" stroke="#0b1220" strokeWidth="9" strokeLinecap="round" /><path d="M30 21 L30 46" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M30 27 L52 31" stroke="#0b1220" strokeWidth="7" strokeLinecap="round" /><path d="M30 27 L52 31" stroke="#fcd9b0" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M30 46 L16 64 M30 46 L40 66" stroke="#0b1220" strokeWidth="7" strokeLinecap="round" /><path d="M30 46 L16 64 M30 46 L40 66" stroke="#1e3a8a" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
export function Tug({ room, act }) {
  const s = room.state; const me = room.you; const playing = room.status === 'playing';
  const startAt = useMemo(() => Date.now() + s.startIn, [room.now]); // eslint-disable-line react-hooks/exhaustive-deps
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(t); }, []);
  const left = startAt - now; const live = playing && left <= 0;
  const tap = () => { if (live) act(url(room, 'move'), { tap: 1 }); };
  useEffect(() => {
    const key = (e) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); tap(); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const reach = 24; const pct = 50 + (Math.max(-reach, Math.min(reach, s.pos)) / reach) * 38; // marker position in the track
  const lean0 = Math.max(0, s.pos) / reach; const lean1 = Math.max(0, -s.pos) / reach;
  const count = left > 2000 ? 3 : left > 1000 ? 2 : left > 0 ? 1 : 0;
  return (
    <div className="space-y-3">
      <div className="tug-scene">
        <div className="tug-mud" style={{ left: '12%' }} /><div className="tug-mud" style={{ right: '12%' }} />
        <div className="tug-puller tug-left" style={{ left: `${8 + lean0 * 8}%`, transform: `rotate(${-8 - lean0 * 14}deg)` }}><Puller color={OWNER[0]} /><b>{firstName(room.players[0]?.name)}</b></div>
        <div className="tug-rope"><div className="tug-flag" style={{ left: `${pct}%` }}>🚩</div></div>
        <div className="tug-puller tug-right" style={{ right: `${8 + lean1 * 8}%`, transform: `rotate(${8 + lean1 * 14}deg) scaleX(-1)` }}><Puller color={OWNER[1]} /><b style={{ transform: 'scaleX(-1)' }}>{firstName(room.players[1]?.name)}</b></div>
        {playing && !live && <div key={count} className="tug-count">{count}</div>}
        {live && s.taps[0] + s.taps[1] === 0 && <div className="tug-count tug-go">GO!</div>}
      </div>
      <button type="button" onPointerDown={tap} disabled={!live} aria-label="Pull" className="tug-btn">{live ? 'PULL! (tap fast or press space)' : playing ? 'Get ready…' : 'Game over'}</button>
      <p className="text-sm text-slate-300">{firstName(room.players[0]?.name)} {s.taps[0]} taps · {s.taps[1]} taps {firstName(room.players[1]?.name)}{me === 0 ? ' · you pull to the left' : me === 1 ? ' · you pull to the right' : ''}</p>
    </div>
  );
}
