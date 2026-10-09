import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D, { Part } from './Critter3D';

function Podium({ species, equipped, calm }) {
  const ring = useRef();
  useFrame((s) => { if (ring.current) ring.current.rotation.y = calm ? 0 : s.clock.elapsedTime * 1.6; });
  return (
    <>
      <Part g="cyl" args={[1, 1, 1, 32]} color="#fbbf24" s={[1.3, 0.22, 1.3]} p={[0, 0.11, 0]} />
      <Part g="cyl" args={[1, 1, 1, 32]} color="#f59e0b" s={[1.0, 0.22, 1.0]} p={[0, 0.33, 0]} />
      <group position={[0, 0.44, 0]}><Critter3D species={species} equipped={equipped} pose="cheer" calm={calm} /></group>
      <group ref={ring} position={[0, 1.7, 0]}>
        {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <Part key={i} g="oct" color={i % 2 ? '#fde047' : '#f472b6'} s={0.12} p={[Math.cos(a) * 1.35, Math.sin(a * 2) * 0.25, Math.sin(a) * 1.35]} basic outline={false} />; })}
      </group>
    </>
  );
}

/** Level-up podium: your buddy cheering on a gold podium inside a ring of spinning stars. */
export default function LevelStage({ species, equipped, calm }) {
  return <Stage calm={calm} camera={{ fov: 32, position: [0, 2.2, 7.4], near: 0.1, far: 50 }} style={{ width: 260, height: 260 }}><Podium species={species} equipped={equipped} calm={calm} /></Stage>;
}
