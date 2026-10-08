import React, { Suspense, lazy, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useTeam } from './team';
import { useFun } from './FunProvider';
import { effects } from './effects';
import { play } from './sounds';
import { hasWebGL } from './three/species';
import { Emoji } from '@/icons/Emoji';

const ParadeStage = lazy(() => import('./three/ParadeStage'));

/** The weekly team parade: everyone's buddy marching, with how the week went for each person. Positive only: it celebrates what got done. */
export default function TeamParade({ open, onOpenChange }) {
  const { settings } = useFun();
  const { rows, reload } = useTeam([]);
  useEffect(() => { if (open) { reload(true); if (settings.anim === 'full') setTimeout(() => { effects.big(); play('fanfare', settings.sound); }, 500); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const members = [...rows].sort((a, b) => b.done - a.done).slice(0, 10);
  const planned = rows.reduce((n, r) => n + r.planned, 0);
  const done = rows.reduce((n, r) => n + r.done, 0);
  const three = settings.view3d && hasWebGL();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-white">
        <DialogTitle className="text-2xl font-extrabold">Team parade <Emoji e="🎉" size="1.2em" /></DialogTitle>
        <DialogDescription className="text-slate-300">This week the team finished <b className="text-emerald-300">{done}</b> of {planned} planned tasks. Everyone gets a spot in the parade.</DialogDescription>
        <div className="relative rounded-2xl overflow-hidden border-2 border-slate-900 bg-gradient-to-b from-indigo-900/50 via-sky-900/30 to-slate-900/60" style={{ height: 250 }}>
          <div className="parade-bunting" />
          <div className="parade-ground" />
          {three && <Suspense fallback={null}><ParadeStage members={members} calm={settings.anim === 'calm'} /></Suspense>}
          <div className="absolute bottom-3 left-0 right-0 flex pointer-events-none">
            {members.map((m) => (
              <div key={m.id} className="flex-1 min-w-0 text-center px-0.5">
                <div className="text-[11px] font-extrabold truncate text-white drop-shadow">{m.name.split(' ')[0]}</div>
                <div className="text-[10px] text-slate-200">{m.done}/{m.planned || 0}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
