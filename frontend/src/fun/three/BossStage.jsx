import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Stage from './Stage';
import { Part } from './Critter3D';

const LOOKS = {
  backlog: { body: '#65a30d', belly: '#d9f99d', horn: '#365314', extra: 'papers' },
  procrasti: { body: '#6366f1', belly: '#c7d2fe', horn: '#312e81', extra: 'cap' },
  meeting: { body: '#0ea5e9', belly: '#e0f2fe', horn: '#075985', extra: 'clock' },
  deadline: { body: '#ef4444', belly: '#fecaca', horn: '#7f1d1d', extra: 'bells' },
  hydra: { body: '#14b8a6', belly: '#ccfbf1', horn: '#134e4a', extra: 'heads' },
  bug: { body: '#f97316', belly: '#ffedd5', horn: '#7c2d12', extra: 'wings' },
  gremlin: { body: '#a855f7', belly: '#f3e8ff', horn: '#581c87', extra: 'ears' },
  kraken: { body: '#ec4899', belly: '#fce7f3', horn: '#831843', extra: 'tentacles' },
};

function Boss({ id, hp, defeated, hit, calm }) {
  const L = LOOKS[id] || LOOKS.backlog;
  const g = useRef(); const eyes = useRef(); const lastHit = useRef(hit); const hitT = useRef(-10); const stars = useRef();
  useFrame((s) => {
    const t = calm ? 0.5 : s.clock.elapsedTime;
    if (hit !== lastHit.current) { lastHit.current = hit; hitT.current = t; }
    const since = t - hitT.current;
    const squash = since < 0.5 ? Math.sin((since / 0.5) * Math.PI) * 0.22 : 0;
    if (g.current) {
      const shake = hp < 0.3 && !defeated ? Math.sin(t * 40) * 0.03 : 0;
      g.current.position.set(shake, defeated ? 0.1 : 0.05 + Math.abs(Math.sin(t * 2)) * 0.08, 0);
      g.current.scale.set(1 + squash, 1 - squash, 1 + squash);
      g.current.rotation.z = defeated ? Math.sin(t * 4) * 0.25 : Math.sin(t * 1.4) * 0.04;
      g.current.rotation.y = defeated ? t * 0.8 : Math.sin(t * 0.8) * 0.3;
    }
    if (eyes.current) eyes.current.scale.y = defeated || since < 0.3 ? 0.25 : 1;
    if (stars.current) { stars.current.visible = defeated; stars.current.rotation.y = t * 4; }
  });
  return (
    <group ref={g} scale={0.95}>
      <Part color={L.body} s={[0.95, 0.85, 0.85]} p={[0, 1.0, 0]} />
      <Part color={L.belly} s={[0.6, 0.55, 0.3]} p={[0, 0.85, 0.7]} outline={false} />
      {[-1, 1].map((x) => <Part key={`h${x}`} g="cone" args={[1, 2, 10]} color={L.horn} s={[0.14, 0.34, 0.14]} p={[x * 0.5, 1.95, 0]} r={[0, 0, -x * 0.35]} />)}
      <group ref={eyes}>
        {[-1, 1].map((x) => (
          <group key={x} position={[x * 0.3, 1.2, 0.76]}>
            <Part color="#fff" s={[0.17, 0.2, 0.08]} outline={false}><Part color="#17142a" s={[0.08, 0.11, 0.05]} p={[0, -0.01, 0.07]} outline={false} /></Part>
            <Part g="box" color="#17142a" s={[0.2, 0.04, 0.04]} p={[0, 0.26, 0.04]} r={[0, 0, x * 0.5]} outline={false} basic />
          </group>
        ))}
      </group>
      <Part g="torus" args={[1, 0.1, 6, 14, Math.PI]} color="#3b0a0a" s={[0.3, 0.16, 0.05]} p={[0, 0.88, 0.84]} r={[0, 0, Math.PI]} outline={false} basic />
      {[-0.15, 0, 0.15].map((x) => <Part key={x} g="cone" args={[1, 2, 4]} color="#fff" s={[0.05, 0.08, 0.04]} p={[x, 0.82, 0.86]} r={[Math.PI, 0, 0]} outline={false} basic />)}
      {[-1, 1].map((x) => <Part key={`a${x}`} g="cap" args={[1, 1, 4, 8]} color={L.body} s={[0.17, 0.4, 0.17]} p={[x * 1.0, 0.9, 0.1]} r={[0, 0, x * -0.6]} />)}
      {[-1, 1].map((x) => <Part key={`f${x}`} color={L.horn} s={[0.28, 0.14, 0.4]} p={[x * 0.4, 0.2, 0.15]} />)}
      {L.extra === 'papers' && [0, 1, 2, 3].map((i) => <Part key={i} g="box" color={['#fff', '#fef08a', '#bae6fd', '#fbcfe8'][i]} s={[0.4, 0.04, 0.3]} p={[0.04 * (i % 2), 1.95 + i * 0.08, 0]} r={[0, i * 0.3, 0]} />)}
      {L.extra === 'cap' && <Part g="cone" args={[1, 2, 14]} color="#818cf8" s={[0.42, 0.55, 0.42]} p={[0.1, 2.15, 0]} r={[0, 0, -0.3]}><Part color="#fff" s={0.1} p={[0.3, 0.45, 0]} outline={false} /></Part>}
      {L.extra === 'clock' && <><Part g="torus" args={[1, 0.12, 8, 24, Math.PI * 2]} color="#fbbf24" s={[0.3, 0.3, 0.3]} p={[0, 0.85, 0.88]} outline={false} basic /><Part g="box" color="#17142a" s={[0.015, 0.14, 0.01]} p={[0, 0.92, 0.9]} outline={false} basic /><Part g="box" color="#17142a" s={[0.1, 0.015, 0.01]} p={[0.04, 0.85, 0.9]} outline={false} basic /></>}
      {L.extra === 'bells' && [-1, 1].map((x) => <Part key={x} color="#fbbf24" s={0.2} p={[x * 0.3, 1.95, 0.1]} />)}
      {L.extra === 'heads' && [-1, 1].map((x) => <group key={x} position={[x * 1.05, 1.35, 0]}><Part color={L.body} s={0.38} /><Part color="#fff" s={[0.09, 0.1, 0.05]} p={[-0.1, 0.05, 0.33]} outline={false} /><Part color="#fff" s={[0.09, 0.1, 0.05]} p={[0.1, 0.05, 0.33]} outline={false} /></group>)}
      {L.extra === 'wings' && [-1, 1].map((x) => <Part key={x} g="cone" args={[1, 2, 3]} color="#fed7aa" s={[0.5, 0.7, 0.04]} p={[x * 0.95, 1.5, -0.4]} r={[0, 0, x * -1.1]} />)}
      {L.extra === 'ears' && [-1, 1].map((x) => <Part key={x} g="cone" args={[1, 2, 4]} color={L.body} s={[0.3, 0.55, 0.06]} p={[x * 0.95, 1.55, 0]} r={[0, 0, x * -1.3]} />)}
      {L.extra === 'tentacles' && [-0.5, -0.17, 0.17, 0.5].map((x, i) => <Part key={i} g="cap" args={[1, 1, 4, 8]} color={L.body} s={[0.1, 0.3, 0.1]} p={[x, 0.25, 0.4]} r={[0.3, 0, x * 1.2]} />)}
      <group ref={stars} position={[0, 2.5, 0]} visible={false}>{[0, 1, 2, 3].map((i) => <Part key={i} g="oct" color="#fde047" s={0.1} p={[Math.cos((i / 4) * 6.28) * 0.7, 0, Math.sin((i / 4) * 6.28) * 0.7]} basic outline={false} />)}</group>
    </group>
  );
}

/** This week's boss. It squashes when it takes a hit, trembles when nearly beaten, and gets dizzy when defeated. */
export default function BossStage({ id, hp, defeated, hit, calm }) {
  return <Stage calm={calm} camera={{ fov: 30, position: [0, 1.9, 7.4], near: 0.1, far: 40 }} style={{ width: 230, height: 200 }}><Boss id={id} hp={hp} defeated={defeated} hit={hit} calm={calm} /></Stage>;
}
