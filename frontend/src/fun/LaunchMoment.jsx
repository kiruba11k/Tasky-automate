import React, { useEffect, useState } from 'react';
import { effects } from './effects';
import { play } from './sounds';
import { useFun } from './FunProvider';
import { Emoji } from '@/icons/Emoji';

/** Full-screen countdown and rocket lift-off. Fire it with emitFun({ type: 'launch', name }). */
export default function LaunchMoment() {
  const { settings } = useFun();
  const [run, setRun] = useState(null);
  const [n, setN] = useState(3);
  useEffect(() => {
    const on = (e) => { if (e.detail?.type === 'launch') { setN(3); setRun({ id: Date.now(), name: e.detail.name || 'Launch' }); } };
    window.addEventListener('tasky:fun', on);
    return () => window.removeEventListener('tasky:fun', on);
  }, []);
  useEffect(() => {
    if (!run) return undefined;
    if (n > 0) { if (settings.sound) play('blip'); const t = setTimeout(() => setN(n - 1), 900); return () => clearTimeout(t); }
    if (settings.anim === 'full') effects.fireworks();
    const t = setTimeout(() => setRun(null), 3200);
    return () => clearTimeout(t);
  }, [run, n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!run) return null;
  return (
    <div className="fixed inset-0 z-[170] grid place-items-center bg-slate-950/85 text-center" role="dialog" aria-label={`${run.name} launch`} onClick={() => setRun(null)}>
      <div>
        <div className="text-sm font-extrabold tracking-[.3em] text-emerald-300">{run.name.toUpperCase()}</div>
        {n > 0 ? <div key={n} className="text-9xl font-black text-white animate-burst">{n}</div> : <div className="text-5xl font-black text-white mt-4">Lift-off!</div>}
        <div className={`mt-6 text-7xl ${n === 0 ? 'launch-rocket' : ''}`}><Emoji e="🚀" size="1em" /></div>
      </div>
    </div>
  );
}
