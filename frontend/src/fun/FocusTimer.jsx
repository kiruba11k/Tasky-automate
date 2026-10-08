import React, { Suspense, lazy, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, Footprints, Pause, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DailyTask } from '@/entities/DailyTask';
import { emitFun } from './bus';
import { play } from './sounds';
import { useFun } from './FunProvider';
import { Emoji, Rich } from '@/icons/Emoji';
import { useBuddy } from './BuddyContext';
import { buddyFor, hasWebGL } from './three/species';

const Buddy3D = lazy(() => import('./three/Buddy3D'));
const RaceStage = lazy(() => import('./three/FocusStage').then((m) => ({ default: m.RaceStage })));
const CUES = ['Reach up high and breathe in', 'Roll your shoulders back', 'Look at something far away', 'Fold forward and let your arms hang', 'Shake out your hands'];

const KEY = 'tasky_focus';
const FocusContext = createContext(null);
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/** Pomodoro-style focus sessions tied to a task. Survives reloads; on finish it offers to log the time on the task. */
export function FocusProvider({ children }) {
  const { settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const loc = useLocation();
  const [mode, setModeState] = useState(() => { try { return localStorage.getItem('tasky_focus_mode') || 'study'; } catch { return 'study'; } });
  const setMode = (m) => { setModeState(m); try { localStorage.setItem('tasky_focus_mode', m); } catch { /* ignore */ } };
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } });
  const [now, setNow] = useState(Date.now());
  const [finished, setFinished] = useState(null);
  const [busy, setBusy] = useState(false);
  const doneRef = useRef(false);

  const persist = (s) => { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* ignore */ } };

  const start = useCallback((task, minutes) => {
    const s = { taskId: task.id, title: task.task, actual: task.actual_time_taken || 0, minutes, endsAt: Date.now() + minutes * 60000 };
    doneRef.current = false;
    persist(s);
    setSession(s);
    emitFun({ type: 'focus', on: true });
  }, []);

  const startBreak = useCallback((minutes = 5) => {
    const s = { kind: 'break', title: 'Stretch break', minutes, endsAt: Date.now() + minutes * 60000 };
    doneRef.current = false; persist(s); setSession(s); setFinished(null);
  }, []);

  const stop = useCallback(() => { persist(null); setSession(null); }, []);

  useEffect(() => {
    if (!session) return undefined;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (!doneRef.current && Date.now() >= session.endsAt) {
        doneRef.current = true;
        persist(null);
        setSession(null);
        if (session.kind === 'break') { play('ding', settings.sound); emitFun({ type: 'say', text: 'Break over. Refreshed? Back to it!', mood: 'cheer' }); return; }
        setFinished(session);
        play('fanfare', settings.sound);
        emitFun({ type: 'focus', on: false });
      }
    }, 500);
    return () => clearInterval(timer);
  }, [session, settings.sound]);

  const logTime = async () => {
    setBusy(true);
    try {
      await DailyTask.update(finished.taskId, { actual_time_taken: Math.round((finished.actual + finished.minutes / 60) * 100) / 100 });
    } catch (e) {
      console.error('Could not log focus time:', e);
    } finally {
      setBusy(false);
      setFinished(null);
    }
  };

  const value = useMemo(() => ({ session, start, stop, startBreak }), [session, start, stop, startBreak]);
  const page = loc.pathname.split('/').filter(Boolean)[0] || 'Dashboard';
  const species = buddyFor(page, pinned);
  const three = settings.view3d && hasWebGL();
  const isBreak = session?.kind === 'break';
  const total = session ? session.minutes * 60000 : 1;
  const pct = session ? Math.max(0, Math.min(1, 1 - (session.endsAt - now) / total)) : 0;
  const cue = CUES[Math.floor((now / 7000) % CUES.length)];
  return (
    <FocusContext.Provider value={value}>
      {children}
      {session && (
        <div style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }} className="focus-pill fixed left-1/2 z-[95] flex items-center gap-3 max-w-[calc(100vw-1rem)] rounded-3xl border-[3px] border-slate-900 bg-slate-800 pl-2 pr-4 py-2 shadow-[4px_4px_0_rgba(0,0,0,.5)] animate-pop-x" role="timer" aria-label={isBreak ? 'Break timer' : 'Focus timer'}>
          {three ? (
            <Suspense fallback={<div style={{ width: 84, height: 100 }} />}>
              {!isBreak && mode === 'race'
                ? <RaceStage species={species} equipped={equipped} pct={pct} calm={settings.anim === 'calm'} />
                : <Buddy3D species={species} pose={isBreak ? 'stretch' : 'study'} size={84} equipped={equipped} calm={settings.anim === 'calm'} />}
            </Suspense>
          ) : <Emoji e={isBreak ? '🧘' : '🍅'} size="1.6rem" />}
          <div className="leading-tight">
            <div className="font-mono text-lg font-extrabold text-white">{fmt(session.endsAt - now)}</div>
            <div className="text-[11px] text-slate-400 max-w-[11rem] truncate">{isBreak ? cue : session.title}</div>
            {!isBreak && (
              <div className="flex gap-1 mt-1" role="radiogroup" aria-label="Companion mode">
                <button type="button" role="radio" aria-checked={mode === 'study'} onClick={() => setMode('study')} title="Study together" className={`p-1 rounded-md ${mode === 'study' ? 'bg-emerald-400 text-ink' : 'bg-slate-700 text-slate-300'}`}><BookOpen className="w-3.5 h-3.5" /></button>
                <button type="button" role="radio" aria-checked={mode === 'race'} onClick={() => setMode('race')} title="Race together" className={`p-1 rounded-md ${mode === 'race' ? 'bg-emerald-400 text-ink' : 'bg-slate-700 text-slate-300'}`}><Footprints className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
          <button type="button" onClick={stop} aria-label={isBreak ? 'End break' : 'Stop focus session'} className="p-1.5 rounded-full bg-slate-700 text-slate-200 hover:text-white"><Pause className="w-4 h-4" /></button>
        </div>
      )}
      <Dialog open={!!finished} onOpenChange={(o) => !o && setFinished(null)}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white text-center">
          <div className="flex justify-center">
            {three ? <Suspense fallback={<div style={{ height: 150 }} />}><Buddy3D species={species} pose="stretch" size={130} equipped={equipped} calm={settings.anim === 'calm'} /></Suspense> : <Emoji e="🍅" size="4.5rem" />}
          </div>
          <DialogTitle className="text-xl font-extrabold">Focus session complete!</DialogTitle>
          <DialogDescription className="text-slate-300">{finished?.minutes} minutes on “{finished?.title}”. Your buddy is stretching, join in!</DialogDescription>
          <div className="flex gap-2 justify-center">
            <Button onClick={logTime} disabled={busy} className="bg-emerald-500 hover:bg-emerald-400 text-ink font-bold">{busy ? 'Logging…' : `Log ${finished?.minutes} min on the task`}</Button>
            <Button variant="outline" onClick={() => { startBreak(5); }} className="bg-transparent border-slate-600 text-slate-200">5-min stretch break</Button>
          </div>
        </DialogContent>
      </Dialog>
    </FocusContext.Provider>
  );
}

export const useFocus = () => useContext(FocusContext);

/** Small "Focus" control for a task card: pick 15 / 25 / 50 minutes. */
export function FocusButton({ task }) {
  const focus = useFocus();
  const [open, setOpen] = useState(false);
  if (!focus) return null;
  const active = focus.session?.taskId === task.id;
  return (
    <span className="relative inline-block">
      <Button size="sm" variant="outline" onClick={() => (active ? focus.stop() : setOpen((o) => !o))} className="h-7 px-2 bg-transparent border-slate-600 text-slate-200 rounded-full" title="Start a focus session">
        <Timer className="w-3.5 h-3.5 mr-1" />{active ? 'Stop' : 'Focus'}
      </Button>
      {open && (
        <span className="absolute z-20 left-0 mt-1 flex gap-1 rounded-xl border-2 border-slate-900 bg-slate-800 p-1.5 shadow-[3px_3px_0_rgba(0,0,0,.5)]">
          {[15, 25, 50].map((m) => <button key={m} type="button" onClick={() => { setOpen(false); focus.start(task, m); }} className="px-2 py-1 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-emerald-500 hover:text-ink">{m}m</button>)}
        </span>
      )}
    </span>
  );
}
