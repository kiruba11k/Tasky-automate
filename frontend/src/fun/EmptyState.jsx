import React, { Suspense, lazy } from 'react';
import { useFun } from './FunProvider';
import { hasWebGL } from './three/species';

const Buddy3D = lazy(() => import('./three/Buddy3D'));
import Mascot from './Mascot';
import Scene from './chase/Scene';
import CalmScene from './CalmScene';
import { Emoji, Rich } from '@/icons/Emoji';

/** Friendly empty state with a sleepy Tasky. */
export default function EmptyState({ title, hint, mood = 'sleep', className = '' }) {
  const { settings } = useFun();
  const three = settings.view3d && hasWebGL();
  if (mood === 'calm') return <div className={`rounded-lg glass-effect-enhanced overflow-hidden ${className}`}><CalmScene title={title} hint={hint} className="min-h-[15rem]" /></div>;
  return (
    <div className={`flex flex-col items-center text-center gap-1 py-12 rounded-lg glass-effect-enhanced ${className}`}>
      {three ? <Suspense fallback={<div style={{ height: 130 }} />}><Buddy3D species="cat" pose={mood === 'sleep' ? 'sleep' : 'idle'} size={104} calm={settings.anim === 'calm'} /></Suspense> : mood === 'sleep' ? <Scene /> : <Mascot mood={mood} size={96} className="tasky-bob" />}
      <h3 className="text-lg font-extrabold text-white mt-1"><Rich text={title} /></h3>
      {hint && <p className="text-sm text-slate-400 max-w-sm"><Rich text={hint} /></p>}
    </div>
  );
}
