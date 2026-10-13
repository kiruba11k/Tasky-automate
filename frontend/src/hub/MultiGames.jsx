import React, { useEffect, useMemo, useRef, useState } from 'react';

const firstName = (n) => String(n || '…').split(/[ @]/)[0];
const url = (room, p) => `/api/games/${room.id}/${p}`;
export const OWNER = ['#fb7185', '#38bdf8', '#fcd34d', '#34d399'];

// ---------------------------------------------------------------- Shared: confetti and the end-of-game banner
const CONFETTI = ['#fb7185', '#38bdf8', '#fcd34d', '#34d399', '#a78bfa', '#fb923c'];
export function Confetti({ count = 44 }) {
  const bits = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: Math.random() * 100, d: Math.random() * 0.6, t: 1.8 + Math.random() * 1.6, r: Math.random() * 720 - 360, c: CONFETTI[i % CONFETTI.length], w: 6 + Math.random() * 6 })), [count]);
  return <div className="confetti" aria-hidden="true">{bits.map((b, i) => <i key={i} style={{ left: `${b.x}%`, animationDelay: `${b.d}s`, animationDuration: `${b.t}s`, '--r': `${b.r}deg`, background: b.c, width: b.w, height: b.w * 1.6 }} />)}</div>;
}
export function EndBanner({ won, draw, text }) {
  return (
    <div className={`end-banner ${won ? 'end-won' : ''}`} role="status">
      {won && <Confetti />}
      <span className="end-trophy" aria-hidden="true">{won ? '🏆' : draw ? '🤝' : '🎮'}</span>
      <b>{text}</b>
    </div>
  );
}

// ---------------------------------------------------------------- Battleship
const N = 8;
function Water({ shake, onFire, shots, sunkSet, fresh, hulls, hitSet, label, hot }) {
  return (
    <div className={`bs-sea ${hot ? 'bs-sea-hot' : ''} ${shake ? 'bs-sea-shake' : ''}`} role="group" aria-label={label}>
      {Array.from({ length: N * N }, (_, c) => {
        const shot = shots?.[c]; const ship = hulls?.has(c);
        const isFresh = fresh === c;
        return (
          <button key={c} type="button" className={`bs-cell ${ship ? 'bs-ship' : ''} ${sunkSet?.has(c) ? 'bs-sunk' : ''}`} disabled={!onFire || Boolean(shot)} onClick={() => onFire?.(c)} aria-label={`${label} ${String.fromCharCode(65 + Math.floor(c / N))}${(c % N) + 1}${shot ? (shot === 'hit' ? ' hit' : ' miss') : ''}`}>
            {isFresh && <span key={`s${fresh}`} className="bs-shell" />}
            {isFresh && shot === 'hit' && <span key={`k${fresh}`} className="bs-smoke"><i /><i /><i /></span>}
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
          <Water label="Enemy waters" hot={mine} shake={flash?.result === 'sunk'} shots={s.mineShots} onFire={mine ? (c) => act(url(room, 'move'), { cell: c }) : null} sunkSet={sunkFoe} hulls={foeAll} fresh={freshFoe} /></div>
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
export function Die({ value, seq, bust }) {
  const [rx, ry] = FACE_TURN[value] || [-25, 25];
  return (
    <div className="die-stage" aria-label={value ? `Rolled a ${value}` : 'Die'}>
      <div key={seq} className={`die ${seq ? 'die-rolling' : ''} ${bust ? 'die-bust' : ''}`} style={{ '--rx': `${rx}deg`, '--ry': `${ry}deg` }}>
        {[[1, 'f'], [6, 'b'], [2, 'r'], [5, 'l'], [3, 't'], [4, 'u']].map(([n, k]) => (
          <div key={k} className={`die-face die-${k}`}>{PIPS[n].map((p) => <i key={p} style={{ gridArea: `${Math.floor(p / 3) + 1} / ${(p % 3) + 1}` }} />)}</div>
        ))}
      </div>
      <div key={`sh${seq}`} className={`die-shadow ${seq ? "die-shadow-roll" : ""}`} />
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
            <span key={s.scores[i]} className="pig-pop text-2xl font-extrabold mg-w">{s.scores[i]}</span>
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
        <button type="button" disabled={!mine || s.turnTotal === 0} onClick={() => act(url(room, 'move'), { act: 'hold' })} className="rounded-lg border-2 border-slate-900 bg-emerald-400 px-5 py-2 font-extrabold mg-ink enabled:hover:bg-emerald-300 disabled:opacity-50">Hold ({s.turnTotal})</button>
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
              className={`mem-card mem-deal ${up ? 'mem-up' : ''} ${o !== null ? 'mem-won' : ''} ${miss?.has(c) ? 'mem-miss' : ''} ${win?.has(c) ? 'mem-pop' : ''}`} style={{ animationDelay: `${c * 45}ms`, ...(o !== null ? { '--tone': OWNER[o] ?? '#94a3b8' } : null) }}>
              <span className="mem-inner"><span className="mem-back">?</span><span className="mem-front">{face}</span></span>{win?.has(c) && <span key={s.reveal.seq} className="mem-spark" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>}
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
        <div className={`tug-puller tug-left ${s.winner === 1 ? 'tug-lost' : ''} ${s.winner === 0 ? 'tug-won' : ''}`} style={{ left: `${8 + lean0 * 8}%`, transform: `rotate(${-8 - lean0 * 14}deg)` }}><Puller color={OWNER[0]} /><b>{firstName(room.players[0]?.name)}</b></div>
        <div key={`rope${s.taps[0] + s.taps[1]}`} className="tug-rope"><div className="tug-flag" style={{ left: `${pct}%` }}>🚩</div></div>
        <div className={`tug-puller tug-right ${s.winner === 0 ? 'tug-lost' : ''} ${s.winner === 1 ? 'tug-won' : ''}`} style={{ right: `${8 + lean1 * 8}%`, transform: `rotate(${8 + lean1 * 14}deg) scaleX(-1)` }}><Puller color={OWNER[1]} /><b style={{ transform: 'scaleX(-1)' }}>{firstName(room.players[1]?.name)}</b></div>
        {playing && live && <><span key={`d0${s.taps[0]}`} className="tug-dust" style={{ left: `${14 + lean0 * 8}%` }} /><span key={`d1${s.taps[1]}`} className="tug-dust" style={{ right: `${14 + lean1 * 8}%` }} /></>}
        {playing && !live && <div key={count} className="tug-count">{count}</div>}
        {live && s.taps[0] + s.taps[1] === 0 && <div className="tug-count tug-go">GO!</div>}
      </div>
      <button type="button" onPointerDown={tap} disabled={!live} aria-label="Pull" className="tug-btn">{live ? 'PULL! (tap fast or press space)' : playing ? 'Get ready…' : 'Game over'}</button>
      <p className="text-sm text-slate-300">{firstName(room.players[0]?.name)} {s.taps[0]} taps · {s.taps[1]} taps {firstName(room.players[1]?.name)}{me === 0 ? ' · you pull to the left' : me === 1 ? ' · you pull to the right' : ''}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Ludo
const RING = 36;
const rad = (deg) => (deg * Math.PI) / 180;
const polar = (r, deg) => ({ x: 50 + r * Math.cos(rad(deg)), y: 50 + r * Math.sin(rad(deg)) });
const ringAngle = (cell) => (cell / 52) * 360 - 90;
const YARDS = [{ x: 15, y: 15 }, { x: 85, y: 15 }, { x: 85, y: 85 }, { x: 15, y: 85 }];
const slotOf = (offset) => offset / 13; // 0 top-left ... 3 bottom-left
function tokenPos(offset, p, k) {
  if (p === -1) { const y = YARDS[slotOf(offset)]; return { x: y.x + (k % 2 ? 4.5 : -4.5), y: y.y + (k > 1 ? 4.5 : -4.5) }; }
  if (p <= 50) return polar(RING, ringAngle((offset + p) % 52));
  if (p < 56) return polar(RING - (p - 50) * 5.2, ringAngle((offset + 50) % 52));
  return polar(3.5, 45 + k * 90 + slotOf(offset) * 20);
}
export function Ludo({ room, act }) {
  const s = room.state; const me = room.you; const playing = room.status === 'playing'; const mine = playing && s.turn === me;
  const cells = useMemo(() => Array.from({ length: 52 }, (_, c) => ({ c, ...polar(RING, ringAngle(c)) })), []);
  const hit = new Set((s.last?.sent || []).map((x) => `${x.who}-${x.token}`));
  return (
    <div className="space-y-3">
      <div key={s.last?.sent?.length ? `bump${s.last.seq}` : 'calm'} className={`ludo-board ${s.last?.sent?.length ? 'ludo-bump' : ''}`} role="group" aria-label="Ludo board">
        {s.offsets.map((o, w) => <div key={`y${w}`} className="ludo-yard" style={{ left: `${YARDS[slotOf(o)].x}%`, top: `${YARDS[slotOf(o)].y}%`, '--tone': OWNER[w], opacity: s.turn === w && playing ? 1 : .75 }} />)}
        {cells.map(({ c, x, y }) => <i key={c} className={`ludo-cell ${c % 13 === 0 ? 'ludo-start' : c % 13 === 8 ? 'ludo-safe' : ''}`} style={{ left: `${x}%`, top: `${y}%`, ...(c % 13 === 0 ? { '--tone': OWNER[s.offsets.indexOf(c)] || '#94a3b8' } : null) }} />)}
        {s.offsets.map((o, w) => [1, 2, 3, 4, 5].map((q) => { const pt = polar(RING - q * 5.2, ringAngle((o + 50) % 52)); return <i key={`h${w}-${q}`} className="ludo-cell ludo-lane" style={{ left: `${pt.x}%`, top: `${pt.y}%`, '--tone': OWNER[w] }} />; }))}
        {s.last && (() => { const pt = tokenPos(s.offsets[s.last.by], s.last.to, 0); return <span key={`poof${s.last.seq}`} className={`ludo-poof ${s.last.sent.length ? 'ludo-poof-hit' : ''}`} style={{ left: `${pt.x}%`, top: `${pt.y}%`, '--tone': s.last.sent.length ? '#ef4444' : OWNER[s.last.by] }} aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>; })()}
        <div className="ludo-center"><Die value={s.dice && !s.dice.stuck ? s.dice.d : s.dice?.d || null} seq={s.dice?.seq || 0} bust={Boolean(s.dice?.stuck)} /></div>
        {s.tokens.map((ts, w) => ts.map((p, k) => {
          const pt = tokenPos(s.offsets[w], p, k); const can = mine && s.turn === w && s.phase === 'move' && s.legal.includes(k);
          return (
            <button key={`${w}-${k}`} type="button" disabled={!can} onClick={() => act(url(room, 'move'), { act: 'move', token: k })} aria-label={`${firstName(room.players[w]?.name)} token ${k + 1}${can ? ', tap to move' : ''}`}
              className={`ludo-token ${can ? 'ludo-can' : ''} ${p === 56 ? 'ludo-home' : ''} ${hit.has(`${w}-${k}`) ? 'ludo-hit' : ''} ${s.last && s.last.by === w && s.last.token === k ? 'ludo-hop' : ''}`} style={{ left: `${pt.x}%`, top: `${pt.y}%`, '--tone': OWNER[w], zIndex: can ? 5 : 2 }} data-seq={s.last && s.last.by === w && s.last.token === k ? s.last.seq : undefined} />
          );
        }))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!mine || s.phase !== 'roll'} onClick={() => act(url(room, 'move'), { act: 'roll' })} className="rounded-lg border-2 border-slate-900 bg-rose-500 px-5 py-2 font-extrabold mg-w enabled:hover:bg-rose-400 disabled:opacity-50">Roll the die</button>
        <span className="text-sm text-slate-300" aria-live="polite">{!playing ? '' : s.dice?.stuck && s.dice.by === me ? `You rolled ${s.dice.d}. No move, next player.` : mine ? (s.phase === 'move' ? `You rolled ${s.dice.d}. Tap a glowing token.` : 'Your turn. Roll the die.') : `${firstName(room.players[s.turn]?.name)} is playing…`}</span>
      </div>
      <ul className="flex flex-wrap gap-2">{room.players.map((p, i) => <li key={p.id} className="rounded-full border-2 px-3 py-1 text-sm font-bold text-white" style={{ borderColor: OWNER[i] }}>{firstName(p.name)}{i === me ? ' (you)' : ''} · {s.tokens[i].filter((x) => x === 56).length}/4 home</li>)}</ul>
      <p className="text-xs text-slate-400">Roll a 6 to bring a token out. Land on another colour to send it back to its yard (the star and start squares are safe). A 6 gives another roll. Reach the centre with an exact count.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Spin the bottle
export function Spin({ room, act }) {
  const s = room.state; const me = room.you; const playing = room.status === 'playing'; const n = room.players.length;
  const first = useRef(s.bottle.seq); const animated = s.bottle.seq !== first.current;
  const [ready, setReady] = useState(true);
  useEffect(() => {
    if (s.phase !== 'choose' || s.bottle.seq === first.current) { setReady(true); return undefined; }
    setReady(false); const t = setTimeout(() => setReady(true), 3400); return () => clearTimeout(t);
  }, [s.phase, s.bottle.seq]);
  const spinner = room.players[s.turn]; const target = s.target !== null ? room.players[s.target] : null;
  const act2 = (a, extra) => act(url(room, 'move'), { act: a, ...extra });
  return (
    <div className="space-y-3">
      <div className="spin-table">
        {room.players.map((p, i) => { const pt = polar(40, (i * 360) / n - 90); return (
          <div key={p.id} className={`spin-seat ${s.turn === i && playing ? 'spin-seat-on' : ''} ${s.target === i && playing ? 'spin-seat-target' : ''}`} style={{ left: `${pt.x}%`, top: `${pt.y}%`, '--tone': OWNER[i % OWNER.length] }}>
            <span className="spin-face">{firstName(p.name).slice(0, 1).toUpperCase()}</span>
            <b>{firstName(p.name)}{i === me ? ' (you)' : ''}</b><em key={s.scores[i]} className="pig-pop">{s.scores[i]}</em>{s.last?.done && s.last.target === i && s.phase === 'spin' && <span key={`plus${s.rounds}`} className="spin-plus">+1</span>}
          </div>); })}
        <div key={`rp${s.bottle.seq}`} className={`spin-ripple ${animated ? 'spin-ripple-on' : ''}`} aria-hidden="true" />
        <div className="spin-bottle" style={{ transform: `rotate(${s.bottle.angle}deg)`, transition: animated ? 'transform 3.2s cubic-bezier(.12, .7, .08, 1)' : 'none' }} aria-hidden="true">
          <svg viewBox="0 0 30 110" width="36" height="132"><path d="M11 2h8v6l-1 4c5 4 9 9 9 20v68c0 6-4 8-12 8s-12-2-12-8V32c0-11 4-16 9-20l-1-4z" fill="#16a34a" stroke="#0b1220" strokeWidth="2.5" /><rect x="3" y="48" width="24" height="26" fill="#fef9c3" stroke="#0b1220" strokeWidth="2" /><path d="M10 12h10" stroke="#fde047" strokeWidth="3" /><path d="M8 34v60" stroke="rgba(255,255,255,.45)" strokeWidth="3" strokeLinecap="round" /></svg>
        </div>
      </div>
      {playing && (
        <div className="min-h-[7rem] space-y-2 text-center">
          {s.phase === 'spin' && (s.turn === me ? <button type="button" onClick={() => act2('spin')} className="rounded-lg border-2 border-slate-900 bg-emerald-400 px-6 py-2 font-extrabold mg-ink hover:bg-emerald-300">Spin the bottle!</button> : <p className="text-slate-200">{firstName(spinner?.name)} is about to spin…</p>)}
          {s.phase === 'choose' && !ready && <p className="text-slate-200">Spinning…</p>}
          {s.phase === 'choose' && ready && (s.target === me ? (
            <div className="space-y-2"><p className="font-extrabold text-white">It landed on you! Truth or dare?</p><div className="flex justify-center gap-3">
              <button type="button" onClick={() => act2('choose', { kind: 'truth' })} className="rounded-lg border-2 border-slate-900 bg-sky-400 px-5 py-2 font-extrabold mg-ink hover:bg-sky-300">Truth</button>
              <button type="button" onClick={() => act2('choose', { kind: 'dare' })} className="rounded-lg border-2 border-slate-900 bg-rose-500 px-5 py-2 font-extrabold mg-w hover:bg-rose-400">Dare</button></div></div>
          ) : <p className="text-slate-200">It landed on {firstName(target?.name)}. Waiting for their pick…</p>)}
          {s.phase === 'task' && s.card && (
            <div key={s.bottle.seq} className={`spin-card ${s.card.kind === 'dare' ? 'spin-card-dare' : ''}`}><span className="spin-card-kind">{s.card.kind === 'dare' ? 'DARE' : 'TRUTH'} for {s.target === me ? 'you' : firstName(target?.name)}</span><p>{s.card.text}</p></div>
          )}
          {s.phase === 'task' && (s.turn === me ? <div className="flex flex-wrap items-center justify-center gap-2"><span className="text-sm text-slate-200">Did {firstName(target?.name)} do it?</span>
            <button type="button" onClick={() => act2('done')} className="rounded-lg border-2 border-slate-900 bg-emerald-400 px-4 py-1.5 font-extrabold mg-ink hover:bg-emerald-300">Yes, +1</button>
            <button type="button" onClick={() => act2('skip')} className="rounded-lg border-2 border-slate-900 bg-slate-300 px-4 py-1.5 font-extrabold mg-ink hover:bg-slate-200">Skipped</button></div> : <p className="text-sm text-slate-300">{firstName(spinner?.name)} will say when it is done.</p>)}
        </div>
      )}
      <p className="text-center text-xs text-slate-400">Round {Math.min(s.rounds + 1, s.totalRounds)} of {s.totalRounds}. The spinner judges the dare. Everyone keeps it friendly and work-safe; skip anything you would rather not do.{s.last ? ` Last: ${s.last.done ? 'done' : 'skipped'}.` : ''}</p>
    </div>
  );
}
