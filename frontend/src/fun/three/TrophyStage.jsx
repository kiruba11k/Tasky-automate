import React from 'react';
import { useThree } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D, { Part } from './Critter3D';

const Z = 46;
function Cup({ x, y, earned }) {
  const c = earned ? '#fbbf24' : '#475569';
  return (
    <group position={[x, y, 0]} scale={0.42}>
      <Part g="cyl" args={[1, 1, 1, 14]} color={earned ? '#92400e' : '#334155'} s={[0.45, 0.08, 0.45]} p={[0, 0.04, 0]} outline={earned} />
      <Part g="cyl" args={[1, 1, 1, 10]} color={c} s={[0.1, 0.28, 0.1]} p={[0, 0.3, 0]} outline={earned} />
      <Part g="cone" args={[1, 2, 16]} color={c} s={[0.42, 0.34, 0.42]} p={[0, 0.78, 0]} r={[Math.PI, 0, 0]} outline={earned} />
      {earned && <Part color="#fff7ae" s={0.08} p={[-0.12, 0.8, 0.3]} basic outline={false} />}
    </group>
  );
}

function Room({ earned, total, species, equipped, calm }) {
  const { size } = useThree();
  const W = size.width / Z; const H = size.height / Z;
  const per = Math.ceil(total / 2);
  return (
    <>
      <group position={[-W / 2 + 0.9, -H / 2 + 0.2, 0]} scale={0.55}><Critter3D species={species} equipped={equipped} pose={earned > 0 ? 'cheer' : 'idle'} calm={calm} rotation={[0, 0.5, 0]} /></group>
      {[0, 1].map((row) => (
        <group key={row}>
          <Part g="box" color="#7c4a1e" s={[(W - 2.4) / 2, 0.05, 0.3]} p={[0.6, -H / 2 + 0.5 + row * 0.95, -0.1]} outline={false} />
          {Array.from({ length: row ? total - per : per }, (_, i) => {
            const idx = row * per + i; const cnt = row ? total - per : per; const span = W - 3;
            return <Cup key={idx} x={-W / 2 + 2.2 + (i + 0.5) * (span / cnt)} y={-H / 2 + 0.55 + row * 0.95} earned={idx < earned} />;
          })}
        </group>
      ))}
    </>
  );
}

/** The trophy room: a cabinet with one cup per badge (gold when earned) and your buddy proudly watching. */
export default function TrophyStage(props) {
  return <Stage ortho zoom={Z} calm={props.calm} style={{ position: 'absolute', inset: 0 }}><Room {...props} /></Stage>;
}
