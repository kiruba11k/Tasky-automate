import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFun } from './FunProvider';
import { festivalOn } from './festivals';
import { effects } from './effects';
import { emitFun } from './bus';
import { Emoji } from '@/icons/Emoji';

/** On a festival day: a dismissible ribbon, one confetti burst and one bird banner (once per festival per day). */
export default function Festival() {
  const { settings } = useFun();
  const f = festivalOn();
  const key = f ? `tasky_festival_${f.id}_${new Date().getFullYear()}` : '';
  const [shown, setShown] = useState(() => { try { return f && sessionStorage.getItem(key) !== 'x'; } catch { return Boolean(f); } });
  useEffect(() => {
    if (!f || settings.festival === false) return undefined;
    let seen = false;
    try { seen = localStorage.getItem(key) === new Date().toDateString(); } catch { /* ignore */ }
    if (seen) return undefined;
    const t = setTimeout(() => {
      try { localStorage.setItem(key, new Date().toDateString()); } catch { /* ignore */ }
      if (settings.anim === 'full') { effects.big(); emitFun({ type: 'birdFlyby', banner: f.greet, style: 'cross' }); }
    }, 3500);
    return () => clearTimeout(t);
  }, [f?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!f || settings.festival === false || !shown) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[80] pointer-events-none flex justify-center px-3" role="status">
      <div className="pointer-events-auto -mt-1 rounded-b-2xl border-2 border-t-0 border-slate-900 px-4 py-1.5 text-sm font-extrabold text-ink shadow-[0_3px_0_rgba(0,0,0,.4)] flex items-center gap-2" style={{ background: f.hue }}>
        <Emoji e={f.icon} /> {f.greet}
        <button type="button" aria-label="Hide festival ribbon" className="ml-1 rounded-full p-0.5 hover:bg-black/10" onClick={() => { setShown(false); try { sessionStorage.setItem(key, 'x'); } catch { /* ignore */ } }}><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
