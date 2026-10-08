import React from 'react';
import { useThree } from '@react-three/fiber';
import Stage from './Stage';
import Critter3D from './Critter3D';
import { SPECIES_IDS } from './species';

const ZOOM = 36;
const HATS = ['partyhat', 'crown', 'tophat', 'wizard', 'cap', 'chef', 'halo'];
function Row() {
  const { size } = useThree();
  const W = size.width / ZOOM;
  const y = -size.height / 2 / ZOOM + 0.6;
  return SPECIES_IDS.map((id, i) => (
    <group key={id} position={[-W / 2 + ((i + 0.5) * W) / SPECIES_IDS.length, y, 0]} scale={0.95}>
      <Critter3D species={id} pose="dance" equipped={{ hat: HATS[i % HATS.length], neck: i % 3 === 0 ? 'rainbow' : undefined, face: i % 4 === 1 ? 'shades' : undefined }} rotation={[0, 0, 0]} />
    </group>
  ));
}
/** Every buddy in the cast, dancing in a row. Konami code surprise. */
export default function PartyStage() {
  return (
    <Stage ortho zoom={ZOOM} style={{ position: 'absolute', inset: 0 }}>
      <Row />
    </Stage>
  );
}
