import React, { Suspense, lazy, useEffect, useState } from 'react';
import { request } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useFun } from '@/fun/FunProvider';
import { hasWebGL } from '@/fun/three/species';
import { effects } from '@/fun/effects';
import { emitFun } from '@/fun/bus';
import { Panel, today } from './ui';

const CakeStage = lazy(() => import('@/fun/three/CakeStage'));
const label = (c) => (c.kind === 'birthday' ? 'birthday' : `${c.years}-year work anniversary`);
const when = (c) => (c.days_until === 0 ? 'today' : c.days_until === 1 ? 'tomorrow' : `in ${c.days_until} days`);

/** Mounted once for the whole app: on someone's birthday or anniversary, birds fly by with banners and the confetti flies. */
export function CelebrationWatcher() {
  const { user } = useAuth();
  const { settings } = useFun();
  useEffect(() => {
    if (!user) return undefined;
    const key = `tasky_celebrated_${user.id}`;
    const t = setTimeout(async () => {
      try {
        if (localStorage.getItem(key) === today()) return;
        const list = (await request('GET', `/api/team/celebrations?today=${today()}`)).filter((c) => c.days_until === 0);
        if (!list.length) return;
        localStorage.setItem(key, today());
        if (settings.anim === 'full') { effects.fireworks(); list.slice(0, 3).forEach((c, i) => setTimeout(() => emitFun({ type: 'birdFlyby', banner: c.kind === 'birthday' ? `Happy birthday, ${c.name.split(' ')[0]}!` : `${c.years} years, ${c.name.split(' ')[0]}!`, style: i % 2 ? 'loop' : 'cross' }), 1500 + i * 2500)); }
        emitFun({ type: 'say', text: `Today we celebrate ${list.map((c) => c.name.split(' ')[0]).join(' and ')}!`, mood: 'cheer' });
      } catch { /* optional */ }
    }, 5000);
    return () => clearTimeout(t);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Upcoming birthdays and work anniversaries (next 7 days). */
export default function Celebrations() {
  const { settings } = useFun();
  const [list, setList] = useState([]);
  useEffect(() => { request('GET', `/api/team/celebrations?today=${today()}`).then(setList).catch(() => {}); }, []);
  const now = list.filter((c) => c.days_until === 0);
  const three = settings.view3d && hasWebGL() && now.length > 0;
  return (
    <Panel title="Celebrations" hint="Birthdays and work anniversaries this week. Add yours in the level chip's settings.">
      <div className="flex items-center gap-3">
        {three && <Suspense fallback={<div style={{ width: 150, height: 140 }} />}><CakeStage calm={settings.anim === 'calm'} /></Suspense>}
        <ul className="flex-1 space-y-1.5">
          {list.length === 0 && <li className="text-sm text-slate-500">Nothing to celebrate this week. Add your birthday so the team can!</li>}
          {list.map((c) => <li key={`${c.id}-${c.kind}`} className={`rounded-xl px-3 py-2 text-sm ${c.days_until === 0 ? 'bg-pink-500/20 border border-pink-400/50' : 'bg-slate-800/60'}`}><b className="text-white">{c.name}</b> <span className="text-slate-300">has a {label(c)} {when(c)}</span></li>)}
        </ul>
      </div>
    </Panel>
  );
}
