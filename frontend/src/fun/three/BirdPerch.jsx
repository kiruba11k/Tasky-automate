import React, { useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import Bird3D from './Bird3D';
import { Part } from './Critter3D';

function Branch({ birds, calm }) {
  const [knocker, setKnocker] = useState(-1);
  const sealed = useMemo(() => birds.map((b, i) => (b.opened ? -1 : i)).filter((i) => i >= 0), [birds]);
  useFrame((s) => {
    if (calm || !sealed.length) return;
    const cyc = Math.floor(s.clock.elapsedTime / 4); const ph = s.clock.elapsedTime % 4;
    const pick = ph < 1.4 ? sealed[cyc % sealed.length] : -1;
    if (pick !== knocker) setKnocker(pick);
  });
  const xs = birds.length === 1 ? [0] : birds.length === 2 ? [-0.8, 0.8] : [-1.5, 0, 1.5];
  return (
    <>
      <Part g="cyl" args={[1, 1, 1, 10]} color="#92400e" s={[0.07, 2.3, 0.07]} p={[0, -0.25, 0]} r={[0, 0, Math.PI / 2]} />
      <Part g="cyl" args={[1, 1, 1, 8]} color="#78350f" s={[0.04, 0.45, 0.04]} p={[1.9, 0.0, 0]} r={[0, 0, 0.9]} outline={false} />
      {birds.slice(0, 3).map((b, i) => (
        <group key={b.id} position={[xs[i], -0.2, 0]} scale={0.95}>
          <Bird3D type={b.bird} pose={knocker === i ? 'knock' : 'perch'} envelope={!b.opened} calm={calm} seed={i * 2.3} rotation={[0, 0.5, 0]} />
        </group>
      ))}
    </>
  );
}

/** Birds waiting on a branch in the corner. Unopened ones carry a sealed letter and knock now and then. */
export default function BirdPerch({ birds, calm }) {
  return (
    <Stage ortho zoom={46} calm={calm} style={{ width: 200, height: 112 }}>
      <Branch birds={birds} calm={calm} />
    </Stage>
  );
}
