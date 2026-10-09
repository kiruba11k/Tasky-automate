import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { request } from '@/api/client';
import { mondayOf } from '@/lib/week';
import { useFun } from '@/fun/FunProvider';
import { useBuddy } from '@/fun/BuddyContext';
import { hasWebGL } from '@/fun/three/species';
import { effects } from '@/fun/effects';
import { primary, subtle } from './ui';

const Buddy3D = lazy(() => import('@/fun/three/Buddy3D'));

/** Your week, wrapped: a short animated story of the week you just had. Positive facts only. */
export default function Wrapped({ open, onOpenChange }) {
  const { settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const [d, setD] = useState(null); const [i, setI] = useState(0);
  useEffect(() => { if (!open) return; setI(0); request('GET', `/api/me/wrapped?week_start=${mondayOf()}`).then(setD).catch(() => {}); }, [open]);
  const slides = d ? [
    { big: d.done, label: d.done === 1 ? 'task finished this week' : 'tasks finished this week', sub: d.planned ? `out of ${d.planned} planned` : 'you made the week your own', pose: 'cheer' },
    { big: `${d.hours}h`, label: 'of work done', sub: d.hours >= 20 ? 'that is serious focus' : 'every hour counts', pose: 'study' },
    ...(d.project ? [{ big: d.project, label: 'was your most active project', sub: 'you kept it moving', pose: 'dance', small: true }] : []),
    ...(d.best_day ? [{ big: d.best_day.weekday, label: 'was your best day', sub: `${d.best_day.count} task${d.best_day.count === 1 ? '' : 's'} finished`, pose: 'wave' }] : []),
    { big: `${d.streak}`, label: d.streak === 1 ? 'day streak' : 'day streak', sub: d.kudos + d.shoutouts ? `and ${d.kudos + d.shoutouts} thank-you${d.kudos + d.shoutouts === 1 ? '' : 's'} from teammates` : 'keep it going', pose: 'love' },
    { big: d.title, label: 'is your title this week', sub: 'See you next Monday!', pose: 'dance', small: true, last: true },
  ] : [];
  const s = slides[Math.min(i, slides.length - 1)];
  useEffect(() => { if (s?.last && settings.anim === 'full') effects.fireworks(); }, [s?.last]); // eslint-disable-line react-hooks/exhaustive-deps
  const three = settings.view3d && hasWebGL();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-transparent border-0 shadow-none p-0">
        <DialogTitle className="sr-only">Your week, wrapped</DialogTitle><DialogDescription className="sr-only">A short story of your week</DialogDescription>
        <div className="wrapped-card" key={i}>
          <div className="text-xs font-extrabold tracking-[.25em] text-white/80">YOUR WEEK, WRAPPED</div>
          {s ? (
            <>
              <div className={`wrapped-big ${s.small ? 'text-3xl' : 'text-7xl'}`}>{s.big}</div>
              <div className="text-lg font-bold text-white">{s.label}</div>
              <div className="text-sm text-white/80">{s.sub}</div>
              {three && <Suspense fallback={<div style={{ height: 150 }} />}><Buddy3D species={pinned === 'auto' ? 'cat' : pinned} pose={s.pose} size={120} equipped={equipped} calm={settings.anim === 'calm'} /></Suspense>}
            </>
          ) : <div className="text-white py-16">Gathering your week…</div>}
          <div className="flex gap-2 mt-2">
            {i > 0 && <button type="button" onClick={() => setI(i - 1)} className={subtle}>Back</button>}
            {s && !s.last ? <button type="button" onClick={() => setI(i + 1)} className={primary}>Next</button> : <button type="button" onClick={() => onOpenChange(false)} className={primary}>Done</button>}
          </div>
          <div className="flex gap-1 mt-1">{slides.map((_, k) => <span key={k} className={`h-1.5 w-6 rounded-full ${k <= i ? 'bg-white' : 'bg-white/30'}`} />)}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
