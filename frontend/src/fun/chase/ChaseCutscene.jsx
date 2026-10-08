import React, { useEffect, useState } from 'react';
import { Emoji } from '@/icons/Emoji';
import { Cat, Mouse } from './Critters';

/**
 * A short cartoon along the bottom of the screen: the mouse sprints across, dives into its hole, and the cat
 * skids after it and bonks the wall. Decorative only (aria-hidden, no pointer events) and removed when done.
 */
export default function ChaseCutscene({ kind = 'escape', onDone }) {
  const [catPose, setCatPose] = useState('run');
  const [bonk, setBonk] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => { setCatPose('dizzy'); setBonk(true); }, kind === 'wander' ? 6900 : 2350);
    const t2 = setTimeout(() => onDone?.(), kind === 'wander' ? 9500 : 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [kind, onDone]);

  return (
    <div className={`cutscene ${kind === 'wander' ? 'wander' : ''}`} aria-hidden="true">
      <div className="cut-hole" />
      <div className="cut-actor cut-mouse"><Mouse pose="run" size={46} /></div>
      <div className="cut-actor cut-cat"><Cat pose={catPose} size={74} /></div>
      {bonk && <span className="cut-bonk">BONK!</span>}
      {bonk && kind !== 'wander' && <span className="cut-cheese"><Emoji e="🧀" size="2.6rem" /></span>}
    </div>
  );
}
