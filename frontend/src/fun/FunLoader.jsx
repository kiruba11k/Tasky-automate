import React, { useMemo } from 'react';
import ChaseLoader from './chase/ChaseLoader';

const LINES = ['Herding tasks…', 'Sharpening pencils…', 'Waking up the checklist…', 'Chasing the cheese…', 'Polishing the gold stars…', 'Warming up the confetti…'];

/** Playful loading state: a cat chases a mouse while the page loads. */
export default function FunLoader({ label, className = '' }) {
  const text = useMemo(() => label || LINES[Math.floor(Math.random() * LINES.length)], [label]);
  return <ChaseLoader label={text} className={className} />;
}
