import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D, { Part } from './Critter3D';

function Tree({ pct, species, equipped, calm }) {
  const trunk = useRef(); const leaves = useRef([]); const cur = useRef(0.05);
  const spots = [[0, 1.4, 0], [-0.45, 1.1, 0.1], [0.45, 1.1, -0.1], [-0.25, 1.75, 0], [0.3, 1.8, 0.1], [0, 2.15, 0]];
  useFrame((s, dt) => {
    cur.current += (Math.max(0.05, pct) - cur.current) * (calm ? 1 : 1 - Math.exp(-dt * 2));
    const k = cur.current;
    if (trunk.current) { trunk.current.scale.y = 0.2 + k * 1.0; trunk.current.position.y = (0.2 + k * 1.0) * 0.5; }
    leaves.current.forEach((l, i) => { if (!l) return; const need = (i + 1) / (spots.length + 1); const v = Math.max(0, Math.min(1, (k - need * 0.85) / 0.15)); l.scale.setScalar(Math.max(0.0001, v)); l.position.y = spots[i][1] * (0.35 + k * 0.65); l.rotation.z = Math.sin(s.clock.elapsedTime * 1.5 + i) * 0.05; });
  });
  return (
    <>
      <group position={[-0.9, 0, 0]} scale={0.55}><Critter3D species={species} equipped={equipped} pose="study" calm={calm} rotation={[0, 0.7, 0]} /></group>
      <group position={[0.8, 0, 0]}>
        <group ref={trunk}><Part g="cyl" args={[1, 1, 1, 10]} color="#92400e" s={[0.12, 1, 0.12]} /></group>
        {spots.map((p, i) => <group key={i} ref={(el) => { leaves.current[i] = el; }} position={[p[0], p[1], p[2]]} scale={0.0001}><Part color={['#4ade80', '#22c55e', '#86efac'][i % 3]} s={0.42} /></group>)}
        <Part g="cyl" args={[1, 1, 1, 14]} color="#a16207" s={[0.55, 0.06, 0.55]} p={[0, 0.02, 0]} outline={false} />
      </group>
    </>
  );
}
/** Focus tree: it grows while you focus, next to your studying buddy. */
export default function TreeStage({ pct, species, equipped, calm }) {
  return <Stage calm={calm} camera={{ fov: 32, position: [0, 1.5, 6.4], near: 0.1, far: 30 }} style={{ width: 150, height: 110 }}><Tree pct={pct} species={species} equipped={equipped} calm={calm} /></Stage>;
}
