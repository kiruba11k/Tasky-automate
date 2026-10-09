import React, { Suspense, lazy, useState } from 'react';
import InView from './InView';
import { BIRDS, BIRD_IDS, BIRD_POSES } from './three/Bird3D';
import { hasWebGL } from './three/species';
import { useFun } from './FunProvider';

const BirdPreviewStage = lazy(() => import('./three/BirdPreviewStage'));

/** The aviary: every messenger bird, with a pose picker. */
export default function Aviary() {
  const { settings } = useFun();
  const [pose, setPose] = useState('perch');
  if (!settings.view3d || !hasWebGL()) return null;
  return (
    <section className="space-y-3" aria-label="Messenger birds">
      <div>
        <h2 className="text-xl font-extrabold text-white">The aviary</h2>
        <p className="text-slate-300 text-sm">The messenger birds who deliver anonymous letters. They also fly across the screen now and then.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Bird pose">
        {BIRD_POSES.map((p) => <button key={p} type="button" role="radio" aria-checked={pose === p} onClick={() => setPose(p)} className={`rounded-lg border-2 border-slate-900 px-3 py-1 text-xs font-bold capitalize ${pose === p ? 'bg-sky-400 text-ink' : 'bg-slate-800 text-slate-200'}`}>{p}</button>)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {BIRD_IDS.map((id) => (
          <div key={id} className="glass-effect-enhanced rounded-2xl p-2 flex flex-col items-center">
            <InView height={150} className="grid place-items-center">
              <Suspense fallback={<div style={{ height: 150 }} />}><BirdPreviewStage type={id} pose={pose} calm={settings.anim === 'calm'} /></Suspense>
            </InView>
            <div className="font-extrabold text-white text-sm">{BIRDS[id].name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
