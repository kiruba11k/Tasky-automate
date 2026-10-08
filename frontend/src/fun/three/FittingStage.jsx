import React from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D, { Part } from './Critter3D';

function Turntable({ species, equipped, pose, rot, calm }) {
  const g = React.useRef();
  useFrame((_, dt) => {
    if (!calm && !rot.current.drag) rot.current.a += dt * 0.7;
    if (g.current) g.current.rotation.y = rot.current.a;
  });
  return (
    <>
      <Part g="cyl" args={[1, 1, 1, 40]} color="#7c3aed" s={[1.25, 0.1, 1.25]} p={[0, 0.05, 0]} />
      <Part g="torus" args={[1, 0.05, 8, 40, Math.PI * 2]} color="#fde047" s={[1.25, 1.25, 1.25]} p={[0, 0.11, 0]} r={[Math.PI / 2, 0, 0]} basic outline={false} />
      <group ref={g} position={[0, 0.1, 0]}><Critter3D species={species} equipped={equipped} pose={pose} calm={calm} /></group>
    </>
  );
}

/** The model on a turntable. `rot` is a ref ({ a, drag }) so dragging in the DOM can spin it. */
export default function FittingStage({ species, equipped, pose = 'idle', rot, calm, width = 230, height = 270 }) {
  return (
    <Stage calm={calm} camera={{ fov: 30, position: [0, 2.1, 7.2], near: 0.1, far: 50 }} style={{ width, height }}>
      <Turntable species={species} equipped={equipped} pose={pose} rot={rot} calm={calm} />
    </Stage>
  );
}
