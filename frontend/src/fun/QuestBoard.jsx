import React, { useState } from 'react';
import { format } from 'date-fns';
import { Check, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFun } from './FunProvider';
import StreakFlame from './StreakFlame';
import ChestDialog from './ChestDialog';
import TrophyShelf from './TrophyShelf';

function Ring({ value, max, size = 92 }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${value} of ${max} tasks done today`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="url(#ring-grad)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 50 50)" className="ring-fill" />
      <defs><linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#facc15" /></linearGradient></defs>
      <text x="50" y="49" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">{value}/{max || 0}</text>
      <text x="50" y="66" textAnchor="middle" fontSize="10" fill="#94a3b8">today</text>
    </svg>
  );
}

/** Daily quests, today's ring, the streak and the treasure chest, all driven by finished work. */
export default function QuestBoard() {
  const { stats, refreshStats } = useFun();
  const [chest, setChest] = useState(false);
  const [shelf, setShelf] = useState(false);
  if (!stats) return null;
  const allDone = stats.quests.every((q) => q.done);

  return (
    <div className="glass-effect-enhanced rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-white">Today's quests 🗺️</h3>
          <p className="text-xs text-slate-400">Finish them for bonus XP. Resets every day.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShelf(true)} className="bg-transparent border-slate-600 text-slate-200 shrink-0"><Trophy className="w-4 h-4 mr-1" />Trophies</Button>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <Ring value={stats.completed_today} max={Math.max(stats.planned_today, stats.completed_today)} />
        <StreakFlame streak={stats.streak} shields={stats.shields} shieldUsed={stats.shield_used} atRisk={stats.at_risk} />
      </div>

      <ul className="space-y-2">
        {stats.quests.map((q) => (
          <li key={q.id} className={`rounded-xl border-2 border-slate-900 px-3 py-2 ${q.done ? 'bg-emerald-500/15' : 'bg-slate-800/60'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{q.emoji}</span>
              <span className={`font-semibold flex-1 ${q.done ? 'text-emerald-200 line-through decoration-2' : 'text-white'}`}>{q.title}</span>
              {q.done ? <span className="grid place-items-center w-6 h-6 rounded-full bg-emerald-400 text-slate-900"><Check className="w-4 h-4" /></span> : <span className="text-xs font-bold text-yellow-300">+{q.xp} XP</span>}
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-700 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300 transition-all duration-700" style={{ width: `${Math.round((q.progress / q.target) * 100)}%` }} /></div>
            <div className="text-[11px] text-slate-500 mt-0.5">{q.progress}/{q.target}</div>
          </li>
        ))}
      </ul>

      {allDone && <p className="text-center text-sm font-bold text-yellow-300">All quests complete! You are on fire today 🔥</p>}

      {stats.drop_state === 'ready' && (
        <Button onClick={() => setChest(true)} className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-extrabold chest-pulse">🎁 Open your treasure chest!</Button>
      )}
      {stats.drop_state === 'locked' && <p className="text-xs text-center text-slate-500">🎁 Finish a task today to unlock your treasure chest.</p>}
      {stats.drop_state === 'opened' && <p className="text-xs text-center text-slate-500">🎁 Today's chest is opened. A new one unlocks tomorrow!</p>}

      <ChestDialog open={chest} onOpenChange={setChest} today={format(new Date(), 'yyyy-MM-dd')} onOpened={refreshStats} />
      <TrophyShelf open={shelf} onOpenChange={setShelf} />
    </div>
  );
}
