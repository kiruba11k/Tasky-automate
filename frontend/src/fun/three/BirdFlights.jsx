import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import Stage from './Stage';
import Bird3D, { BIRD_IDS } from './Bird3D';
import { Part } from './Critter3D';

const SCALE = 74;
const ease = (u) => 1 - (1 - u) ** 3;
const bez = (a, c, b, u) => ({ x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y });
const PASTELS = ['#fde68a', '#bae6fd', '#fbcfe8', '#bbf7d0', '#ddd6fe', '#fed7aa'];

/** A cloth banner trailing behind a bird, with a line of text. It flutters like a flag. */
function Banner({ text, color, anchor }) {
  const mesh = useRef(); const rope = useRef();
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 144;
    const g = c.getContext('2d');
    g.fillStyle = color; g.strokeStyle = '#141225'; g.lineWidth = 8;
    const r = 26; g.beginPath(); g.moveTo(r, 6); g.lineTo(506 - r, 6); g.quadraticCurveTo(506, 6, 506, r); g.lineTo(506, 138 - r); g.quadraticCurveTo(506, 138, 506 - r, 138); g.lineTo(r, 138); g.quadraticCurveTo(6, 138, 6, 138 - r); g.lineTo(6, r); g.quadraticCurveTo(6, 6, r, 6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#1e1b4b'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 62; g.font = `800 ${size}px Fredoka, system-ui, sans-serif`;
    while (g.measureText(text).width > 450 && size > 26) { size -= 3; g.font = `800 ${size}px Fredoka, system-ui, sans-serif`; }
    g.fillText(text, 256, 76);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }, [text, color]);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 0.28, 18, 1), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) { const x = base[i * 3]; pos.setY(i, base[i * 3 + 1] + Math.sin(x * 7 - t * 7) * 0.05 * (0.5 - x)); }
    pos.needsUpdate = true;
    const a = anchor.current;
    if (mesh.current && a) {
      const w = 238;
      mesh.current.position.set(a.x - a.dir * (w / 2 + 34), a.y - 6, 3);
      mesh.current.rotation.z = a.tilt * 0.5;
      mesh.current.scale.set(w, w, 1);
      mesh.current.visible = a.visible;
    }
    if (rope.current && a) {
      rope.current.visible = a.visible;
      rope.current.position.set(a.x - a.dir * 18, a.y - 4, 3);
      rope.current.scale.set(36, 3, 1);
    }
  });
  return (
    <>
      <mesh ref={mesh} geometry={geo}><meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} /></mesh>
      <mesh ref={rope}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#141225" /></mesh>
    </>
  );
}

/**
 * One bird on its way. Positions are in screen pixels (origin top-left).
 * kind: out (carries a letter away) | in (arrives to deliver) | by (flies across the screen, sometimes with a banner).
 */
function Flight({ f, w, h }) {
  const g = useRef(); const feathers = useRef([]); const anchor = useRef({ x: 0, y: 0, dir: 1, tilt: 0, visible: false });
  const t0 = useRef(null);
  const type = f.birds[f.i % Math.max(1, f.birds.length)] || BIRD_IDS[(f.i * 5 + f.seed) % BIRD_IDS.length];
  const dur = f.dur || (f.kind === 'in' ? 3.1 : f.kind === 'by' ? 8.5 : 3.4);
  const spread = f.i - (f.n - 1) / 2;
  const [pose, setPose] = useState(type === 'hummingbird' ? 'flap' : f.kind === 'in' ? 'flap' : 'fly');
  const poseNow = useRef(pose);
  const path = (u) => {
    if (f.kind === 'out') {
      const a = { x: f.from.x + spread * 24, y: f.from.y }; const c = { x: f.from.x - 140 + spread * 90, y: f.from.y - h * 0.55 }; const b = { x: w + 160, y: -140 + spread * 40 };
      return bez(a, c, b, u);
    }
    if (f.kind === 'in') {
      const a = { x: -140, y: h * 0.18 + spread * 40 }; const c = { x: w * 0.45, y: -40 + spread * 30 }; const b = { x: f.to.x + spread * 18, y: f.to.y - 34 };
      return bez(a, c, b, ease(u));
    }
    const d = f.dir; const x0 = d > 0 ? -240 : w + 240; const x1 = d > 0 ? w + 240 : -240;
    let x = x0 + (x1 - x0) * u; let y = f.alt * h + Math.sin(u * Math.PI * 2.2 + f.seed) * 26;
    if (f.style === 'dive') y += Math.sin(u * Math.PI) * h * 0.3;
    if (f.style === 'loop' && u > 0.36 && u < 0.58) { const th = ((u - 0.36) / 0.22) * Math.PI * 2; x += d * 90 * Math.sin(th); y -= 90 * (1 - Math.cos(th)); }
    if (f.style === 'flock') { x -= d * Math.abs(spread) * 54; y += spread * 22; }
    if (f.style === 'zigzag') y += Math.sin(u * Math.PI * 7) * 60;
    return { x, y };
  };
  useFrame((s) => {
    if (t0.current === null) t0.current = s.clock.elapsedTime + f.delay;
    const el = s.clock.elapsedTime - t0.current;
    const u = Math.max(0, Math.min(1, el / dur));
    const p = path(u); const q = path(Math.min(1, u + 0.015));
    const dx = q.x - p.x; const dy = -(q.y - p.y);
    if (g.current) {
      g.current.visible = el >= 0 && !(f.kind === 'in' && u >= 1);
      g.current.position.set(p.x - w / 2, h / 2 - p.y, 5);
      g.current.rotation.set(0, dx >= 0 ? 1.2 : -1.2, Math.atan2(dy, Math.max(0.001, Math.abs(dx))) * 0.7 * (dx >= 0 ? 1 : -1));
      g.current.scale.setScalar(SCALE * (f.kind === 'in' ? 1 - 0.25 * ease(u) : 1));
    }
    let want = type === 'hummingbird' ? 'flap' : f.kind === 'in' ? 'flap' : 'fly';
    if (f.kind === 'by' && type !== 'hummingbird') { if ((u > 0.2 && u < 0.34) || (u > 0.72 && u < 0.84)) want = 'glide'; if (f.style === 'dive' && u > 0.1 && u < 0.4) want = 'dive'; }
    if (want !== poseNow.current) { poseNow.current = want; setPose(want); }
    anchor.current = { x: p.x - w / 2, y: h / 2 - p.y, dir: dx >= 0 ? 1 : -1, tilt: Math.atan2(dy, Math.max(0.001, Math.abs(dx))) * (dx >= 0 ? 1 : -1), visible: el >= 0 && u < 1 };
    feathers.current.forEach((m, k) => {
      if (!m) return;
      const lag = Math.max(0, u - (k + 1) * 0.03 / (f.kind === 'by' ? 2.4 : 1)); const pp = path(lag);
      m.visible = el >= 0 && u < 1 && lag > 0 && k < (f.kind === 'by' && f.style === 'flock' ? 3 : 8);
      m.position.set(pp.x - w / 2 + Math.sin(el * 3 + k) * 6, h / 2 - pp.y - 10 - (u - lag) * 200, 4);
      m.rotation.z = el * 2 + k;
      m.scale.setScalar(SCALE * 0.1 * (1 - k / 11));
    });
  });
  return (
    <>
      <group ref={g}><Bird3D type={type} pose={pose} envelope={f.kind !== 'by'} seed={f.i * 1.7 + f.seed} /></group>
      {f.banner && f.i === 0 && <Banner text={f.banner} color={f.bannerColor || PASTELS[0]} anchor={anchor} />}
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
