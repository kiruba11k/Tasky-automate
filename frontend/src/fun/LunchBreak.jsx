import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';
import { useFun } from './FunProvider';
import { useBuddy } from './BuddyContext';
import { buddyFor, hasWebGL } from './three/species';
import { emitFun } from './bus';
import { play } from './sounds';
import { Emoji } from '@/icons/Emoji';
import { useLocation } from 'react-router-dom';

const Buddy3D = lazy(() => import('./three/Buddy3D'));
const KEY = 'tasky_lunch';
const TIPS = ['Step away from the screen, the tasks will wait.', 'Water counts too. Drink some!', 'Chew slowly, enjoy it.', 'A short walk after lunch works wonders.', 'Nobody ever won an award for skipping lunch.'];
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/** Header button: pick 30 / 45 / 60 minutes and the whole app steps back for a lunch break. */
export function LunchButton() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Start a lunch break" title="Lunch break" className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"><Utensils className="w-4 h-4" /></button>
      {open && (
        <span className="absolute right-0 mt-1 z-50 flex gap-1 rounded-xl border-2 border-slate-900 bg-slate-800 p-1.5 shadow-[3px_3px_0_rgba(0,0,0,.5)]">
          {[30, 45, 60].map((m) => <button key={m} type="button" onClick={() => { setOpen(false); emitFun({ type: 'lunch', minutes: m }); }} className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-yellow-300 hover:text-ink whitespace-nowrap">{m} min</button>)}
        </span>
      )}
    </span>
  );
}

/** The lunch break pause screen: a calm full-screen scene with a buddy enjoying a sandwich and a countdown. */
export default function LunchBreak() {
  const { settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const loc = useLocation();
  const [lunch, setLunch] = useState(() => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.endsAt > Date.now() - 60000 ? v : null; } catch { return null; } });
  const [now, setNow] = useState(Date.now());
  const [over, setOver] = useState(false);
  const [tip, setTip] = useState(0);

  const save = (v) => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* ignore */ } };
  const start = useCallback((minutes) => { const v = { endsAt: Date.now() + minutes * 60000, minutes }; save(v); setLunch(v); setOver(false); play('blip', settings.sound); }, [settings.sound]);
  const end = useCallback(() => { save(null); setLunch(null); setOver(false); emitFun({ type: 'say', text: 'Welcome back! Fuelled and ready.', mood: 'cheer' }); }, []);

  useEffect(() => {
    const onFun = (e) => { if (e.detail?.type === 'lunch') start(e.detail.minutes || 45); };
    window.addEventListener('tasky:fun', onFun);
    return () => window.removeEventListener('tasky:fun', onFun);
  }, [start]);

  useEffect(() => {
    if (!lunch) return undefined;
    const t = setInterval(() => {
      setNow(Date.now());
      setTip((x) => (Math.floor(Date.now() / 12000) !== x ? Math.floor(Date.now() / 12000) : x));
      if (Date.now() >= lunch.endsAt && !over) { setOver(true); play('fanfare', settings.sound); }
    }, 500);
    return () => clearInterval(t);
  }, [lunch, over, settings.sound]);

  if (!lunch) return null;
  const page = loc.pathname.split('/').filter(Boolean)[0] || 'Dashboard';
  const species = buddyFor(page, pinned);
  const three = settings.view3d && hasWebGL();
  const left = lunch.endsAt - now;
  return (
    <div className="lunch-screen" role="dialog" aria-modal="true" aria-label="Lunch break">
      <div className="lunch-sun" />
      <div className="relative z-10 flex flex-col items-center text-center gap-2 px-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow">{over ? 'Lunch is over, welcome back!' : 'Lunch break'}</h2>
        <div className="relative">
          {three
            ? <Suspense fallback={<div style={{ width: 240, height: 300 }} />}><Buddy3D species={species} pose={over ? 'wave' : 'eat'} size={240} equipped={equipped} calm={settings.anim === 'calm'} /></Suspense>
            : <Emoji e="🥪" size="8rem" />}
          {!over && <><span className="steam s1" /><span className="steam s2" /><span className="steam s3" /></>}
        </div>
        {!over && <div className="font-mono text-5xl font-extrabold text-white drop-shadow" role="timer">{fmt(left)}</div>}
        <p className="text-slate-100 max-w-sm min-h-[3rem]">{over ? 'Hope it was tasty. Your tasks kept your seat warm.' : TIPS[tip % TIPS.length]}</p>
        <div className="flex gap-2 mt-1">
          {!over && <button type="button" onClick={() => { const v = { ...lunch, endsAt: lunch.endsAt + 10 * 60000 }; save(v); setLunch(v); }} className="rounded-xl border-2 border-slate-900 bg-slate-800 px-4 py-2 font-bold text-white">+10 min</button>}
          <button type="button" onClick={end} className="rounded-xl border-2 border-slate-900 bg-yellow-300 px-5 py-2 font-extrabold text-ink shadow-[3px_3px_0_rgba(0,0,0,.5)]">{over ? 'Back to work' : "I'm back"}</button>
        </div>
      </div>
    </div>
  );
}
