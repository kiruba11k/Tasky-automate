import React from 'react';
import { Cat, Mouse } from './Critters';

/** Loading state: the cat chases the mouse in place while the ground scrolls past. */
export default function ChaseLoader({ label, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-14 ${className}`} role="status" aria-live="polite">
      <div className="loader-stage" aria-hidden="true">
        <div className="loader-ground" />
        <div className="loader-run mouse"><Mouse pose="run" size={34} /></div>
        <div className="loader-run cat"><Cat pose="run" size={54} /></div>
      </div>
      <p className="text-sm font-semibold text-slate-300">{label}</p>
    </div>
  );
}
