import React, { useMemo } from 'react';
import Mascot from './Mascot';

const LINES = ['Herding tasks…', 'Sharpening pencils…', 'Waking up the checklist…', 'Counting to ten…', 'Polishing the gold stars…', 'Warming up the confetti…'];

/** Playful loading state: Tasky jogs on the spot while three dots bounce. */
export default function FunLoader({ label, className = '' }) {
  const text = useMemo(() => label || LINES[Math.floor(Math.random() * LINES.length)], [label]);
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-16 ${className}`} role="status" aria-live="polite">
      <Mascot mood="happy" size={84} className="tasky-bob" />
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => <span key={i} className="loader-dot" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </div>
      <p className="text-sm font-semibold text-slate-300">{text}</p>
    </div>
  );
}
