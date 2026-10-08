import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Part } from './Critter3D';
import { toon } from './toon';

const shellMat = (color) => { const m = toon(color).clone(); m.side = THREE.DoubleSide; return m; };
const SPOTS = [[-0.3, 0.55, 0.62], [0.35, 0.2, 0.7], [-0.45, -0.2, 0.6], [0.1, -0.55, 0.7], [0.5, 0.65, 0.4], [-0.1, 0.1, 0.8]];

/** A mystery egg. phase: idle (gentle wobble) | shake (about to hatch) | burst (shell flies apart). */
export default function Egg3D({ phase = 'idle', color = '#fff4d6', spot = '#f472b6', calm = false }) {
  const g = useRef(); const top = useRef(); const bottom = useRef(); const whole = useRef();
  const t0 = useRef(null);
  useFrame((s) => {
    const t = calm ? 0.3 : s.clock.elapsedTime;
    if (phase === 'burst' && t0.current === null) t0.current = t;
    if (phase !== 'burst') t0.current = null;
    const k = t0.current === null ? 0 : Math.min(1, (t - t0.current) / 0.7);
    if (g.current) {
      g.current.rotation.z = phase === 'shake' ? Math.sin(t * 38) * 0.22 : phase === 'idle' ? Math.sin(t * 2.2) * 0.1 : 0;
      g.current.position.y = phase === 'idle' ? Math.abs(Math.sin(t * 1.4)) * 0.06 : 0;
    }
    if (whole.current) whole.current.visible = phase !== 'burst';
    if (top.current) { top.current.visible = phase === 'burst'; top.current.position.set(-0.5 * k, 1.1 + 1.1 * k, 0); top.current.rotation.z = 0.9 * k; }
    if (bottom.current) { bottom.current.visible = phase === 'burst'; bottom.current.position.set(0.4 * k, 0.9 - 0.15 * k, 0); bottom.current.rotation.z = -0.5 * k; }
  });
  return (
    <group ref={g} position={[0, 0, 0]}>
      <group ref={whole} position={[0, 1.0, 0]}>
        <Part color={color} s={[0.78, 1.0, 0.78]} />
        {SPOTS.map((p, i) => <Part key={i} color={spot} s={[0.11 + (i % 3) * 0.03, 0.11 + (i % 3) * 0.03, 0.04]} p={[p[0] * 0.78, p[1] * 1.0, p[2] * 0.7]} outline={false} r={[0, p[0] * 0.8, 0]} />)}
        <Part g="torus" args={[1, 0.09, 8, 28, Math.PI * 2]} color={spot} s={[0.77, 0.77, 0.77]} p={[0, -0.05, 0]} r={[Math.PI / 2, 0, 0]} outline={false} />
      </group>
      <group ref={top} visible={false}>
        <mesh scale={[0.78, 1.0, 0.78]}><sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={shellMat(color)} attach="material" /></mesh>
      </group>
      <group ref={bottom} visible={false}>
        <mesh scale={[0.78, 1.0, 0.78]}><sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><primitive object={shellMat(color)} attach="material" /></mesh>
      </group>
    </group>
  );
}
