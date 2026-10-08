import React from 'react';
import { useThree } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D from './Critter3D';

const ZOOM = 40;
function Row({ members, calm }) {
  const { size } = useThree();
  const W = size.width / ZOOM;
  const n = Math.max(1, members.length);
  const y = -size.height / 2 / ZOOM + 1.45;
  return members.map((m, i) => (
    <group key={m.id} position={[-W / 2 + ((i + 0.5) * W) / n, y, 0]} scale={Math.min(n > 6 ? 0.7 : 0.9, W / n / 1.3)}>
      <Critter3D species={m.species} equipped={m.equipped} calm={calm} pose={m.done_today > 0 ? 'dance' : 'march'} rotation={[0, 0.35, 0]} />
    </group>
  ));
}
export default function ParadeStage({ members, calm }) {
  return (
    <Stage ortho zoom={ZOOM} calm={calm} style={{ position: 'absolute', inset: 0 }}>
      <Row members={members} calm={calm} />
    </Stage>
  );
}
