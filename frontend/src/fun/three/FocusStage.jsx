import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D, { Part } from './Critter3D';

const ZOOM = 34;

function Track({ species, equipped, pct, calm }) {
  const { size } = useThree();
  const g = useRef();
  const W = size.width / ZOOM;
  const y = -size.height / 2 / ZOOM + 0.2;
  const x0 = -W / 2 + 0.7; const x1 = W / 2 - 0.9;
  const x = useRef(x0);
  useFrame((_, dt) => {
    const target = x0 + (x1 - x0) * pct;
    x.current += (target - x.current) * (calm ? 1 : 1 - Math.exp(-dt * 3));
    if (g.current) g.current.position.x = x.current;
  });
  return (
    <>
      <group position={[x1 + 0.7, y, 0]}>
        <Part g="cyl" args={[1, 1, 1, 8]} color="#e2e8f0" s={[0.04, 0.9, 0.04]} p={[0, 0.9, 0]} />
        <Part g="box" color="#ef4444" s={[0.4, 0.25, 0.02]} p={[0.4, 1.55, 0]} />
        <Part g="box" color="#fff" s={[0.2, 0.25, 0.021]} p={[0.2, 1.55, 0.001]} outline={false} />
      </group>
      <group ref={g} position={[x0, y, 0]} scale={0.5}>
        <Critter3D species={species} equipped={equipped} calm={calm} pose={pct >= 1 ? 'cheer' : 'run'} rotation={[0, 1.15, 0]} />
      </group>
    </>
  );
}

/** Race mode: your buddy runs toward the finish flag as the session goes by. */
export function RaceStage({ species, equipped, pct, calm }) {
  return (
    <Stage ortho zoom={ZOOM} calm={calm} style={{ width: 190, height: 74 }}>
      <Track species={species} equipped={equipped} pct={pct} calm={calm} />
    </Stage>
  );
}
