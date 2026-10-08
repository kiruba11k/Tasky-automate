import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D from './Critter3D';

const ZOOM = 52;

function Duo({ a, b }) {
  const { size } = useThree();
  const left = useRef(); const right = useRef();
  const [phase, setPhase] = useState('run');
  const ph = useRef('run');
  const t0 = useRef(null);
  const W = size.width / ZOOM;
  const y = -size.height / 2 / ZOOM + 0.25;
  const meet = 0.62; // how far from the middle each one stops
  useFrame((s) => {
    if (t0.current === null) t0.current = s.clock.elapsedTime;
    const t = s.clock.elapsedTime - t0.current;
    const edge = W / 2 + 1.2;
    let k; let next = 'run';
    if (t < 1.1) { k = 1 - t / 1.1; } else if (t < 2.9) { k = 0; next = 'hf'; } else { k = Math.min(1, (t - 2.9) / 1.1); next = 'out'; }
    const e = (v) => 1 - (1 - v) ** 3;
    const x = (meet + (edge - meet) * (next === 'run' ? e(k) : next === 'out' ? e(k) : 0));
    if (left.current) left.current.position.x = -x;
    if (right.current) right.current.position.x = x;
    if (next !== ph.current) { ph.current = next; setPhase(next); }
  });
  const pa = phase === 'hf' ? 'highfive' : 'run';
  const pb = phase === 'hf' ? 'highfive2' : 'run';
  return (
    <>
      <group ref={left} position={[-W, y, 0]} scale={0.95}><Critter3D species={a.species} equipped={a.equipped} pose={pa} rotation={[0, 1.4, 0]} /></group>
      <group ref={right} position={[W, y, 0]} scale={0.95}><Critter3D species={b.species} equipped={b.equipped} pose={pb} rotation={[0, -1.4, 0]} /></group>
    </>
  );
}

/** Two buddies run in from the sides, high-five in the middle, and run off again. */
export default function HighFiveStage({ a, b }) {
  return (
    <Stage ortho zoom={ZOOM} className="pointer-events-none" style={{ position: 'absolute', inset: 0 }}>
      <Duo a={a} b={b} />
    </Stage>
  );
}
