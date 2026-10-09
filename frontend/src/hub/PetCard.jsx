import React, { Suspense, lazy, useState } from 'react';
import { useFun } from '@/fun/FunProvider';
import { useBuddy } from '@/fun/BuddyContext';
import { hasWebGL } from '@/fun/three/species';
import { effects } from '@/fun/effects';
import { play } from '@/fun/sounds';
import { Panel } from './ui';

const Buddy3D = lazy(() => import('@/fun/three/Buddy3D'));

/** Your buddy's tummy: each finished task today is a snack. It is never sick or punished, only a little peckish. */
export default function PetCard() {
  const { stats, settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const [petted, setPetted] = useState(0);
  const done = stats?.completed_today || 0;
  const fed = Math.min(100, done * 34);
  const state = petted > 0 && Date.now() - petted < 2500 ? 'love' : done === 0 ? 'peckish' : done >= 3 ? 'full' : 'happy';
  const pose = { love: 'love', peckish: 'idle', happy: 'wave', full: 'dance' }[state];
  const line = { love: 'Aww, thank you!', peckish: 'A little peckish. A finished task makes a tasty snack.', happy: 'Yum! That was a good snack.', full: 'So full and so happy!' }[state];
  const three = settings.view3d && hasWebGL();
  const pet = () => { setPetted(Date.now()); play('boing', settings.sound); effects.stars(); setTimeout(() => setPetted((p) => p), 2600); };
  return (
    <Panel title="Your buddy" hint="Finish tasks to feed your buddy. Tap to pet!">
      <div className="flex items-center gap-4">
        <button type="button" onClick={pet} aria-label="Pet your buddy" className="shrink-0 rounded-2xl bg-gradient-to-b from-sky-900/40 to-slate-800/40 border-2 border-slate-900">
          {three ? <Suspense fallback={<div style={{ width: 120, height: 150 }} />}><Buddy3D species={pinned === 'auto' ? 'cat' : pinned} pose={pose} size={120} equipped={equipped} calm={settings.anim === 'calm'} /></Suspense> : <div className="w-[120px] h-[150px]" />}
        </button>
        <div className="flex-1">
          <p className="text-sm text-slate-200 mb-2">{line}</p>
          <div className="h-3 rounded-full bg-slate-700 overflow-hidden border border-slate-900" role="progressbar" aria-valuenow={fed} aria-valuemin={0} aria-valuemax={100} aria-label="Fullness"><div className="h-full bg-gradient-to-r from-orange-400 to-yellow-300 transition-all duration-700" style={{ width: `${fed}%` }} /></div>
          <div className="text-[11px] text-slate-400 mt-1">Fullness {fed}%</div>
        </div>
      </div>
    </Panel>
  );
}
