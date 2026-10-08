import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Part } from './Critter3D';

/** Hats and glasses: live in the head's coordinate space (head radius ~0.8, top of head at y 0.74). */
export function HeadGear({ equipped = {} }) {
  const halo = useRef();
  useFrame((s) => { if (halo.current) halo.current.position.y = 1.02 + Math.sin(s.clock.elapsedTime * 2) * 0.04; });
  const { hat, face } = equipped;
  return (
    <>
      {hat === 'partyhat' && (
        <Part g="cone" args={[1, 2, 24]} color="#ec4899" s={[0.3, 0.32, 0.3]} p={[0.04, 1.02, 0]} r={[0, 0, -0.18]}>
          <Part color="#fde047" s={0.1} p={[0, 0.66, 0]} basic />
          <Part g="torus" args={[1, 0.12, 8, 24, Math.PI * 2]} color="#fde047" s={[0.2, 0.2, 0.2]} p={[0, 0.1, 0]} r={[Math.PI / 2, 0, 0]} outline={false} basic />
        </Part>
      )}
      {hat === 'tophat' && (
        <group position={[0, 0.78, 0]}>
          <Part g="cyl" args={[1, 1, 1, 24]} color="#22222c" s={[0.5, 0.05, 0.5]} />
          <Part g="cyl" args={[1, 1, 1, 24]} color="#22222c" s={[0.32, 0.3, 0.32]} p={[0, 0.3, 0]}>
            <Part g="cyl" args={[1, 1, 1, 24]} color="#ef4444" s={[1.03, 0.2, 1.03]} p={[0, -0.55, 0]} outline={false} />
          </Part>
        </group>
      )}
      {hat === 'crown' && (
        <group position={[0, 0.8, 0]}>
          <Part g="cyl" args={[1, 1, 1, 24]} color="#fbbf24" s={[0.34, 0.14, 0.34]} />
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return <Part key={i} g="cone" args={[1, 2, 4]} color="#fbbf24" s={[0.08, 0.14, 0.08]} p={[Math.cos(a) * 0.3, 0.22, Math.sin(a) * 0.3]} />;
          })}
          <Part color="#ef4444" s={0.06} p={[0, 0.02, 0.35]} basic outline={false} />
        </group>
      )}
      {hat === 'wizard' && (
        <group position={[0, 0.76, 0]}>
          <Part g="cyl" args={[1, 1, 1, 24]} color="#4338ca" s={[0.62, 0.04, 0.62]} />
          <Part g="cone" args={[1, 2, 24]} color="#4f46e5" s={[0.36, 0.5, 0.36]} p={[0, 0.5, 0]} r={[0, 0, -0.12]}>
            <Part g="oct" color="#fde047" s={0.1} p={[0, 0.2, 0.34]} basic outline={false} />
          </Part>
        </group>
      )}
      {hat === 'cap' && (
        <group position={[0, 0.62, 0]}>
          <Part color="#ef4444" s={[0.62, 0.34, 0.6]} p={[0, 0.1, 0]} />
          <Part g="cyl" args={[1, 1, 1, 24]} color="#dc2626" s={[0.36, 0.04, 0.3]} p={[0, 0.02, 0.62]} />
        </group>
      )}
      {hat === 'chef' && (
        <group position={[0, 0.78, 0]}>
          <Part g="cyl" args={[1, 1, 1, 24]} color="#f8fafc" s={[0.34, 0.2, 0.34]} />
          <Part color="#f8fafc" s={[0.46, 0.3, 0.42]} p={[0, 0.3, 0]} />
        </group>
      )}
      {hat === 'halo' && (
        <group ref={halo} position={[0, 1.02, 0]}>
          <Part g="torus" args={[1, 0.12, 10, 32, Math.PI * 2]} color="#fde047" s={[0.38, 0.38, 0.38]} r={[Math.PI / 2, 0, 0]} basic outline={false} />
        </group>
      )}
      {face === 'glasses' && [-1, 1].map((x) => (
        <Part key={x} g="torus" args={[1, 0.1, 8, 24, Math.PI * 2]} color="#1f2937" s={[0.19, 0.19, 0.19]} p={[x * 0.27, 0.06, 0.7]} basic outline={false} />
      ))}
      {face === 'glasses' && <Part g="cyl" args={[1, 1, 1, 8]} color="#1f2937" s={[0.07, 0.014, 0.014]} p={[0, 0.08, 0.72]} r={[0, 0, Math.PI / 2]} basic outline={false} />}
      {face === 'shades' && [-1, 1].map((x) => <Part key={x} color="#111827" s={[0.2, 0.15, 0.06]} p={[x * 0.27, 0.07, 0.72]} />)}
      {face === 'shades' && <Part color="#111827" s={[0.4, 0.025, 0.03]} p={[0, 0.11, 0.74]} basic outline={false} />}
    </>
  );
}

/** Scarves and bow ties: sit at the neck, in the character's root space. */
export function NeckGear({ equipped = {} }) {
  const { neck } = equipped;
  if (!neck) return null;
  if (neck === 'bowtie') {
    return (
      <group position={[0, 1.18, 0.5]}>
        {[-1, 1].map((x) => <Part key={x} g="cone" args={[1, 2, 16]} color="#ef4444" s={[0.14, 0.16, 0.08]} p={[x * 0.16, 0, 0]} r={[0, 0, x * -Math.PI / 2]} />)}
        <Part color="#b91c1c" s={0.07} />
      </group>
    );
  }
  const colors = neck === 'rainbow' ? ['#ef4444', '#fbbf24', '#22c55e', '#3b82f6'] : ['#ef4444', '#dc2626'];
  return (
    <group position={[0, 1.15, 0.02]}>
      <Part g="torus" args={[1, 0.17, 10, 28, Math.PI * 2]} color={colors[0]} s={[0.5, 0.5, 0.5]} r={[Math.PI / 2, 0, 0]} />
      {colors.length > 2 && <Part g="torus" args={[1, 0.1, 10, 28, Math.PI * 2]} color={colors[2]} s={[0.54, 0.54, 0.4]} p={[0, -0.05, 0]} r={[Math.PI / 2, 0, 0]} outline={false} />}
      <Part g="cap" args={[1, 1, 3, 8]} color={colors[1]} s={[0.1, 0.22, 0.05]} p={[0.28, -0.3, 0.46]} r={[0, 0, 0.15]} />
      {colors.length > 2 && <Part g="cap" args={[1, 1, 3, 8]} color={colors[3]} s={[0.1, 0.18, 0.05]} p={[0.36, -0.3, 0.46]} r={[0, 0, 0.15]} outline={false} />}
    </group>
  );
}
