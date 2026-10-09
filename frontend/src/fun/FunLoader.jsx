import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import ChaseLoader from './chase/ChaseLoader';
import { useAuth } from '@/auth/AuthContext';

const ArcadeGame = lazy(() => import('./ArcadeGame'));
const LINES = ['Herding tasks…', 'Sharpening pencils…', 'Waking up the checklist…', 'Chasing the cheese…', 'Polishing the gold stars…', 'Warming up the confetti…'];

/** Playful loading state: a cat chases a mouse while the page loads. If it takes a while, there is a tiny game to play. */
export default function FunLoader({ label, className = '', game = true }) {
  const { user } = useAuth();
  const text = useMemo(() => label || LINES[Math.floor(Math.random() * LINES.length)], [label]);
  const [offer, setOffer] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { if (!game) return undefined; const t = setTimeout(() => setOffer(true), 3500); return () => clearTimeout(t); }, [game]);
  if (user?.founder) return <div className="flex flex-col items-center gap-2 text-slate-300" role="status"><span className="h-6 w-6 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" /><span className="text-sm">Loading…</span></div>;
  return (
    <div className="flex flex-col items-center">
      <ChaseLoader label={text} className={className} />
      {offer && !playing && <button type="button" onClick={() => setPlaying(true)} className="mt-2 rounded-lg border-2 border-slate-900 bg-slate-800 px-3 py-1 text-xs font-bold text-white hover:bg-slate-700">Taking a while… play Cheese Dash?</button>}
      {playing && <div className="mt-2 w-full max-w-[420px]"><Suspense fallback={null}><ArcadeGame onClose={() => setPlaying(false)} /></Suspense></div>}
    </div>
  );
}
