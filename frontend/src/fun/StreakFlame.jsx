import React from 'react';

/**
 * Working-day streak. Positive framing only: a missed streak just says "start a new one", and shields quietly protect a missed day.
 */
export default function StreakFlame({ streak = 0, shields = 0, shieldUsed = false, atRisk = false }) {
  const size = 26 + Math.min(streak, 30) * 1.1;
  const evening = new Date().getHours() >= 12;
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid place-items-center" style={{ width: 56, height: 56 }} aria-hidden="true">
        <span className={streak > 0 ? 'flame' : 'opacity-40 grayscale'} style={{ fontSize: size, lineHeight: 1 }}>🔥</span>
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-white leading-none">{streak} <span className="text-sm font-semibold text-slate-300">day streak</span></div>
        <div className="text-xs mt-1 text-slate-400">
          {streak === 0 && 'Finish a task today to start a new streak!'}
          {streak > 0 && atRisk && evening && <span className="text-orange-300 font-semibold animate-pulse">Finish a task today to keep it going ⏳</span>}
          {streak > 0 && atRisk && !evening && 'Finish a task today to keep it going'}
          {streak > 0 && !atRisk && shieldUsed && <span className="text-sky-300">A shield saved your streak 🛡️</span>}
          {streak > 0 && !atRisk && !shieldUsed && 'Nice! Today is already counted'}
        </div>
        <div className="flex gap-1 mt-1" title="Every 5 days of streak earns a shield that covers one missed working day (max 2). Weekends never count against you.">
          {[0, 1].map((i) => <span key={i} className={`text-sm ${i < shields ? '' : 'opacity-25 grayscale'}`}>🛡️</span>)}
          <span className="text-[11px] text-slate-500 ml-1">{shields} shield{shields === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
