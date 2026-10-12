import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D from './Critter3D';
import { toon, inkMat } from './toon';
import { SPECIES, SPECIES_IDS } from './species';

// 3D boards for the multiplayer games. Everything is primitives with the same cartoon shading as the characters; the 2D boards in
// hub/Multiplayer.jsx stay as the fallback when WebGL or "3D view" is off.

const SIDE = ['#f43f5e', '#38bdf8']; // player 0 / player 1
const ease = (k) => 1 - (1 - k) ** 3;

/** A group that grows into place (with a little overshoot) the moment it first appears. */
function Pop({ children, position = [0, 0, 0], delay = 0, instant = false }) {
  const g = useRef(); const t0 = useRef(null);
  useFrame((s) => {
    if (!g.current) return;
    if (t0.current === null) t0.current = s.clock.elapsedTime + delay;
    const k = instant ? 1 : Math.max(0, Math.min(1, (s.clock.elapsedTime - t0.current) / 0.45));
    g.current.scale.setScalar(Math.max(0.001, k >= 1 ? 1 : (1 - (1 - k) ** 3) * (1 + Math.sin(k * Math.PI) * 0.3)));
  });
  return <group ref={g} position={position}>{children}</group>;
}

// ---------------------------------------------------------------- tic-tac-toe
function Mark({ who, ghost = false, hot = false }) {
  const g = useRef(); const color = SIDE[who];
  useFrame((s) => { if (g.current && hot) g.current.position.y = 0.25 + Math.abs(Math.sin(s.clock.elapsedTime * 5)) * 0.35; });
  const mat = ghost ? <meshToonMaterial color={color} transparent opacity={0.35} /> : null;
  if (who === 0) {
    return (
      <group ref={g} position={[0, 0.25, 0]}>
        {[Math.PI / 4, -Math.PI / 4].map((r) => (
          <mesh key={r} rotation={[0, r, 0]} material={ghost ? undefined : toon(color)}>
            <boxGeometry args={[0.95, 0.3, 0.2]} />
            {mat}
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group ref={g} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={ghost ? undefined : toon(color)}><torusGeometry args={[0.36, 0.14, 12, 28]} />{mat}</mesh>
    </group>
  );
}

function TttScene({ room, onMove }) {
  const s = room.state; const mine = room.status === 'playing' && s.turn === room.you;
  const [hover, setHover] = useState(-1);
  const seen = useRef(null);
  if (seen.current === null) seen.current = new Set(s.board.map((c, i) => (c === null ? null : i)).filter((x) => x !== null));
  const cells = useMemo(() => Array.from({ length: 9 }, (_, i) => [((i % 3) - 1) * 1.1, 0, (Math.floor(i / 3) - 1) * 1.1]), []);
  return (
    <group rotation={[0, 0.0, 0]}>
      <mesh position={[0, -0.15, 0]} material={toon('#7c5cff')}><boxGeometry args={[3.7, 0.3, 3.7]} /></mesh>
      <mesh position={[0, -0.15, 0]} material={inkMat} scale={1.03}><boxGeometry args={[3.7, 0.3, 3.7]} /></mesh>
      {cells.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 0.0, 0]} material={toon(s.line.includes(i) ? '#facc15' : '#c4b5fd')}
            onPointerDown={() => mine && s.board[i] === null && onMove({ cell: i })}
            onPointerOver={() => setHover(i)} onPointerOut={() => setHover((h) => (h === i ? -1 : h))}>
            <boxGeometry args={[1.0, 0.12, 1.0]} />
          </mesh>
          {s.board[i] !== null && <Pop instant={seen.current.has(i)}><Mark who={s.board[i]} hot={s.line.includes(i)} /></Pop>}
          {mine && hover === i && s.board[i] === null && <Mark who={room.you} ghost />}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- connect four
const COL = (c) => c - 3; const ROW = (r) => 2.5 - r;
function Disc({ who, r, c, hot, instant }) {
  const g = useRef(); const t0 = useRef(null); const drop = 7 - ROW(r);
  useFrame((st) => {
    if (!g.current) return;
    const now = st.clock.elapsedTime; if (t0.current === null) t0.current = now;
    const t = instant ? 9 : now - t0.current;
    // fall with gravity, then two small bounces
    const fall = Math.sqrt((2 * drop) / 38);
    let y = ROW(r);
    if (t < fall) y = ROW(r) + drop - 0.5 * 38 * t * t;
    else { const u = t - fall; y = ROW(r) + Math.max(0, Math.abs(Math.sin(u * 9)) * 0.35 * Math.exp(-u * 4.5)); }
    g.current.position.y = y;
    if (hot) g.current.position.z = 0.1 + Math.abs(Math.sin(now * 6)) * 0.25;
  });
  return (
    <group ref={g} position={[COL(c), 7, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={toon(who === 0 ? '#f43f5e' : '#facc15')}><cylinderGeometry args={[0.4, 0.4, 0.3, 24]} /></mesh>
      <mesh material={toon(who === 0 ? '#be123c' : '#ca8a04')} position={[0, 0.16, 0]}><cylinderGeometry args={[0.26, 0.26, 0.04, 20]} /></mesh>
    </group>
  );
}
function C4Scene({ room, onMove }) {
  const s = room.state; const mine = room.status === 'playing' && s.turn === room.you;
  const [hover, setHover] = useState(-1);
  const seen = useRef(null);
  if (seen.current === null) { seen.current = new Set(); s.board.forEach((row, r) => row.forEach((v, c) => { if (v !== null) seen.current.add(`${r}-${c}`); })); }
  const hot = new Set(s.line.map(([r, c]) => `${r}-${c}`));
  const rings = useMemo(() => { const a = []; for (let r = 0; r < 6; r += 1) for (let c = 0; c < 7; c += 1) a.push([c, r]); return a; }, []);
  return (
    <group rotation={[-0.05, 0, 0]}>
      <mesh position={[0, 0, -0.25]} material={toon('#1d4ed8')}><boxGeometry args={[7.5, 6.5, 0.2]} /></mesh>
      <mesh position={[0, 0, -0.25]} material={inkMat} scale={1.02}><boxGeometry args={[7.5, 6.5, 0.2]} /></mesh>
      {s.board.map((row, r) => row.map((v, c) => v !== null && <Disc key={`${r}-${c}`} who={v} r={r} c={c} hot={hot.has(`${r}-${c}`)} instant={seen.current.has(`${r}-${c}`)} />))}
      {rings.map(([c, r]) => (
        <mesh key={`${r}-${c}`} position={[COL(c), ROW(r), 0.32]} material={toon('#2563eb')}><torusGeometry args={[0.47, 0.1, 8, 24]} /></mesh>
      ))}
      <mesh position={[0, -3.45, 0.1]} material={toon('#1e3a8a')}><boxGeometry args={[7.9, 0.5, 0.9]} /></mesh>
      {Array.from({ length: 7 }, (_, c) => (
        <mesh key={c} position={[COL(c), 0, 0.5]} onPointerDown={() => mine && s.board[0][c] === null && onMove({ col: c })}
          onPointerOver={() => setHover(c)} onPointerOut={() => setHover((h) => (h === c ? -1 : h))}>
          <boxGeometry args={[0.98, 6.6, 0.1]} /><meshBasicMaterial transparent opacity={mine && hover === c ? 0.16 : 0} color="#ffffff" depthWrite={false} />
        </mesh>
      ))}
      {mine && hover >= 0 && s.board[0][hover] === null && (
        <mesh position={[COL(hover), 3.9, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.4, 0.4, 0.3, 24]} /><meshToonMaterial color={room.you === 0 ? '#f43f5e' : '#facc15'} transparent opacity={0.55} /></mesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------- rock paper scissors
function Hand({ kind, x, flip, shake, color }) {
  const g = useRef(); const t0 = useRef(null);
  useFrame((st) => {
    if (!g.current) return;
    const t = st.clock.elapsedTime; if (t0.current === null) t0.current = t;
    g.current.position.y = shake ? Math.abs(Math.sin(t * 7)) * 0.6 : Math.min(0.5, (t - t0.current) * 3) * 0.6;
    g.current.rotation.z = (shake ? Math.sin(t * 7) * 0.15 : 0) * (flip ? -1 : 1);
    const k = shake ? 1 : Math.min(1, (t - t0.current) / 0.4);
    g.current.scale.setScalar(shake ? 1 : Math.max(0.01, ease(k) * (1 + Math.sin(k * Math.PI) * 0.35)));
  });
  const fist = shake || kind === 'rock';
  return (
    <group ref={g} position={[x, 0, 0]} rotation={[0, flip ? -0.5 : 0.5, 0]}>
      {fist && <><mesh material={toon(color)}><sphereGeometry args={[0.95, 20, 16]} /></mesh><mesh material={inkMat} scale={1.06}><sphereGeometry args={[0.95, 20, 16]} /></mesh>
        {[-0.45, -0.15, 0.15, 0.45].map((k) => <mesh key={k} position={[k, 0.75, 0.55]} material={toon(color)}><sphereGeometry args={[0.24, 12, 10]} /></mesh>)}</>}
      {!shake && kind === 'paper' && <>
        <mesh material={toon(color)}><boxGeometry args={[1.5, 1.4, 0.35]} /></mesh><mesh material={inkMat} scale={1.05}><boxGeometry args={[1.5, 1.4, 0.35]} /></mesh>
        {[-0.55, -0.18, 0.18, 0.55].map((k) => <mesh key={k} position={[k, 1.2, 0]} material={toon(color)}><boxGeometry args={[0.28, 1.0, 0.3]} /></mesh>)}
        <mesh position={[flip ? 0.95 : -0.95, 0.2, 0]} rotation={[0, 0, flip ? -0.9 : 0.9]} material={toon(color)}><boxGeometry args={[0.28, 0.9, 0.3]} /></mesh></>}
      {!shake && kind === 'scissors' && <>
        <mesh material={toon(color)}><boxGeometry args={[1.3, 1.0, 0.4]} /></mesh><mesh material={inkMat} scale={1.05}><boxGeometry args={[1.3, 1.0, 0.4]} /></mesh>
        {[-0.3, 0.3].map((k) => <mesh key={k} position={[k * 1.2, 1.1, 0]} rotation={[0, 0, k]} material={toon(color)}><boxGeometry args={[0.3, 1.5, 0.28]} /></mesh>)}</>}
    </group>
  );
}
function RpsScene({ room }) {
  const s = room.state; const last = s.last; const waiting = !last || s.picks.some((p) => p);
  const showing = last && !s.picks.some((p) => p);
  return (
    <group>
      <mesh position={[0, -1.4, 0]} material={toon('#a78bfa')}><cylinderGeometry args={[3.4, 3.6, 0.3, 32]} /></mesh>
      <Hand key={`l${s.round}-${showing}`} x={-1.9} kind={last?.picks[0]} shake={!showing} color={SIDE[0]} />
      <Hand key={`r${s.round}-${showing}`} x={1.9} kind={last?.picks[1]} shake={!showing} flip color={SIDE[1]} />
      {!waiting && null}
    </group>
  );
}

// ---------------------------------------------------------------- reaction race
const hash = (id) => [...String(id)].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
const speciesOf = (p) => (SPECIES[p.buddy] ? p.buddy : SPECIES_IDS[hash(p.id) % SPECIES_IDS.length]);

function Lamp({ y, color, on }) {
  return (
    <group position={[0, y, 0.3]}>
      <mesh material={on ? toon(color) : toon('#334155')}><sphereGeometry args={[0.38, 16, 12]} /></mesh>
      {on && <pointLight color={color} intensity={2.2} distance={5} />}
    </group>
  );
}
function Racer({ p, i, n, score, early, winner, goal }) {
  const g = useRef(); const w = Math.min(1.7, 7.6 / n);
  const x = -((n - 1) * w) / 2 + i * w;
  useFrame((st) => { if (g.current) g.current.position.y = winner ? Math.abs(Math.sin(st.clock.elapsedTime * 8)) * 0.5 : 0; });
  return (
    <group position={[x, -1.3, 0]}>
      <mesh position={[0, 0.0 + score * 0.17, 0]} material={toon(i % 2 ? '#a78bfa' : '#7c5cff')}><boxGeometry args={[w * 0.8, 0.3 + score * 0.34, 0.8]} /></mesh>
      <group ref={g} position={[0, 0.2 + score * 0.34, 0]}>
        <Critter3D species={speciesOf(p)} pose={winner ? 'cheer' : early ? 'scared' : 'idle'} scale={Math.min(0.5, w * 0.34)} rotation={[0, 0.2, 0]} />
      </group>
      {goal && <mesh position={[0, -0.3, 0.5]} />}
    </group>
  );
}
function RaceScene({ room }) {
  const s = room.state; const n = room.players.length;
  const ph = room.status !== 'playing' ? 'over' : s.phase;
  return (
    <group>
      <group position={[0, 1.7, 0]}>
        <mesh material={toon('#1e293b')}><boxGeometry args={[1.1, 2.2, 0.5]} /></mesh>
        <mesh material={inkMat} scale={1.04}><boxGeometry args={[1.1, 2.2, 0.5]} /></mesh>
        <Lamp y={0.6} color="#ef4444" on={ph === 'wait'} />
        <Lamp y={0} color="#fbbf24" on={ph === 'result'} />
        <Lamp y={-0.6} color="#22c55e" on={ph === 'go'} />
      </group>
      {room.players.map((p, i) => <Racer key={p.id} p={p} i={i} n={n} score={s.scores[i] || 0} early={s.early?.includes(i)} winner={ph === 'result' && s.lastWinner === i} />)}
      <mesh position={[0, -1.45, 0]} material={toon('#6d28d9')}><boxGeometry args={[9, 0.2, 2]} /></mesh>
    </group>
  );
}

const CAM = {
  ttt: { fov: 34, position: [0, 5.6, 4.6] },
  c4: { fov: 38, position: [0, 0.4, 11.5] },
  rps: { fov: 34, position: [0, 1.5, 8.2] },
  race: { fov: 34, position: [0, 1.2, 9.5] },
};
const LOOK = { ttt: [0, 0, 0], c4: [0, 0, 0], rps: [0, 0, 0], race: [0, 0.4, 0] };
const HEIGHT = { ttt: 340, c4: 380, rps: 260, race: 300 };

/** The 3D table for one multiplayer game; `onMove` sends a move to the server. */
export default function GameStage({ room, onMove, calm }) {
  const Scene = { ttt: TttScene, c4: C4Scene, rps: RpsScene, race: RaceScene }[room.game];
  return (
    <Stage calm={calm} fps={40} camera={{ ...CAM[room.game], near: 0.1, far: 60 }} className="game-stage mx-auto w-full max-w-xl rounded-2xl border-2 border-slate-900" style={{ height: HEIGHT[room.game], background: 'linear-gradient(180deg,#4338ca 0%,#1e1b4b 60%,#0f0b2e 100%)' }} lookAt={LOOK[room.game]}>
      <Scene room={room} onMove={onMove} />
    </Stage>
  );
}
