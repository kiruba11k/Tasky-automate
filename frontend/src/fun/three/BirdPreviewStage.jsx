import React from 'react';
import Stage from './Stage';
import Bird3D from './Bird3D';
import { Part } from './Critter3D';

/** One bird on a little branch, for the composer and the aviary. */
export default function BirdPreviewStage({ type, pose, calm, width = 150, height = 150, branch = true }) {
  return (
    <Stage calm={calm} camera={{ fov: 30, position: [0, 1.3, 5.2], near: 0.1, far: 30 }} style={{ width, height }}>
      {branch && <Part g="cyl" args={[1, 1, 1, 10]} color="#92400e" s={[0.07, 1.5, 0.07]} p={[0, 0.0, 0]} r={[0, 0, Math.PI / 2]} />}
      <group position={[0, 0.02, 0]} rotation={[0, 0.5, 0]}><Bird3D type={type} pose={pose} calm={calm} /></group>
    </Stage>
  );
}
