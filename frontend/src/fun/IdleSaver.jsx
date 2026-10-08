import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useFun } from './FunProvider';
import SkyBackdrop from './SkyBackdrop';
import { hasWebGL } from './three/species';

const SaverStage = lazy(() => import('./three/SaverStage'));
const IDLE_MS = 5 * 60 * 1000;

/** After five quiet minutes the screen dims and the cast bounces around. Any key, click or movement brings the app back. */
export default function IdleSaver() {
  const { user } = useAuth();
  const { settings } = useFun();
  const [on, setOn] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!user || settings.saver === false || !settings.view3d || settings.anim !== 'full' || !hasWebGL()) return undefined;
    let t;
    const arm = () => { clearTimeout(t); t = setTimeout(() => { if (!document.hidden) setOn(true); }, IDLE_MS); };
    const wake = () => { setOn(false); arm(); };
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    window.addEventListener('pointermove', wake, { passive: true });
    const onFun = (e) => { if (e.detail?.type === 'saver') setOn(true); };
    window.addEventListener('tasky:fun', onFun);
    arm();
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, wake)); window.removeEventListener('pointermove', wake); window.removeEventListener('tasky:fun', onFun); };
  }, [user, settings.saver, settings.view3d, settings.anim]);
  useEffect(() => { if (!on) return undefined; const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, [on]);
  if (!on) return null;
  return (
    <div className="idle-saver" role="dialog" aria-label="Screensaver. Move the mouse or press a key to return.">
      <SkyBackdrop className="opacity-70" />
      <div className="idle-clock">
        <div className="text-6xl md:text-8xl font-extrabold text-white tabular-nums drop-shadow">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="text-lg text-slate-100">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <div className="text-sm text-slate-200 mt-2">Take a breath. Your tasks will be right here.</div>
      </div>
      <Suspense fallback={null}><SaverStage /></Suspense>
    </div>
  );
}
