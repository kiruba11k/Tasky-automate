import React from 'react';
import { Cat, Mouse } from './Critters';

/** Empty-state illustration: the cat naps while a mouse peeks out of its hole. */
export default function Scene({ size = 78 }) {
  return (
    <div className="relative flex items-end justify-center gap-2" style={{ height: size + 16 }} aria-hidden="true">
      <Cat pose="sleep" size={size} />
      <div className="relative" style={{ width: size * 0.7, height: size * 0.6 }}>
        <div className="scene-hole" />
        <div className="scene-peek"><Mouse pose="sit" size={size * 0.34} /></div>
      </div>
    </div>
  );
}
