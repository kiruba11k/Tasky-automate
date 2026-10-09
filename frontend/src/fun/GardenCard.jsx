import React, { Suspense, lazy } from 'react';
import { useFun } from './FunProvider';
import { useTeam } from './team';
import { hasWebGL } from './three/species';

const GardenStage = lazy(() => import('./three/GardenStage'));

/** Team garden: every task the team finishes this week plants a flower. A frog waters them and butterflies visit. */
export default function GardenCard() {
  const { settings } = useFun();
  const { rows } = useTeam(['entity', 'weekly', 'notify', 'completed']);
  const done = rows.reduce((n, r) => n + r.done, 0);
  const three = settings.view3d && hasWebGL();
  return (
    <div className="glass-effect-enhanced rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xl font-extrabold text-white">Team garden</h3>
        <span className="text-xs font-bold text-emerald-300">{done} flower{done === 1 ? '' : 's'} bloomed this week</span>
      </div>
      <p className="text-xs text-slate-400 mb-2">Every task the team finishes plants a flower. Keep it blooming!</p>
      <div className="garden-box">
        {three && <Suspense fallback={null}><GardenStage count={Math.min(30, done)} calm={settings.anim === 'calm'} /></Suspense>}
      </div>
    </div>
  );
}
