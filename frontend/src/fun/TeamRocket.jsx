import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { request } from '@/api/client';
import { mondayOf } from '@/lib/week';
import { useFun } from './FunProvider';
import { effects } from './effects';
import CountUp from './CountUp';

/** Shared weekly goal: every finished task moves the team's rocket. Collective progress, no ranking. */
export default function TeamRocket() {
  const { celebrate } = useFun();
  const [pulse, setPulse] = useState(null);
  const week = mondayOf();

  const load = useCallback(async () => {
    try { setPulse(await request('GET', `/api/team/pulse?week_start=${week}&today=${format(new Date(), 'yyyy-MM-dd')}`)); } catch { /* optional widget */ }
  }, [week]);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 60000);
    const onFun = (e) => { if (['entity', 'weekly', 'notify'].includes(e.detail?.type)) setTimeout(load, 1500); };
    window.addEventListener('tasky:fun', onFun);
    return () => { clearInterval(timer); window.removeEventListener('tasky:fun', onFun); };
  }, [load]);

  const pct = pulse?.week.pct ?? 0;
  const launched = pct >= 100 && (pulse?.week.planned ?? 0) > 0;

  useEffect(() => {
    if (!launched) return;
    const key = `tasky_goal_${week}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch { /* ignore */ }
    celebrate('party');
    effects.fireworks();
  }, [launched, week, celebrate]);

  if (!pulse) return null;
  const x = 8 + (pct / 100) * 84; // % along the track

  return (
    <div className="glass-effect-enhanced rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-white">Team rocket 🚀</h3>
          <p className="text-xs text-slate-400">This week's team goal: finish everything planned.</p>
        </div>
        <div className="text-right"><div className="text-3xl font-extrabold text-white"><CountUp value={pct} suffix="%" /></div><div className="text-[11px] text-slate-400">{pulse.week.done}/{pulse.week.planned} tasks</div></div>
      </div>
      <div className="rocket-sky relative h-28 rounded-xl overflow-hidden border-2 border-slate-900" role="img" aria-label={`Team is ${pct}% of the way to this week's goal`}>
        <div className="absolute inset-0 stars" aria-hidden="true" />
        <div className="absolute right-3 top-3 text-4xl" aria-hidden="true">{launched ? '🌕' : '🪐'}</div>
        <div className="absolute bottom-2 left-3 right-3 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-yellow-300 transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
        <div className={`absolute bottom-3 text-3xl ${launched ? 'rocket-launch' : 'rocket-fly'}`} style={{ left: `${x}%`, transition: 'left 1s cubic-bezier(.34,1.56,.64,1)', transform: 'translateX(-50%) rotate(45deg)' }} aria-hidden="true">🚀</div>
      </div>
      <p className="text-sm text-slate-300">
        {launched ? 'GOAL SMASHED! The whole team made it to the moon 🌕' : `${pulse.today.active_members} of ${pulse.today.members} teammates have finished something today.`}
      </p>
    </div>
  );
}
