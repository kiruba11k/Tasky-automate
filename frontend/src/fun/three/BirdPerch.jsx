import React, { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import Bird3D from './Bird3D';
import { Part } from './Critter3D';

const CYCLE = ['perch', 'preen', 'sing', 'hop', 'puff', 'stretch', 'love', 'perch', 'wave'];

function Branch({ birds, calm }) {
  const [tick, setTick] = useState(0);
  useFrame((s) => { if (calm) return; const k = Math.floor(s.clock.elapsedTime / 3.3); if (k !== tick) setTick(k); });
  const xs = birds.length === 1 ? [0] : birds.length === 2 ? [-0.85, 0.85] : [-1.5, 0, 1.5];
  return (
    <>
      <Part g="cyl" args={[1, 1, 1, 10]} color="#92400e" s={[0.07, 2.3, 0.07]} p={[0, -0.25, 0]} r={[0, 0, Math.PI / 2]} />
      <Part g="cyl" args={[1, 1, 1, 8]} color="#78350f" s={[0.04, 0.45, 0.04]} p={[1.9, 0.0, 0]} r={[0, 0, 0.9]} outline={false} />
      {[[-1.2, -0.28], [1.25, -0.28]].map(([x, y], i) => <Part key={i} color="#4ade80" s={[0.16, 0.07, 0.1]} p={[x, y + 0.1, 0.05]} r={[0, 0, i ? -0.5 : 0.5]} outline={false} />)}
      {birds.slice(0, 3).map((b, i) => {
        const sealed = !b.opened;
        const pose = sealed && ((tick + i) % 3 === 0) ? 'knock' : CYCLE[(tick * 2 + i * 3) % CYCLE.length];
        return (
          <group key={b.id} position={[xs[i], -0.2, 0]} scale={0.85}>
            <Bird3D type={b.bird} pose={pose} envelope={sealed} calm={calm} seed={i * 2.3} rotation={[0, 0.5, 0]} />
          </group>
        );
      })}
    </>
  );
}

/** Birds waiting on a branch in the corner. They preen, sing, hop and fluff up; sealed ones carry a letter and knock now and then. */
export default function BirdPerch({ birds, calm }) {
  return (
    <Stage ortho zoom={46} calm={calm} style={{ width: 200, height: 112 }}>
      <Branch birds={birds} calm={calm} />
    </Stage>
  );
}
