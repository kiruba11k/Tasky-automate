import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DailyTask } from '@/entities/DailyTask';
import { emitFun } from './bus';
import { play } from './sounds';
import { useFun } from './FunProvider';

const KEY = 'tasky_focus';
const FocusContext = createContext(null);
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/** Pomodoro-style focus sessions tied to a task. Survives reloads; on finish it offers to log the time on the task. */
export function FocusProvider({ children }) {
  const { settings } = useFun();
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

  const stop = useCallback(() => { persist(null); setSession(null); }, []);

  useEffect(() => {
    if (!session) return undefined;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (!doneRef.current && Date.now() >= session.endsAt) {
        doneRef.current = true;
        persist(null);
        setFinished(session);
        setSession(null);
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

  const value = useMemo(() => ({ session, start, stop }), [session, start, stop]);
  return (
    <FocusContext.Provider value={value}>
      {children}
      {session && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-3 rounded-full border-[3px] border-slate-900 bg-slate-800 px-4 py-2 shadow-[4px_4px_0_rgba(0,0,0,.5)] animate-pop" role="timer" aria-label="Focus timer">
          <span className="text-xl" aria-hidden="true">🍅</span>
          <div className="leading-tight"><div className="font-mono text-lg font-extrabold text-white">{fmt(session.endsAt - now)}</div><div className="text-[11px] text-slate-400 max-w-[11rem] truncate">{session.title}</div></div>
          <button type="button" onClick={stop} aria-label="Stop focus session" className="p-1.5 rounded-full bg-slate-700 text-slate-200 hover:text-white"><Pause className="w-4 h-4" /></button>
        </div>
      )}
      <Dialog open={!!finished} onOpenChange={(o) => !o && setFinished(null)}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white text-center">
          <div className="text-6xl" aria-hidden="true">🍅</div>
          <DialogTitle className="text-xl font-extrabold">Focus session complete!</DialogTitle>
          <DialogDescription className="text-slate-300">{finished?.minutes} minutes on “{finished?.title}”. Take a quick stretch 🧘</DialogDescription>
          <div className="flex gap-2 justify-center">
            <Button onClick={logTime} disabled={busy} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold">{busy ? 'Logging…' : `Log ${finished?.minutes} min on the task`}</Button>
            <Button variant="outline" onClick={() => setFinished(null)} className="bg-transparent border-slate-600 text-slate-200">Skip</Button>
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
          {[15, 25, 50].map((m) => <button key={m} type="button" onClick={() => { setOpen(false); focus.start(task, m); }} className="px-2 py-1 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-emerald-500 hover:text-slate-900">{m}m</button>)}
        </span>
      )}
    </span>
  );
}
