import React from 'react';
import Mascot from './Mascot';

/** Friendly empty state with a sleepy Tasky. */
export default function EmptyState({ title, hint, mood = 'sleep', className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center gap-1 py-12 rounded-lg glass-effect-enhanced ${className}`}>
      <Mascot mood={mood} size={96} className={mood === 'sleep' ? '' : 'tasky-bob'} />
      <h3 className="text-lg font-extrabold text-white mt-1">{title}</h3>
      {hint && <p className="text-sm text-slate-400 max-w-sm">{hint}</p>}
    </div>
  );
}
