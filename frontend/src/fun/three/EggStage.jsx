import React from 'react';
import Stage from './Stage';
import Egg3D from './Egg3D';
import Critter3D from './Critter3D';

/** The egg, then whatever hatched out of it (a buddy, or the current buddy wearing the new accessory). */
export default function EggStage({ phase, prize, equipped, calm }) {
  const reveal = phase === 'reveal' && prize;
  const species = reveal && prize.kind === 'buddy' ? prize.id : 'cat';
  const gear = reveal && prize.kind === 'accessory' ? { ...equipped, [prize.slot]: prize.id } : equipped;
  return (
    <Stage calm={calm} style={{ width: 220, height: 210 }}>
      {!reveal && <Egg3D phase={phase === 'burst' ? 'burst' : phase === 'shake' ? 'shake' : 'idle'} calm={calm} />}
      {reveal && <Critter3D species={species} pose="cheer" calm={calm} equipped={gear} rotation={[0, 0.4, 0]} />}
    </Stage>
  );
}
