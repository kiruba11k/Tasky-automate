import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useFun } from '@/fun/FunProvider';
import { emitFun } from '@/fun/bus';
import { effects } from '@/fun/effects';
import { Jar } from '@/fun/DoneJar';
import { Panel, primary, subtle, today } from './ui';
import Soundscape from './Soundscape';

const GOAL = 8;
const key = (u) => `tasky_water_${u}_${today()}`;
const readWater = (u) => { try { return Number(localStorage.getItem(key(u))) || 0; } catch { return 0; } };

/** Water jar: tap each glass you drink. Reminders come from friendly birds, never pop-ups that block you. */
export function WaterJar() {
  const { user } = useAuth();
  const [n, setN] = useState(() => readWater(user?.id));
  const add = (d) => { const v = Math.max(0, Math.min(16, n + d)); setN(v); try { localStorage.setItem(key(user?.id), String(v)); } catch { /* ignore */ } if (d > 0 && v === GOAL) { effects.stars(); emitFun({ type: 'birdFlyby', banner: 'Fully hydrated!', style: 'loop' }); } };
  return (
    <Panel title="Water jar" hint={`Aim for about ${GOAL} glasses today.`}>
      <div className="flex items-center gap-4">
        <Jar id="water-jar" count={n} planned={GOAL} className="w-20 h-24 shrink-0" />
        <div>
          <div className="text-2xl font-extrabold text-white">{n}<span className="text-sm text-slate-400"> / {GOAL} glasses</span></div>
          <div className="flex flex-wrap gap-2 mt-2"><button type="button" onClick={() => add(1)} className={`${primary} whitespace-nowrap`}>I drank a glass</button><button type="button" onClick={() => add(-1)} disabled={!n} className={subtle}>Undo</button></div>
        </div>
      </div>
    </Panel>
  );
}

/** The wellness tab: water, calm sounds and eye-break settings. */
export default function Wellness() {
  const { settings, setSettings } = useFun();
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <WaterJar />
      <Panel title="Calm sounds" hint="Background sounds to help you focus. Nothing plays until you press a button."><Soundscape /></Panel>
      <Panel title="Gentle reminders" hint="Birds will remind you now and then. Never a blocking pop-up." className="lg:col-span-2">
        <label className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer"><input type="checkbox" checked={settings.wellness !== false} onChange={(e) => setSettings({ wellness: e.target.checked })} />Eye breaks (20-20-20: every 40 minutes, look 20 feet away for 20 seconds) and water reminders</label>
        <button type="button" onClick={() => emitFun({ type: 'eyeBreak' })} className={`${subtle} mt-3`}><Eye className="inline w-4 h-4 mr-1" />Try an eye break now</button>
      </Panel>
    </div>
  );
}

/** Mounted once for the whole app: after 40 active minutes a bird suggests an eye break; water reminders every 90 minutes. */
export function WellnessWatcher() {
  const { user } = useAuth();
  const { settings } = useFun();
  const [eye, setEye] = useState(0);
  const sRef = useRef(settings); sRef.current = settings;
  const stop = useCallback(() => setEye(0), []);
  useEffect(() => {
    if (!user) return undefined;
    let activeMin = 0; let lastActive = Date.now();
    const touch = () => { lastActive = Date.now(); };
    ['pointerdown', 'keydown'].forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const onFun = (e) => { if (e.detail?.type === 'eyeBreak') setEye(20); };
    window.addEventListener('tasky:fun', onFun);
    const t = setInterval(() => {
      if (document.hidden || Date.now() - lastActive > 120000 || sRef.current.wellness === false) return;
      activeMin += 1;
      if (activeMin % 40 === 0) { emitFun({ type: 'birdFlyby', banner: 'Eye break: look far away', style: 'cross' }); setTimeout(() => setEye(20), 6000); }
      else if (activeMin % 90 === 0 && readWater(user.id) < GOAL) emitFun({ type: 'birdFlyby', banner: 'Time for some water!', style: 'dive' });
    }, 60000);
    return () => { clearInterval(t); window.removeEventListener('tasky:fun', onFun); ['pointerdown', 'keydown'].forEach((e) => window.removeEventListener(e, touch)); };
  }, [user?.id]);
  useEffect(() => { if (!eye) return undefined; const id = setTimeout(() => setEye((s) => (s > 1 ? s - 1 : 0)), 1000); return () => clearTimeout(id); }, [eye]);
  if (!eye) return null;
  return (
    <div className="eye-break" role="status" aria-live="polite">
      <Eye className="w-8 h-8 text-sky-300 eye-blink" />
      <div className="font-extrabold text-white">Look at something 20 feet away</div>
      <div className="text-3xl font-extrabold text-sky-300 tabular-nums">{eye}</div>
      <button type="button" onClick={stop} className="text-xs underline text-slate-300">Skip</button>
    </div>
  );
}
