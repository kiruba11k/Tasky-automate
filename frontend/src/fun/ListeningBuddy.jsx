import React, { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { useFun } from './FunProvider';
import { useBuddy } from './BuddyContext';
import { buddyFor, hasWebGL } from './three/species';

const Buddy3D = lazy(() => import('./three/Buddy3D'));

/** Shown while dictating: your buddy cups a hand to its ear and a live-looking waveform dances. */
export default function ListeningBuddy() {
  const { settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const loc = useLocation();
  const species = buddyFor(loc.pathname.split('/').filter(Boolean)[0] || 'Dashboard', pinned);
  const three = settings.view3d && hasWebGL();
  return (
    <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-400/30 px-3 py-1" role="status">
      {three && <Suspense fallback={<div style={{ width: 64, height: 80 }} />}><Buddy3D species={species} pose="listen" size={64} equipped={equipped} calm={settings.anim === 'calm'} /></Suspense>}
      <div className="wave-bars" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 7) * 0.09}s` }} />)}</div>
      <span className="text-sm text-red-200 font-bold">Listening…</span>
    </div>
  );
}
