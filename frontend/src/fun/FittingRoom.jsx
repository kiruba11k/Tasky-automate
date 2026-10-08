import React, { Suspense, lazy, useRef } from 'react';
import { hasWebGL } from './three/species';
import { Emoji } from '@/icons/Emoji';

const FittingStage = lazy(() => import('./three/FittingStage'));

/** A fitting room: a curtained booth with a spotlight and a turntable. Drag to spin the model by hand. */
export default function FittingRoom({ species, equipped, calm, pose = 'idle', label }) {
  const rot = useRef({ a: 0.4, drag: false });
  const last = useRef(0);
  const down = (e) => { rot.current.drag = true; last.current = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (!rot.current.drag) return; rot.current.a += (e.clientX - last.current) * 0.012; last.current = e.clientX; };
  const up = () => { rot.current.drag = false; };
  return (
    <div className="fitting-room" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} title="Drag to turn around">
      <div className="fitting-curtain l" /><div className="fitting-curtain r" /><div className="fitting-spot" />
      {hasWebGL()
        ? <Suspense fallback={<div style={{ height: 270 }} />}><FittingStage species={species} equipped={equipped} pose={pose} rot={rot} calm={calm} /></Suspense>
        : <div className="grid place-items-center h-[270px]"><Emoji e="🎩" size="4rem" /></div>}
      {label && <div className="fitting-label">{label}</div>}
    </div>
  );
}
