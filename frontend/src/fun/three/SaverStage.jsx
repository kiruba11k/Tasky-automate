import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D from './Critter3D';
import { SPECIES_IDS } from './species';

const Z = 56;
const HATS = ['partyhat', 'crown', 'tophat', 'wizard', 'cap', 'chef', 'halo'];

function Drifters() {
  const { size } = useThree();
  const refs = useRef([]);
  const state = useMemo(() => SPECIES_IDS.map((id, i) => ({ id, x: (i - 6) * 0.9, y: (i % 4) * 0.5, vx: (0.5 + (i % 3) * 0.25) * (i % 2 ? 1 : -1), vy: 0, hop: i * 0.7 })), []);
  useFrame((_, dt) => {
    const W = size.width / Z / 2 - 0.7; const floor = -size.height / Z / 2 + 0.3;
    state.forEach((m, i) => {
      m.x += m.vx * dt; if (m.x > W || m.x < -W) { m.vx *= -1; m.x = Math.max(-W, Math.min(W, m.x)); }
      m.vy -= 9 * dt; m.y += m.vy * dt; if (m.y <= 0) { m.y = 0; m.vy = 4 + (i % 4) * 1.2; }
      const g = refs.current[i]; if (g) { g.position.set(m.x, floor + m.y, 0); g.rotation.y = m.vx > 0 ? 0.9 : -0.9; }
    });
  });
  return state.map((m, i) => (
    <group key={m.id} ref={(el) => { refs.current[i] = el; }} scale={0.7}>
      <Critter3D species={m.id} pose="march" equipped={{ hat: HATS[i % HATS.length] }} />
    </group>
  ));
}

/** Idle screensaver: the whole cast bouncing around the screen. */
export default function SaverStage() {
  return <Stage ortho zoom={Z} style={{ position: 'absolute', inset: 0 }}><Drifters /></Stage>;
}
