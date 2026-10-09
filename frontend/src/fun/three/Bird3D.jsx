import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Part } from './Critter3D';

/**
 * The messenger flock: plump, fluffy cartoon birds with big glossy eyes, layered feathers and fanned tails.
 * Palettes are original designs. `breast` is the colour shown in the UI for each bird.
 */
export const BIRDS = {
  robin: { name: 'Ruby', body: '#e0524a', head: '#e0524a', chest: '#f6a9a0', chest2: '#fbd0c8', breast: '#e0524a', cheek: '#ff9db3', beak: '#fbbf24', eye: '#7c3a1d', wing: ['#e0524a', '#c43c3c', '#a82f33', '#8f2630'], tail: ['#c43c3c', '#a82f33', '#8f2630'], crest: { type: 'tuft', color: '#e0524a' } },
  bluebird: { name: 'Blue', body: '#3b9ae8', head: '#3b9ae8', chest: '#fcd34d', chest2: '#fde68a', breast: '#3b9ae8', cheek: '#fda4af', beak: '#fb923c', eye: '#7a4a2a', wing: ['#3b9ae8', '#2b7fd0', '#2468b5', '#1d5497'], tail: ['#2b7fd0', '#1d5497', '#164880'], crest: { type: 'tuft', color: '#4cb0ff' }, tailLen: 0.5 },
  parrot: { name: 'Polly', body: '#34c759', head: '#ef4444', chest: '#8be28b', chest2: '#b9f3b9', breast: '#34c759', cheek: '#fde047', beak: '#f5f5f4', eye: '#fbbf24', wing: ['#22a64a', '#1e8f40', '#fbbf24', '#ef4444'], tail: ['#ef4444', '#fbbf24', '#22a64a'], tailLen: 0.8, beakType: 'hook' },
  canary: { name: 'Sunny', body: '#fde047', head: '#fde047', chest: '#fff3a0', chest2: '#fffbd0', breast: '#fde047', cheek: '#fb923c', beak: '#fb923c', eye: '#2b2b3a', wing: ['#facc15', '#eab308', '#ca8a04', '#a16207'], tail: ['#eab308', '#ca8a04'], crest: { type: 'fluff', color: '#fde047' } },
  pigeon: { name: 'Coco', body: '#9aa7bd', head: '#8896ad', chest: '#c4b5fd', chest2: '#7dd3c0', breast: '#9aa7bd', cheek: '#f9a8d4', beak: '#fbcfe8', eye: '#fb923c', wing: ['#8896ad', '#6b7a92', '#53607a', '#3f4b63'], tail: ['#6b7a92', '#3f4b63'] },
  toucan: { name: 'Tango', body: '#2f3a52', head: '#2f3a52', chest: '#fff7d6', chest2: '#ffffff', breast: '#2f3a52', cheek: '#fda4af', beak: '#f97316', eye: '#38bdf8', wing: ['#2f3a52', '#232c42', '#1b2335', '#141b2b'], tail: ['#232c42', '#141b2b', '#ffffff'], feet: '#60a5fa', beakType: 'big' },
  rosie: { name: 'Rosie', body: '#f472b6', head: '#f472b6', chest: '#fbcfe8', chest2: '#fde4f2', breast: '#f472b6', cheek: '#fb7185', beak: '#fbbf24', eye: '#3b82f6', wing: ['#f472b6', '#ec4899', '#db2777', '#be185d'], tail: ['#ec4899', '#be185d'], crest: { type: 'flowers', color: '#ffffff' } },
  parakeet: { name: 'Lime', body: '#fde047', head: '#fde047', chest: '#fef08a', chest2: '#fff7b0', breast: '#84cc16', cheek: '#fb923c', beak: '#fb923c', eye: '#2b2b3a', wing: ['#84cc16', '#65a30d', '#4d7c0f', '#3f6212'], tail: ['#fde047', '#fbbf24', '#84cc16'], tailLen: 0.8, crest: { type: 'tuft', color: '#84cc16' } },
  plum: { name: 'Plum', body: '#c066c8', head: '#fb7a54', chest: '#d98be6', chest2: '#f0b6f5', breast: '#c066c8', cheek: '#ff9db3', beak: '#fbbf24', eye: '#38bdf8', wing: ['#a855c4', '#8e44ad', '#74348f', '#5b2873'], tail: ['#7e3b9c', '#5b2873', '#42205a'], crest: { type: 'fluff', color: '#fb7a54' }, fluffy: true },
  hummingbird: { name: 'Zip', body: '#14b8a6', head: '#0f9488', chest: '#fef3c7', chest2: '#f43f5e', breast: '#14b8a6', cheek: '#fda4af', beak: '#1f2937', eye: '#17142a', wing: ['#5eead4', '#2dd4bf', '#14b8a6', '#0f766e'], tail: ['#0f766e', '#115e59'], beakType: 'long', size: 0.82 },
  puffin: { name: 'Pip', body: '#1f2937', head: '#e5e7eb', chest: '#ffffff', chest2: '#f3f4f6', breast: '#e5e7eb', cheek: '#fdba74', beak: '#f97316', eye: '#17142a', wing: ['#1f2937', '#111827', '#0b1220', '#0b1220'], tail: ['#111827'], feet: '#fb923c', beakType: 'puffin', size: 0.92 },
  cockatiel: { name: 'Kiwi', body: '#9aa3b2', head: '#fde68a', chest: '#c7cdd8', chest2: '#e5e7eb', breast: '#9aa3b2', cheek: '#fb923c', beak: '#9ca3af', eye: '#17142a', wing: ['#8b94a5', '#757f92', '#5f697c', '#e5e7eb'], tail: ['#6b7587', '#4b5568'], tailLen: 0.7, crest: { type: 'long', color: '#fde047' } },
};
export const BIRD_IDS = Object.keys(BIRDS);
export const BIRD_POSES = ['perch', 'sing', 'preen', 'hop', 'puff', 'wave', 'dance', 'love', 'stretch', 'knock', 'sleep', 'fly', 'glide', 'flap', 'dive'];

let heartGeo;
const heart = () => {
  if (heartGeo) return heartGeo;
  const s = new THREE.Shape();
  s.moveTo(0.25, 0.25); s.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0); s.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35); s.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
  s.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35); s.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0); s.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
  heartGeo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: false });
  heartGeo.translate(-0.25, -0.45, -0.09);
  return heartGeo;
};

function Crest({ b }) {
  const c = b.crest; if (!c) return null;
  if (c.type === 'tuft') return [-1, 0, 1].map((i) => <Part key={i} g="cap" args={[1, 1, 4, 8]} color={c.color} s={[0.05, 0.2 - Math.abs(i) * 0.04, 0.05]} p={[i * 0.09, 0.5, 0.0]} r={[-0.5, 0, -i * 0.5]} outline={false} />);
  if (c.type === 'fluff') return [-1, 0, 1].map((i) => <Part key={i} color={c.color} s={0.13 - Math.abs(i) * 0.02} p={[i * 0.13, 0.5 - Math.abs(i) * 0.04, 0.02]} />);
  if (c.type === 'long') return [0, 1, 2].map((i) => <Part key={i} g="cone" args={[1, 2, 6]} color={c.color} s={[0.05, 0.22, 0.04]} p={[0, 0.55 - i * 0.04, -0.05 - i * 0.1]} r={[-0.5 - i * 0.25, 0, 0]} outline={false} />);
  if (c.type === 'flowers') return Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return (
    <group key={i} position={[Math.cos(a) * 0.3, 0.42 + Math.sin(a) * 0.04, Math.sin(a) * 0.2 - 0.02]}>
      {Array.from({ length: 5 }, (__, k) => { const q = (k / 5) * Math.PI * 2; return <Part key={k} color={['#fff', '#fde047', '#c084fc', '#fb7185', '#7dd3fc', '#fff'][i]} s={0.05} p={[Math.cos(q) * 0.06, 0.02, Math.sin(q) * 0.06]} outline={false} />; })}
      <Part color="#fbbf24" s={0.045} p={[0, 0.04, 0]} outline={false} basic />
    </group>
  ); });
  return null;
}

function Beak({ b, jawRef }) {
  const t = b.beakType || 'small';
  const len = t === 'big' ? 0.62 : t === 'long' ? 0.62 : t === 'hook' ? 0.22 : t === 'puffin' ? 0.22 : 0.17;
  const w = t === 'big' ? 0.15 : t === 'long' ? 0.025 : t === 'hook' ? 0.11 : t === 'puffin' ? 0.12 : 0.08;
  // cones point along +y; rotated by PI/2 about x they point forward (+z). Scale order is [width, length, height].
  return (
    <group position={[0, -0.05, 0.42]}>
      <Part g="cone" args={[1, 2, 14]} color={b.beak} s={[w, len / 2, w * (t === 'puffin' ? 0.8 : 1)]} p={[0, 0, len / 2]} r={[Math.PI / 2, 0, 0]} />
      {t === 'big' && <Part g="cone" args={[1, 2, 14]} color="#fde047" s={[w * 0.85, len * 0.3, w * 0.85]} p={[0, 0.02, len * 0.3]} r={[Math.PI / 2, 0, 0]} outline={false} />}
      {t === 'big' && <Part color="#ef4444" s={w * 0.4} p={[0, -0.01, len * 0.95]} outline={false} />}
      {t === 'puffin' && <Part g="cone" args={[1, 2, 14]} color="#ef4444" s={[w * 0.9, len * 0.22, w * 0.5]} p={[0, -0.01, len * 0.5]} r={[Math.PI / 2, 0, 0]} outline={false} />}
      {t === 'hook' && <Part g="cone" args={[1, 2, 10]} color={b.beak} s={[0.06, 0.05, 0.06]} p={[0, -0.09, len * 0.85]} r={[Math.PI / 2 + 0.9, 0, 0]} />}
      <group ref={jawRef} position={[0, -0.02, 0.02]}>
        <Part g="cone" args={[1, 2, 12]} color={b.beak} s={[w * 0.7, len * 0.3, w * 0.5]} p={[0, -0.03, len * 0.3]} r={[Math.PI / 2, 0, 0]} outline={t !== 'long'} />
      </group>
    </group>
  );
}

/**
 * pose: perch | sing | preen | hop | puff | wave | dance | love | stretch | knock | sleep | fly | glide | flap | dive.
 * `envelope` hangs a sealed letter from its feet.
 */
export default function Bird3D({ type = 'robin', pose = 'perch', envelope = false, calm = false, seed = 0, ...rest }) {
  const b = BIRDS[type] || BIRDS.robin;
  const poseRef = useRef(pose); poseRef.current = pose;
  const root = useRef(); const body = useRef(); const head = useRef(); const jaw = useRef(); const eyes = useRef(); const env = useRef();
  const wingL = useRef(); const wingR = useRef(); const tail = useRef(); const legs = useRef(); const hearts = useRef(); const notes = useRef();
  const tailN = b.tail.length + 1;
  const feet = b.feet || '#f59e0b';
  const hg = useMemo(() => heart(), []);
  useFrame((s) => {
    const t = calm ? 0.5 : s.clock.elapsedTime + seed;
    const p = poseRef.current; const sn = Math.sin;
    const o = { y: sn(t * 2) * 0.012, rx: 0, rz: 0, ry: 0, hx: 0, hy: sn(t * 0.7) * 0.5, hz: 0, jaw: 0, wl: -1.0, wr: 1.0, wy: 0, tl: 0, ts: sn(t * 1.6) * 0.06, eye: 1, puff: 1, tuck: 0, x: 0 };
    const flutter = (t % 7) < 0.5 ? sn(t * 40) * 0.25 : 0;
    o.wl += flutter; o.wr -= flutter;
    switch (p) {
      case 'sing': o.hx = -0.4; o.hy = sn(t * 1.3) * 0.15; o.jaw = Math.abs(sn(t * 9)) * 0.7; o.puff = 1.06 + sn(t * 9) * 0.03; o.ts = sn(t * 4.5) * 0.12; o.tl = 0.15; o.y = Math.abs(sn(t * 4.5)) * 0.02; break;
      case 'preen': o.hy = 1.1; o.hx = 0.6 + sn(t * 12) * 0.1; o.jaw = Math.abs(sn(t * 12)) * 0.25; o.wl = -0.65; o.eye = 0.35; break;
      case 'hop': { const k = Math.abs(sn(t * 6)); o.y = k * 0.26; o.x = sn(t * 3) * 0.22; o.wl = -0.55 + k * 0.5; o.wr = 0.55 - k * 0.5; o.hy = sn(t * 3) * 0.4; o.ts = sn(t * 6) * 0.1; break; }
      case 'puff': o.puff = 1.15 + sn(t * 4) * 0.05; o.hx = -0.1; o.eye = 0.8; break;
      case 'wave': o.wr = 1.0 - (0.9 + sn(t * 9) * 0.55) - 1.0 + 1.0; o.wr = -(0.9 + sn(t * 9) * 0.5) + 0.0; o.hz = 0.25; o.jaw = 0.2; break;
      case 'dance': { const k = Math.abs(sn(t * 6)); o.y = k * 0.2; o.rz = sn(t * 3) * 0.2; o.wl = sn(t * 6) * 0.9; o.wr = -sn(t * 6 + Math.PI) * 0.9; o.hz = sn(t * 3) * 0.3; o.ts = sn(t * 9) * 0.3; o.jaw = Math.abs(sn(t * 6)) * 0.4; break; }
      case 'love': o.rz = sn(t * 2) * 0.1; o.hz = 0.25 + sn(t * 2) * 0.1; o.hy = 0.2; o.eye = 0.55; o.puff = 1.08 + sn(t * 3) * 0.03; o.wl = -0.9; o.wr = 0.9; break;
      case 'stretch': o.wl = 0.2 + sn(t * 1.5) * 0.15; o.wr = -(0.2 + sn(t * 1.5) * 0.15); o.hx = -0.3; o.jaw = 0.55 * Math.max(0, sn(t * 1.5)); o.eye = 0.4; o.tl = 0.3; break;
      case 'knock': o.hx = Math.max(0, sn(t * 14)) * 0.85; o.y = Math.abs(sn(t * 7)) * 0.05; o.hy = 0; o.wl = -0.9; o.wr = 0.9; break;
      case 'sleep': o.hx = 0.55; o.hy = 0.9; o.eye = 0.05; o.puff = 1.06 + sn(t * 1.4) * 0.02; o.y = -0.04; o.wl = -1.1; o.wr = 1.1; break;
      case 'fly': { const f = sn(t * 14); o.wl = 0.1 + f * 0.9; o.wr = -(0.1 + f * 0.9); o.y = sn(t * 7) * 0.1; o.hy = 0; o.hx = -0.08; o.ts = sn(t * 6) * 0.14; o.tl = -0.2; o.tuck = 1; o.rx = -0.1; break; }
      case 'flap': { const f = sn(t * (type === 'hummingbird' ? 34 : 20)); o.wl = 0.2 + f * (type === 'hummingbird' ? 0.55 : 1.0); o.wr = -(0.2 + f * (type === 'hummingbird' ? 0.55 : 1.0)); o.y = (type === 'hummingbird' ? sn(t * 3) * 0.08 : Math.abs(sn(t * 10)) * 0.1); o.hy = 0; o.tl = 0.2; o.tuck = 0.5; o.rx = 0.12; break; }
      case 'glide': o.wl = 0.18 + sn(t * 1.2) * 0.08; o.wr = -(0.18 + sn(t * 1.2) * 0.08); o.y = sn(t * 2) * 0.05; o.hy = 0; o.tuck = 1; o.ts = sn(t * 2) * 0.08; o.rx = -0.05; break;
      case 'dive': o.rx = 0.9; o.wl = -0.5; o.wr = 0.5; o.hy = 0; o.hx = 0.1; o.tl = -0.3; o.tuck = 1; break;
      default: break;
    }
    if (root.current) { root.current.position.set(o.x, o.y, 0); root.current.rotation.set(o.rx, o.ry, o.rz); }
    if (body.current) body.current.scale.setScalar(o.puff);
    if (head.current) head.current.rotation.set(o.hx, o.hy, o.hz);
    if (jaw.current) jaw.current.rotation.x = o.jaw;
    if (eyes.current) eyes.current.scale.y = (t % 3.6) < 0.12 ? 0.08 : o.eye;
    if (wingL.current) { wingL.current.rotation.z = o.wl; wingL.current.rotation.y = o.wl < -0.4 ? 0.25 : 0; }
    if (wingR.current) { wingR.current.rotation.z = o.wr; wingR.current.rotation.y = o.wr > 0.4 ? -0.25 : 0; }
    if (tail.current) { tail.current.rotation.y = o.ts; tail.current.rotation.x = -0.45 + o.tl; }
    if (legs.current) legs.current.rotation.x = o.tuck * 1.0;
    if (env.current) env.current.rotation.z = p === 'fly' || p === 'flap' ? sn(t * 5) * 0.15 : 0;
    if (hearts.current) { hearts.current.visible = p === 'love'; hearts.current.children.forEach((h, i) => { const k = (t * 0.5 + i * 0.27) % 1; h.position.set(Math.sin(t * 2 + i * 2) * 0.35, 1.5 + k * 1.1, 0.2); h.scale.setScalar(0.28 * Math.sin(Math.min(1, k * 1.3) * Math.PI)); h.rotation.z = sn(t * 3 + i) * 0.3; }); }
    if (notes.current) { notes.current.visible = p === 'sing'; notes.current.children.forEach((n, i) => { const k = (t * 0.6 + i * 0.33) % 1; n.position.set(0.5 + k * 0.5, 1.5 + k * 0.7 + Math.sin(k * 8) * 0.06, 0.3); n.scale.setScalar(0.07 * (1 - k * 0.6)); }); }
  });
  const size = b.size || 1;
  const tl = b.tailLen || 0.38;
  return (
    <group scale={size} {...rest}>
      <group ref={root}>
        <group ref={body}>
          <Part color={b.body} s={[0.62, 0.58, 0.66]} p={[0, 0.62, -0.02]} />
          <Part color={b.chest} s={[0.5, 0.46, 0.36]} p={[0, 0.52, 0.36]} outline={false} />
          {[[-0.26, 0.64, 0.5], [0, 0.72, 0.56], [0.26, 0.64, 0.5], [-0.15, 0.47, 0.6], [0.15, 0.47, 0.6], [0, 0.31, 0.57], [-0.32, 0.4, 0.44], [0.32, 0.4, 0.44]].map(([x, y, z], i) => (
            <Part key={i} color={i % 3 === 0 ? b.chest2 : b.chest} s={[0.14, 0.12, 0.08]} p={[x, y, z]} r={[0.5, x * 1.6, x * 0.6]} outline={false} />
          ))}
          {b.fluffy && [[-0.4, 0.9, 0.2], [0.4, 0.9, 0.2], [0.0, 1.02, -0.05]].map(([x, y, z], i) => <Part key={`f${i}`} color={b.chest} s={0.12} p={[x, y, z]} outline={false} />)}
          <group ref={tail} position={[0, 0.5, -0.62]} rotation={[-0.45, 0, 0]}>
            {b.tail.map((col, i) => { const n = b.tail.length; const a = (i - (n - 1) / 2) * 0.3; return <Part key={i} color={col} s={[0.09, 0.03, tl]} p={[Math.sin(a) * tl, 0, -Math.cos(a) * tl]} r={[0, a, 0]} />; })}
            <Part color={b.tail[0]} s={[0.1, 0.03, tl]} p={[0, 0.005, -tl]} />
          </group>
          {[-1, 1].map((x) => (
            <group key={x} ref={x > 0 ? wingL : wingR} position={[x * 0.5, 0.82, 0]}>
              {b.wing.map((col, i) => <Part key={i} color={col} s={[0.5 - i * 0.04, 0.045, 0.2 - i * 0.015]} p={[x * (0.3 + i * 0.1), -i * 0.045, -0.04 - i * 0.07]} r={[0, 0, x * -0.1]} />)}
            </group>
          ))}
          <group ref={legs}>
            {[-1, 1].map((x) => (
              <group key={x} position={[x * 0.18, 0.2, 0.06]}>
                <Part g="cyl" args={[1, 1, 1, 6]} color={b.feet || '#f59e0b'} s={[0.028, 0.14, 0.028]} p={[0, -0.1, 0]} outline={false} />
                {[-0.07, 0, 0.07].map((tx) => <Part key={tx} g="cone" args={[1, 2, 5]} color={feet} s={[0.022, 0.07, 0.022]} p={[tx, -0.24, 0.08]} r={[1.4, 0, -tx * 3]} outline={false} />)}
              </group>
            ))}
          </group>
          {envelope && (
            <group ref={env} position={[0, -0.02, 0.12]}>
              {[-0.1, 0.1].map((x) => <Part key={x} g="cyl" args={[1, 1, 1, 6]} color="#a16207" s={[0.01, 0.14, 0.01]} p={[x, 0.1, 0]} outline={false} basic />)}
              <Part g="box" color="#fff7ed" s={[0.26, 0.17, 0.03]} p={[0, -0.06, 0]} />
              <Part g="cone" args={[1, 2, 3]} color="#fde68a" s={[0.13, 0.06, 0.02]} p={[0, 0.01, 0.025]} r={[Math.PI, 0, 0]} outline={false} />
              <Part color="#ef4444" s={0.04} p={[0, -0.03, 0.04]} outline={false} basic />
            </group>
          )}
        </group>
        <group ref={head} position={[0, 1.08, 0.2]}>
          <Part color={b.head} s={[0.5, 0.46, 0.46]} />
          {[-1, 1].map((x) => <Part key={`ch${x}`} color={b.cheek} s={[0.1, 0.07, 0.04]} p={[x * 0.3, -0.12, 0.34]} outline={false} />)}
          <group ref={eyes}>
            {[-1, 1].map((x) => (
              <group key={x} position={[x * 0.2, 0.06, 0.37]}>
                <Part color="#ffffff" s={[0.15, 0.17, 0.08]} outline={false}>
                  <Part color={b.eye} s={[0.105, 0.125, 0.05]} p={[0, 0, 0.05]} outline={false} />
                  <Part color="#17142a" s={[0.06, 0.082, 0.04]} p={[0, 0, 0.075]} outline={false} />
                  <Part color="#ffffff" s={[0.034, 0.038, 0.02]} p={[0.04, 0.045, 0.105]} outline={false} basic />
                  <Part color="#ffffff" s={[0.017, 0.019, 0.012]} p={[-0.035, -0.04, 0.105]} outline={false} basic />
                </Part>
                <Part g="box" color="#3b2a22" s={[0.1, 0.022, 0.03]} p={[x * 0.01, 0.2, 0.04]} r={[0, 0, x * -0.3]} outline={false} />
              </group>
            ))}
          </group>
          <Beak b={b} jawRef={jaw} />
          <Crest b={b} />
        </group>
        <group ref={hearts} visible={false}>{[0, 1, 2, 3].map((i) => <mesh key={i} geometry={hg}><meshToonMaterial color="#f43f5e" /></mesh>)}</group>
        <group ref={notes} visible={false}>{[0, 1, 2].map((i) => <mesh key={i}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial color={['#a78bfa', '#38bdf8', '#f472b6'][i]} /></mesh>)}</group>
      </group>
    </group>
  );
}
