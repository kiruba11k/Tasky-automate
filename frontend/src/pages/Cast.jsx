import React, { Suspense, lazy, useState } from 'react';
import { SPECIES, SPECIES_IDS } from '@/fun/three/species';
import { useFun } from '@/fun/FunProvider';

const Buddy3D = lazy(() => import('@/fun/three/Buddy3D'));
const POSES = ['idle', 'run', 'cheer', 'wave', 'scared', 'dizzy', 'sleep'];

/** "Meet the cast": every 3D buddy, with poses to try and a button to pin a favourite for all pages. */
export default function Cast() {
  const { settings, setSettings } = useFun();
  const [pose, setPose] = useState('idle');
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Meet the cast</h1>
        <p className="text-slate-300 text-sm">Each page has its own buddy. Pick a favourite to keep it on every page, or leave it on Auto.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pose">
        {POSES.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={pose === p} onClick={() => setPose(p)} className={`rounded-lg border-2 border-slate-900 px-3 py-1 text-xs font-bold capitalize ${pose === p ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-slate-200'}`}>{p}</button>
        ))}
        <button type="button" onClick={() => setSettings({ buddy: 'auto' })} className={`ml-auto rounded-lg border-2 border-slate-900 px-3 py-1 text-xs font-bold ${settings.buddy === 'auto' ? 'bg-yellow-300 text-ink' : 'bg-slate-800 text-slate-200'}`}>Auto by page</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {SPECIES_IDS.map((id) => (
          <div key={id} className="glass-effect-enhanced rounded-2xl p-3 flex flex-col items-center">
            <Suspense fallback={<div style={{ height: 160 }} />}>
              <Buddy3D species={id} pose={pose} size={170} calm={settings.anim === 'calm'} />
            </Suspense>
            <div className="font-extrabold text-white">{SPECIES[id].name}</div>
            <button type="button" onClick={() => setSettings({ buddy: id })} aria-pressed={settings.buddy === id} className={`mt-1 rounded-lg border-2 border-slate-900 px-3 py-1 text-xs font-bold ${settings.buddy === id ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-slate-200'}`}>{settings.buddy === id ? 'Your buddy' : 'Pick me'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
