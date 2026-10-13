import React, { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { emitFun } from '@/fun/bus';
import { effects } from '@/fun/effects';
import { Emoji } from '@/icons/Emoji';
import { Panel, primary, subtle, today } from './ui';
import { ALL, MAX_REROLLS, MOODS, addDays, pickChallenge, streakOf } from './moodQuestLogic';

// Mood quest: say how today feels, get one small silly (or kind) challenge to match, do it, and collect a sticker.
const keyOf = (u) => `tasky_mood_quest_${u}`;
const read = (u) => { try { return JSON.parse(localStorage.getItem(keyOf(u)) || 'null') || { days: {}, stickers: [] }; } catch { return { days: {}, stickers: [] }; } };

export default function MoodQuest() {
  const { user } = useAuth();
  const date = today();
  const [state, setState] = useState(() => read(user?.id));
  const day = state.days[date];
  const save = useCallback((next) => { setState(next); try { localStorage.setItem(keyOf(user?.id), JSON.stringify(next)); } catch { /* ignore */ } }, [user?.id]);

  const pickMood = (mood) => save({ ...state, days: { ...state.days, [date]: { mood, challenge: pickChallenge(mood)[0], rerolls: 0, done: false } } });
  const another = () => save({ ...state, days: { ...state.days, [date]: { ...day, challenge: pickChallenge(day.mood, day.challenge)[0], rerolls: day.rerolls + 1 } } });
  const finish = () => {
    const stickers = state.stickers.includes(day.challenge) ? state.stickers : [...state.stickers, day.challenge];
    save({ days: { ...state.days, [date]: { ...day, done: true } }, stickers });
    effects.stars();
    emitFun({ type: 'quest' });
  };
  const challenge = day ? ALL.find((c) => c[0] === day.challenge) : null;
  const streak = streakOf(state.days, date);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(date, i - 6)), [date]);

  return (
    <Panel title="Mood quest" hint="How does today feel? Get one small challenge to match, do it, and collect a sticker." className="lg:col-span-2">
      {!day && (
        <div role="group" aria-label="How do you feel today?" className="flex flex-wrap gap-2">
          {MOODS.map(([id, e, label]) => (
            <button key={id} type="button" onClick={() => pickMood(id)} className={`${subtle} flex items-center gap-2`}>
              <Emoji e={e} size="1.3rem" /> {label}
            </button>
          ))}
        </div>
      )}
      {day && challenge && (
        <div className={`rounded-2xl border-2 border-slate-900 p-4 ${day.done ? 'bg-emerald-500/20' : 'bg-slate-800/60'}`}>
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-slate-900 bg-slate-700"><Emoji e={challenge[1]} size="2rem" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Feeling {MOODS.find((m) => m[0] === day.mood)?.[2].toLowerCase()} · today's challenge</div>
              <p className="text-lg font-extrabold text-white">{challenge[2]}</p>
            </div>
          </div>
          {day.done ? (
            <p className="mt-3 text-sm font-bold text-emerald-300">Done! Sticker collected. Come back tomorrow for a new one.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={primary} onClick={finish}>I did it!</button>
              <button type="button" className={subtle} onClick={another} disabled={day.rerolls >= MAX_REROLLS}>Another one{day.rerolls > 0 ? ` (${MAX_REROLLS - day.rerolls} left)` : ''}</button>
              <button type="button" className={subtle} onClick={() => save({ ...state, days: Object.fromEntries(Object.entries(state.days).filter(([d]) => d !== date)) })}>Change my mood</button>
            </div>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Streak</div>
          <div className="text-2xl font-extrabold text-white">{streak}<span className="text-sm text-slate-400"> day{streak === 1 ? '' : 's'}</span></div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">This week</div>
          <div className="mt-1 flex gap-1.5" aria-label="Last seven days">
            {week.map((d) => {
              const rec = state.days[d];
              const mood = rec && MOODS.find((m) => m[0] === rec.mood);
              return <span key={d} title={rec ? `${d}: ${mood?.[2]}${rec.done ? ', challenge done' : ''}` : d} className={`grid h-8 w-8 place-items-center rounded-lg border-2 ${rec?.done ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-700 bg-slate-800/60'}`}>{rec ? <Emoji e={mood?.[1]} size="1rem" /> : <span className="text-xs text-slate-500">·</span>}</span>;
            })}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Stickers {state.stickers.length}/{ALL.length}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ALL.map(([id, e]) => (
              <span key={id} className={`grid h-8 w-8 place-items-center rounded-lg border-2 ${state.stickers.includes(id) ? 'border-yellow-400 bg-yellow-400/20' : 'border-dashed border-slate-700 text-slate-600'}`}>{state.stickers.includes(id) ? <Emoji e={e} size="1.1rem" /> : '?'}</span>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
