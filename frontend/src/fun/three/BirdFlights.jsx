import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Stage from './Stage';
import Bird3D, { BIRD_IDS } from './Bird3D';
import { Part } from './Critter3D';

const SCALE = 78;
const ease = (u) => 1 - (1 - u) ** 3;
const bez = (a, c, b, u) => ({ x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y });

/** One bird on its way. Positions are in screen pixels (origin top-left); `kind` is out (carrying a letter away) or in (arriving to deliver). */
function Flight({ f, w, h }) {
  const g = useRef(); const feathers = useRef([]);
  const t0 = useRef(null);
  const type = f.birds[f.i % f.birds.length] || BIRD_IDS[f.i % BIRD_IDS.length];
  const dur = f.kind === 'in' ? 3.1 : 3.4;
  const spread = (f.i - (f.n - 1) / 2);
  const path = (u) => {
    if (f.kind === 'out') {
      const a = { x: f.from.x + spread * 24, y: f.from.y };
      const c = { x: f.from.x - 140 + spread * 90, y: f.from.y - h * 0.55 };
      const b = { x: w + 160, y: -140 + spread * 40 };
      return bez(a, c, b, u);
    }
    const a = { x: -140, y: h * 0.18 + spread * 40 };
    const c = { x: w * 0.45, y: -40 + spread * 30 };
    const b = { x: f.to.x + spread * 18, y: f.to.y - 34 };
    return bez(a, c, b, ease(u));
  };
  useFrame((s) => {
    if (t0.current === null) t0.current = s.clock.elapsedTime + f.delay;
    const el = s.clock.elapsedTime - t0.current;
    const u = Math.max(0, Math.min(1, el / dur));
    const p = path(u); const q = path(Math.min(1, u + 0.02));
    if (g.current) {
      g.current.visible = el >= 0 && !(f.kind === 'in' && u >= 1);
      g.current.position.set(p.x - w / 2, h / 2 - p.y, 5);
      const dx = q.x - p.x; const dy = -(q.y - p.y);
      g.current.rotation.set(0, dx >= 0 ? 1.2 : -1.2, Math.atan2(dy, Math.max(0.001, Math.abs(dx))) * 0.7 * (dx >= 0 ? 1 : -1));
      const s2 = f.kind === 'in' ? 1 - 0.25 * ease(u) : 1;
      g.current.scale.setScalar(SCALE * s2);
    }
    feathers.current.forEach((m, k) => {
      if (!m) return;
      const lag = Math.max(0, u - (k + 1) * 0.035);
      const pp = path(lag);
      m.visible = el >= 0 && u < 1 && u > (k + 1) * 0.035;
      m.position.set(pp.x - w / 2 + Math.sin(el * 3 + k) * 6, h / 2 - pp.y - 10 - (u - lag) * 260, 4);
      m.rotation.z = el * 2 + k;
      m.scale.setScalar(SCALE * 0.1 * (1 - k / 11));
    });
  });
  return (
    <>
      <group ref={g}><Bird3D type={type} pose={f.kind === 'in' ? 'flap' : 'fly'} envelope seed={f.i} /></group>
      {Array.from({ length: 8 }, (_, k) => <group key={k} ref={(el) => { feathers.current[k] = el; }}><Part g="sphere" color="#ffffff" s={[1, 0.3, 0.1]} basic outline={false} /></group>)}
    </>
  );
}

function Scene({ flights }) {
  const { size } = useThree();
  return flights.flatMap((f) => Array.from({ length: f.n }, (_, i) => <Flight key={`${f.id}-${i}`} f={{ ...f, i }} w={size.width} h={size.height} />));
}

/** A full-screen, click-through canvas that only exists while birds are flying. */
export default function BirdFlights({ flights }) {
  return (
    <Stage ortho zoom={1} fps={30} className="pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: 255, pointerEvents: 'none' }}
      camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 400 }}>
      <Scene flights={flights} />
    </Stage>
  );
}
