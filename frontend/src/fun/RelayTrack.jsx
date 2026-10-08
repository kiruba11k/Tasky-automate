import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { request } from '@/api/client';
import { mondayOf } from '@/lib/week';
import { useTeam } from './team';
import { useFun } from './FunProvider';
import { hasWebGL } from './three/species';
import { Emoji } from '@/icons/Emoji';

const RelayStage = lazy(() => import('./three/RelayStage'));

/** Team relay: the baton passes to whoever finished a task most recently. Watching it move is a nice nudge to be next. */
export default function RelayTrack() {
  const { settings } = useFun();
  const { rows } = useTeam(['entity', 'weekly', 'notify', 'completed']);
  const [last, setLast] = useState(null);

  const load = useCallback(async () => {
    try {
      const pulse = await request('GET', `/api/team/pulse?week_start=${mondayOf()}&today=${format(new Date(), 'yyyy-MM-dd')}`);
      setLast(pulse.wins.find((w) => w.type === 'done') || null);
    } catch { /* optional widget */ }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 45000);
    const onFun = (e) => { if (['entity', 'weekly', 'notify'].includes(e.detail?.type)) setTimeout(load, 1600); };
    window.addEventListener('tasky:fun', onFun);
    return () => { clearInterval(t); window.removeEventListener('tasky:fun', onFun); };
  }, [load]);

  const members = [...rows].sort((a, b) => b.done - a.done).slice(0, 7);
  if (members.length < 2) return null;
  const holder = last && members.find((m) => m.id === last.user_id) ? last.user_id : members[0].id;
  const holderRow = members.find((m) => m.id === holder);
  const three = settings.view3d && hasWebGL();

  return (
    <div className="glass-effect-enhanced rounded-2xl p-5">
      <h3 className="text-xl font-extrabold text-white">Team relay <Emoji e="🏁" size="1.2em" /></h3>
      <p className="text-xs text-slate-400 mb-2">The baton goes to whoever finished something last. Grab it next!</p>
      <div className="relative rounded-xl overflow-hidden border-2 border-slate-900 bg-gradient-to-b from-sky-900/40 to-slate-900/40" style={{ height: 150 }}>
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-emerald-800/50 border-t-2 border-dashed border-emerald-300/30" />
        {three && <Suspense fallback={null}><RelayStage members={members} holder={holder} calm={settings.anim === 'calm'} /></Suspense>}
        <div className="absolute bottom-3 left-0 right-0 flex pointer-events-none">
          {members.map((m) => <span key={m.id} className={`flex-1 text-center text-[11px] font-bold truncate px-1 ${m.id === holder ? 'text-yellow-300' : 'text-slate-300'}`}>{m.name.split(' ')[0]}</span>)}
        </div>
      </div>
      <p className="text-sm text-slate-300 mt-2"><span className="font-bold text-yellow-300">{holderRow?.name}</span> has the baton{last ? <> — {last.text}</> : '.'}</p>
    </div>
  );
}
