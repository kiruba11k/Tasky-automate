import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useFun } from '@/fun/FunProvider';
import { emitFun } from '@/fun/bus';
import { effects } from '@/fun/effects';
import { Jar } from '@/fun/DoneJar';
import { Panel, primary, subtle, today } from './ui';
import Soundscape from './Soundscape';
import { useStore } from '@/internal/store';
import { GOAL, addGlass, countGlasses, undoGlass, withLocalCount } from './waterLogic';
import MoodQuest from './MoodQuest';

const localKey = (u) => `tasky_water_${u}_${today()}`; // where this device kept the count before it was saved on the profile

/** Water jar: tap each glass you drink (saved on your profile, so it follows you to every device). Reminders come from friendly birds, never pop-ups that block you. */
export function WaterJar() {
  const { user } = useAuth();
  const me = useStore((st) => st.me);
  const water = useStore((st) => st.profiles[st.me]?.water);
  const setProfile = useStore((st) => st.setProfile);
  const date = today();
  const n = countGlasses(water, date);
  // a count that only existed in this browser is brought in once
  useEffect(() => {
    try {
      const local = Number(localStorage.getItem(localKey(user?.id))) || 0;
      if (local > 0) { const merged = withLocalCount(water, date, local); if (countGlasses(merged, date) !== n) setProfile(me, { water: merged }); }
      localStorage.removeItem(localKey(user?.id));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);
  const add = (d) => {
    setProfile(me, { water: d > 0 ? addGlass(water, date) : undoGlass(water, date) });
    if (d > 0 && n + 1 === GOAL) { effects.stars(); emitFun({ type: 'birdFlyby', banner: 'Fully hydrated!', style: 'loop' }); }
  };
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

/** The wellness tab: water, calm sounds and the mood quest. */
export default function Wellness() {
  const { settings, setSettings } = useFun();
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <WaterJar />
      <Panel title="Calm sounds" hint="Background sounds to help you focus. Nothing plays until you press a button."><Soundscape /></Panel>
      <MoodQuest />
      <label className="lg:col-span-2 flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
        <input type="checkbox" checked={settings.wellness !== false} onChange={(e) => setSettings({ wellness: e.target.checked })} />
        A bird may suggest an eye break (every 40 minutes) or a glass of water now and then. Never a blocking pop-up.
      </label>
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
      else if (activeMin % 90 === 0 && countGlasses(useStore.getState().profiles[useStore.getState().me]?.water, today()) < GOAL) emitFun({ type: 'birdFlyby', banner: 'Time for some water!', style: 'dive' });
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
