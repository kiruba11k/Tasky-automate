import React from 'react';
import Stage from './Stage';
import Critter3D from './Critter3D';

/** One 3D character on its own transparent canvas. Used for the page buddy, the login screen and empty states. */
export default function Buddy3D({ species = 'cat', pose = 'idle', size = 120, calm = false, spin = 0.5, className = '' }) {
  return (
    <Stage calm={calm} className={className} style={{ width: size, height: size * 1.25 }}>
      <Critter3D species={species} pose={pose} calm={calm} rotation={[0, spin, 0]} />
    </Stage>
  );
}
