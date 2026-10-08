import React, { useMemo } from 'react';
import { useAuth } from '@/auth/AuthContext';
import Mascot from './Mascot';
import { useFun } from './FunProvider';
import { Emoji, Rich } from '@/icons/Emoji';

const hello = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Burning the midnight oil' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** Dashboard banner: a waving Tasky, today's plan and the current streak. */
export default function Greeting() {
  const { user } = useAuth();
  const { stats } = useFun();
  const first = (user?.full_name || '').split(' ')[0] || 'friend';
  const line = useMemo(() => {
    if (!stats) return "Let's make today awesome!";
    if (stats.planned_today === 0) return 'Nothing planned for today. Add a task or enjoy the calm! ☕';
    if (stats.completed_today >= stats.planned_today) return `All ${stats.planned_today} done today. You legend! 🏆`;
    const left = stats.planned_today - stats.completed_today;
    return `${left} task${left === 1 ? '' : 's'} left to crush today${stats.completed_today ? ` — ${stats.completed_today} already down!` : '!'}`;
  }, [stats]);
  return (
    <div className="glass-effect-enhanced rounded-2xl p-4 flex items-center gap-4 mb-6">
      <Mascot mood="wave" size={72} className="tasky-bob shrink-0" />
      <div className="min-w-0">
        <h2 className="text-xl md:text-2xl font-extrabold text-white">{hello()}, {first}! <Emoji e="👋" /></h2>
        <p className="text-slate-300"><Rich text={line} /></p>
      </div>
      {stats?.streak > 0 && <div className="ml-auto text-center shrink-0 rounded-xl bg-orange-500/15 border border-orange-400/40 px-3 py-1.5"><div className="text-2xl font-extrabold text-orange-300 flex items-center justify-center gap-1"><Emoji e="🔥" size="1.4rem" /> {stats.streak}</div><div className="text-[11px] text-orange-200">day streak</div></div>}
    </div>
  );
}
