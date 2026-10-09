import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import { Part } from './Critter3D';

function Cake({ calm }) {
  const flames = useRef([]); const g = useRef();
  useFrame((s) => { const t = calm ? 0.4 : s.clock.elapsedTime; flames.current.forEach((f, i) => { if (f) { f.scale.set(1 + Math.sin(t * 12 + i) * 0.12, 1 + Math.sin(t * 9 + i * 2) * 0.2, 1); } }); if (g.current) g.current.rotation.y = calm ? 0.3 : t * 0.5; });
  return (
    <group ref={g} position={[0, 0, 0]}>
      <Part g="cyl" args={[1, 1, 1, 32]} color="#f9a8d4" s={[1.1, 0.35, 1.1]} p={[0, 0.2, 0]} />
      <Part g="cyl" args={[1, 1, 1, 32]} color="#fde68a" s={[0.8, 0.3, 0.8]} p={[0, 0.65, 0]} />
      <Part g="cyl" args={[1, 1, 1, 32]} color="#fbcfe8" s={[0.5, 0.25, 0.5]} p={[0, 1.0, 0]} />
      {Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <Part key={i} color="#ef4444" s={0.07} p={[Math.cos(a) * 1.0, 0.4, Math.sin(a) * 1.0]} outline={false} />; })}
      {[-0.15, 0, 0.15].map((x, i) => (
        <group key={i} position={[x, 1.25, i === 1 ? 0.08 : -0.04]}>
          <Part g="cyl" args={[1, 1, 1, 8]} color={['#60a5fa', '#fde047', '#34d399'][i]} s={[0.03, 0.12, 0.03]} outline={false} />
          <group ref={(el) => { flames.current[i] = el; }} position={[0, 0.17, 0]}><Part color="#fb923c" s={[0.04, 0.07, 0.04]} basic outline={false} /></group>
        </group>
      ))}
    </group>
  );
}
export default function CakeStage({ calm }) {
  return <Stage calm={calm} camera={{ fov: 30, position: [0, 2.2, 6.2], near: 0.1, far: 30 }} style={{ width: 150, height: 140 }}><Cake calm={calm} /></Stage>;
}
