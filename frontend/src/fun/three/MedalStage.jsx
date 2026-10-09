import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import { Part } from './Critter3D';

function starShape() {
  const sh = new THREE.Shape(); const pts = 5;
  for (let i = 0; i < pts * 2; i += 1) { const r = i % 2 ? 0.28 : 0.62; const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * r; const y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
  sh.closePath();
  return sh;
}

function Medal({ color, calm }) {
  const g = useRef();
  const star = useMemo(() => starShape(), []);
  useFrame((s) => { if (g.current) { g.current.rotation.y = calm ? 0.4 : s.clock.elapsedTime * 1.8; g.current.position.y = 1.2 + (calm ? 0 : Math.sin(s.clock.elapsedTime * 2.2) * 0.08); } });
  return (
    <>
      <Part g="box" color="#ef4444" s={[0.16, 0.5, 0.03]} p={[-0.2, 2.2, 0]} r={[0, 0, 0.3]} />
      <Part g="box" color="#3b82f6" s={[0.16, 0.5, 0.03]} p={[0.2, 2.2, 0]} r={[0, 0, -0.3]} />
      <group ref={g} position={[0, 1.2, 0]}>
        <Part g="cyl" args={[1, 1, 1, 40]} color="#fbbf24" s={[0.85, 0.07, 0.85]} r={[Math.PI / 2, 0, 0]} />
        <Part g="torus" args={[1, 0.08, 10, 40, Math.PI * 2]} color={color || '#f59e0b'} s={[0.85, 0.85, 0.85]} basic outline={false} />
        <mesh position={[0, 0, 0.09]}><extrudeGeometry args={[star, { depth: 0.07, bevelEnabled: false }]} /><meshToonMaterial color="#fff7ae" /></mesh>
        <mesh position={[0, 0, -0.16]}><extrudeGeometry args={[star, { depth: 0.07, bevelEnabled: false }]} /><meshToonMaterial color="#fff7ae" /></mesh>
      </group>
    </>
  );
}

/** A spinning gold medal for new badges. */
export default function MedalStage({ calm, color }) {
  return <Stage calm={calm} camera={{ fov: 30, position: [0, 1.6, 6.4], near: 0.1, far: 40 }} style={{ width: 190, height: 190 }}><Medal color={color} calm={calm} /></Stage>;
}
