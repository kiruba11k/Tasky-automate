import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import { Part } from './Critter3D';

function Chest({ phase, calm }) {
  const g = useRef(); const lid = useRef(); const glow = useRef(); const t0 = useRef(null);
  useFrame((s) => {
    const t = calm ? 0.2 : s.clock.elapsedTime;
    if (phase === 'opening' && t0.current === null) t0.current = t;
    if (phase === 'closed') t0.current = null;
    const k = t0.current === null ? 0 : t - t0.current;
    if (g.current) { g.current.rotation.z = phase === 'opening' && k < 0.7 ? Math.sin(t * 40) * 0.08 : 0; g.current.position.y = phase === 'closed' ? Math.abs(Math.sin(t * 2)) * 0.06 : 0; }
    const open = phase === 'opening' ? Math.min(1, Math.max(0, (k - 0.7) / 0.35)) : phase === 'open' ? 1 : 0;
    if (lid.current) lid.current.rotation.x = -open * 1.9;
    if (glow.current) { glow.current.scale.setScalar(open * (1 + Math.sin(t * 6) * 0.1)); }
  });
  return (
    <group ref={g} position={[0, 0.1, 0]}>
      <Part g="box" color="#92400e" s={[0.9, 0.45, 0.6]} p={[0, 0.45, 0]} />
      <Part g="box" color="#fbbf24" s={[0.94, 0.06, 0.62]} p={[0, 0.7, 0]} outline={false} />
      <Part g="box" color="#fbbf24" s={[0.08, 0.46, 0.62]} p={[0.0, 0.45, 0]} outline={false} />
      <group ref={lid} position={[0, 0.9, -0.6]}>
        <Part g="cyl" args={[1, 1, 1, 24, 1, false, 0, Math.PI]} color="#b45309" s={[0.3, 0.9, 0.3]} p={[0, 0.0, 0.6]} r={[Math.PI / 2, 0, Math.PI / 2]} />
        <Part g="box" color="#fbbf24" s={[0.08, 0.06, 0.64]} p={[0, 0.3, 0.6]} outline={false} />
      </group>
      <mesh ref={glow} position={[0, 1.15, 0]} scale={0.0001}><sphereGeometry args={[0.55, 16, 12]} /><meshBasicMaterial color="#fde047" transparent opacity={0.5} /></mesh>
      <Part color="#fde047" s={0.1} p={[0, 0.92, 0.3]} basic outline={false} />
    </group>
  );
}

/** The daily treasure chest: wiggles, shakes, then the lid flips open. */
export default function ChestStage({ phase, calm }) {
  return <Stage calm={calm} camera={{ fov: 30, position: [0, 2.4, 6.2], near: 0.1, far: 40 }} style={{ width: 230, height: 190 }}><Chest phase={phase} calm={calm} /></Stage>;
}
