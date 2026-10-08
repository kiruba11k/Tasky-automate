import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D, { Part } from './Critter3D';

const ZOOM = 44;

function Lane({ members, holder, calm }) {
  const { size } = useThree();
  const W = size.width / ZOOM;
  const n = Math.max(1, members.length);
  const xs = members.map((_, i) => -W / 2 + ((i + 0.5) * W) / n);
  const y = -size.height / 2 / ZOOM + 0.3;
  const baton = useRef();
  const from = useRef(null);
  const state = useRef({ holder, t0: -10, ax: 0, bx: 0 });
  const [cheerId, setCheerId] = useState(null);
  const idx = Math.max(0, members.findIndex((m) => m.id === holder));
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const st = state.current;
    const target = xs[idx] ?? 0;
    if (st.holder !== holder) {
      st.ax = from.current ?? target; st.bx = target; st.t0 = t; st.holder = holder;
      setCheerId(holder);
      setTimeout(() => setCheerId((c) => (c === holder ? null : c)), 2200);
    }
    const k = calm ? 1 : Math.min(1, (t - st.t0) / 0.9);
    const x = st.ax + (st.bx - st.ax) * k;
    const arc = Math.sin(k * Math.PI) * 1.3;
    from.current = x;
    if (baton.current) {
      baton.current.position.set(x + 0.28, y + 1.05 * 0.8 + arc, 0.2);
      baton.current.rotation.z = calm ? 0.5 : t * 9 * (k < 1 ? 1 : 0) + 0.5;
    }
  });
  return (
    <>
      {members.map((m, i) => (
        <group key={m.id} position={[xs[i], y, 0]} scale={0.62}>
          <Critter3D species={m.species} equipped={m.equipped} calm={calm} pose={m.id === cheerId ? 'cheer' : m.id === holder ? 'march' : 'idle'} rotation={[0, 0.5, 0]} />
        </group>
      ))}
      <group ref={baton}>
        <Part g="cyl" args={[1, 1, 1, 14]} color="#facc15" s={[0.05, 0.4, 0.05]} r={[0, 0, 0]} />
        <Part g="cyl" args={[1, 1, 1, 14]} color="#ef4444" s={[0.055, 0.07, 0.055]} p={[0, 0.2, 0]} outline={false} />
        <Part g="cyl" args={[1, 1, 1, 14]} color="#ef4444" s={[0.055, 0.07, 0.055]} p={[0, -0.2, 0]} outline={false} />
      </group>
    </>
  );
}

export default function RelayStage({ members, holder, calm, height = 150 }) {
  return (
    <Stage ortho zoom={ZOOM} calm={calm} className="absolute inset-0 pointer-events-none" style={{ position: 'absolute', inset: 0, height }}>
      <Lane members={members} holder={holder} calm={calm} />
    </Stage>
  );
}
