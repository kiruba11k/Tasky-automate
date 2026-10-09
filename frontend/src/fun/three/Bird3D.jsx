import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Part } from './Critter3D';

/** Colours for each kind of messenger bird. */
export const BIRDS = {
  robin: { name: 'Robin', body: '#8b6b4a', breast: '#f97316', head: '#8b6b4a', beak: '#fbbf24', wing: '#6b4f35', tail: '#6b4f35' },
  bluebird: { name: 'Bluebird', body: '#3b82f6', breast: '#fdba74', head: '#3b82f6', beak: '#1f2937', wing: '#2563eb', tail: '#1d4ed8', crest: true },
  parrot: { name: 'Parrot', body: '#22c55e', breast: '#86efac', head: '#ef4444', beak: '#f5f5f4', wing: '#16a34a', tail: '#ef4444', longTail: true, hook: true },
  pigeon: { name: 'Pigeon', body: '#94a3b8', breast: '#c4b5fd', head: '#94a3b8', beak: '#fbcfe8', wing: '#64748b', tail: '#64748b' },
  toucan: { name: 'Toucan', body: '#475569', breast: '#fef3c7', head: '#475569', beak: '#f97316', wing: '#334155', tail: '#111827', big: true },
  canary: { name: 'Canary', body: '#fde047', breast: '#fef08a', head: '#fde047', beak: '#fb923c', wing: '#facc15', tail: '#eab308' },
};
export const BIRD_IDS = Object.keys(BIRDS);

/**
 * A cartoon messenger bird built from primitives. pose: fly | flap | perch | knock.
 * `envelope` hangs a sealed letter from its feet.
 */
export default function Bird3D({ type = 'robin', pose = 'perch', envelope = false, calm = false, seed = 0, ...rest }) {
  const b = BIRDS[type] || BIRDS.robin;
  const poseRef = useRef(pose); poseRef.current = pose;
  const root = useRef(); const wingL = useRef(); const wingR = useRef(); const head = useRef(); const tail = useRef(); const eyes = useRef(); const env = useRef();
  useFrame((s) => {
    const t = calm ? 0.4 : s.clock.elapsedTime + seed;
    const p = poseRef.current; const sn = Math.sin;
    let flap = 0.12; let y = 0; let hx = 0; let hy = sn(t * 0.7) * 0.5; let tw = sn(t * 1.6) * 0.06; let blink = (t % 3.5) < 0.12 ? 0.1 : 1;
    if (p === 'fly') { flap = sn(t * 15) * 1.0; y = sn(t * 7.5) * 0.1; hy = 0; tw = sn(t * 6) * 0.15; }
    else if (p === 'flap') { flap = sn(t * 20) * 1.1; y = Math.abs(sn(t * 10)) * 0.1; hy = 0; }
    else if (p === 'knock') { hx = Math.max(0, sn(t * 14)) * 0.8; y = Math.abs(sn(t * 7)) * 0.05; hy = 0; }
    if (root.current) root.current.position.y = y;
    if (wingL.current) wingL.current.rotation.z = p === 'perch' || p === 'knock' ? -1.0 : 0.15 + flap;
    if (wingR.current) wingR.current.rotation.z = p === 'perch' || p === 'knock' ? 1.0 : -(0.15 + flap);
    if (head.current) { head.current.rotation.x = hx; head.current.rotation.y = hy; }
    if (tail.current) { tail.current.rotation.y = tw; tail.current.rotation.x = p === 'fly' ? 0.2 : 0; }
    if (eyes.current) eyes.current.scale.y = blink;
    if (env.current) env.current.rotation.z = p === 'fly' ? sn(t * 5) * 0.15 : 0;
  });
  return (
    <group {...rest}>
      <group ref={root}>
        <Part color={b.body} s={[0.5, 0.42, 0.62]} p={[0, 0.42, 0]} />
        <Part color={b.breast} s={[0.42, 0.36, 0.3]} p={[0, 0.34, 0.34]} outline={false} />
        <group ref={tail} position={[0, 0.4, -0.55]}>
          <Part g="box" color={b.tail} s={[0.2, 0.04, b.longTail ? 0.7 : 0.38]} p={[0, 0, -0.2]} r={[-0.35, 0, 0]} />
          {b.longTail && <Part g="box" color="#fde047" s={[0.1, 0.03, 0.5]} p={[0, 0.02, -0.3]} r={[-0.3, 0, 0]} outline={false} />}
        </group>
        {[-1, 1].map((x) => (
          <group key={x} ref={x < 0 ? wingR : wingL} position={[x * 0.42, 0.58, 0]}>
            <Part color={b.wing} s={[0.5, 0.07, 0.36]} p={[x * 0.42, 0, -0.05]} r={[0, 0, x * -0.1]} />
          </group>
        ))}
        <group ref={head} position={[0, 0.84, 0.4]}>
          <Part color={b.head} s={[0.32, 0.3, 0.3]} />
          {b.crest && [0, 1].map((i) => <Part key={i} g="cone" args={[1, 2, 6]} color="#1d4ed8" s={[0.05, 0.12, 0.05]} p={[0, 0.3, -0.05 - i * 0.1]} r={[-0.4, 0, 0]} outline={false} />)}
          <group ref={eyes}>
            {[-1, 1].map((x) => <Part key={x} color="#17142a" s={[0.055, 0.07, 0.04]} p={[x * 0.17, 0.05, 0.22]} outline={false}><Part color="#fff" s={[0.02, 0.025, 0.02]} p={[0.015, 0.025, 0.03]} outline={false} basic /></Part>)}
          </group>
          <Part g="cone" args={[1, 2, 12]} color={b.beak} s={b.big ? [0.15, 0.15, 0.5] : b.hook ? [0.12, 0.12, 0.2] : [0.08, 0.08, 0.17]} p={[0, -0.02, b.big ? 0.62 : 0.32]} r={[Math.PI / 2, 0, 0]} />
          {b.big && <Part g="cone" args={[1, 2, 12]} color="#fbbf24" s={[0.09, 0.09, 0.3]} p={[0, 0.04, 0.55]} r={[Math.PI / 2, 0, 0]} outline={false} />}
        </group>
        {[-1, 1].map((x) => <Part key={x} g="cyl" args={[1, 1, 1, 6]} color="#f59e0b" s={[0.025, 0.12, 0.025]} p={[x * 0.14, 0.12, 0.05]} outline={false} />)}
        {envelope && (
          <group ref={env} position={[0, -0.12, 0.08]}>
            <Part g="cyl" args={[1, 1, 1, 6]} color="#a16207" s={[0.01, 0.12, 0.01]} p={[-0.1, 0.1, 0]} outline={false} basic />
            <Part g="cyl" args={[1, 1, 1, 6]} color="#a16207" s={[0.01, 0.12, 0.01]} p={[0.1, 0.1, 0]} outline={false} basic />
            <Part g="box" color="#fff7ed" s={[0.26, 0.17, 0.03]} p={[0, -0.04, 0]} />
            <Part g="cone" args={[1, 2, 3]} color="#fde68a" s={[0.13, 0.06, 0.02]} p={[0, 0.03, 0.025]} r={[Math.PI, 0, 0]} outline={false} />
            <Part color="#ef4444" s={0.04} p={[0, -0.01, 0.04]} outline={false} basic />
          </group>
        )}
      </group>
    </group>
  );
}
