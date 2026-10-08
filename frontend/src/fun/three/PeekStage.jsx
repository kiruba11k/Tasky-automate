import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D, { Part } from './Critter3D';

function Scene({ look, ducked, calm }) {
  const g = useRef(); const cur = useRef(-1.5);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const target = calm ? -0.45 : ducked.current ? -1.7 : -0.45 + Math.max(0, Math.sin(t * 0.9)) * 0.05;
    cur.current += (target - cur.current) * (1 - Math.exp(-dt * (ducked.current ? 14 : 6)));
    if (g.current) g.current.position.y = cur.current;
  });
  return (
    <group position={[0, 0.5, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} scale={[1.25, 0.8, 1]}><circleGeometry args={[1, 28]} /><meshBasicMaterial color="#0b1220" /></mesh>
      <group ref={g} position={[0, -1.5, 0]}>
        <Critter3D species="mouse" pose={ducked.current ? 'scared' : 'idle'} calm={calm} lookRef={look} />
      </group>
      <Part color="#8b5a2b" s={[1.45, 0.55, 0.85]} p={[0, 0, 0.45]} />
      <Part color="#7a4f26" s={[0.45, 0.2, 0.3]} p={[-1.0, 0, 0.7]} outline={false} />
      <Part color="#7a4f26" s={[0.35, 0.16, 0.25]} p={[1.0, 0, 0.75]} outline={false} />
    </group>
  );
}

/** A mouse peeking out of a hole that watches your cursor. Click it and it ducks. */
export default function PeekStage({ calm = false, size = 200 }) {
  const wrap = useRef(null); const look = useRef({ x: 0, y: 0 }); const ducked = useRef(false);
  useEffect(() => {
    const move = (e) => {
      const r = wrap.current?.getBoundingClientRect(); if (!r) return;
      const cx = r.left + r.width / 2; const cy = r.top + r.height * 0.35;
      look.current = { x: Math.max(-1, Math.min(1, (e.clientX - cx) / 260)), y: Math.max(-1, Math.min(1, -(e.clientY - cy) / 200)) };
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);
  const duck = () => { ducked.current = true; setTimeout(() => { ducked.current = false; }, 1100); };
  return (
    <div ref={wrap} onPointerDown={duck} style={{ width: size, height: size * 0.95, cursor: 'pointer' }} title="Boop!" aria-hidden="true">
      <Stage calm={calm} style={{ width: '100%', height: '100%' }}><Scene look={look} ducked={ducked} calm={calm} /></Stage>
    </div>
  );
}
