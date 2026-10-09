import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D, { Part } from './Critter3D';

const Z = 52;
const COLORS = ['#f472b6', '#fbbf24', '#a78bfa', '#fb7185', '#60a5fa', '#fde047'];

function Garden({ count, calm }) {
  const { size } = useThree();
  const W = size.width / Z; const H = size.height / Z; const gy = -H / 2 + 0.3;
  const flowers = useRef([]); const drops = useRef([]); const wings = useRef([]); const bfly = useRef([]);
  const spots = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ x: ((i % 10) - 4.5) * 0.62 + ((i * 7) % 5) * 0.04, z: -0.5 + Math.floor(i / 10) * 0.55, c: COLORS[i % COLORS.length], h: 0.45 + ((i * 13) % 5) * 0.07 })), []);
  const fx = -W / 2 + 2.3;
  useFrame((s, dt) => {
    const t = calm ? 1 : s.clock.elapsedTime;
    flowers.current.forEach((g, i) => { if (!g) return; const want = i < count ? 1 : 0.0001; const cur = g.scale.x; const nx = calm ? want : cur + (want - cur) * (1 - Math.exp(-dt * 5)); g.scale.setScalar(nx); g.rotation.z = Math.sin(t * 1.5 + i) * 0.05 * nx; });
    drops.current.forEach((d, i) => { if (!d) return; const k = (t * 1.4 + i * 0.2) % 1; d.position.set(fx + 0.55 + k * 1.2, gy + 1.15 - k * k * 1.0, 0.3); d.visible = !calm; });
    bfly.current.forEach((b, i) => { if (!b) return; b.position.set(Math.sin(t * 0.6 + i * 2.2) * (W * 0.3) + W * 0.15, gy + 1.2 + Math.sin(t * 1.3 + i) * 0.35, 0.4); });
    wings.current.forEach((w, i) => { if (w) w.rotation.y = Math.sin(t * 16 + i) * 0.9; });
  });
  return (
    <>
      <Part g="box" color="#4ade80" s={[W / 2 + 1, 0.12, 1.4]} p={[0, gy - 0.12, -0.2]} outline={false} />
      <group position={[fx, gy, 0.1]} scale={0.7}><Critter3D species="frog" pose="water" held="can" calm={calm} rotation={[0, 1.0, 0]} /></group>
      {Array.from({ length: 6 }, (_, i) => <group key={`d${i}`} ref={(el) => { drops.current[i] = el; }}><Part color="#38bdf8" s={0.05} basic outline={false} /></group>)}
      {spots.map((f, i) => (
        <group key={i} ref={(el) => { flowers.current[i] = el; }} position={[f.x + 0.6, gy, f.z]} scale={0.0001}>
          <Part g="cyl" args={[1, 1, 1, 6]} color="#16a34a" s={[0.025, f.h / 2, 0.025]} p={[0, f.h / 2, 0]} outline={false} />
          {Array.from({ length: 5 }, (_, k) => { const a = (k / 5) * Math.PI * 2; return <Part key={k} color={f.c} s={0.09} p={[Math.cos(a) * 0.11, f.h + Math.sin(a) * 0.11, 0]} outline={false} />; })}
          <Part color="#fde047" s={0.07} p={[0, f.h, 0.03]} outline={false} />
        </group>
      ))}
      {[0, 1].map((i) => (
        <group key={`b${i}`} ref={(el) => { bfly.current[i] = el; }}>
          {[-1, 1].map((x) => <group key={x} ref={(el) => { wings.current[i * 2 + (x + 1) / 2] = el; }}><Part g="box" color={i ? '#fb923c' : '#60a5fa'} s={[0.12, 0.1, 0.01]} p={[x * 0.1, 0, 0]} outline={false} basic /></group>)}
        </group>
      ))}
    </>
  );
}

export default function GardenStage({ count, calm }) {
  return <Stage ortho zoom={Z} calm={calm} style={{ position: 'absolute', inset: 0 }}><Garden count={count} calm={calm} /></Stage>;
}
