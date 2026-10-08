import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Cat, Mouse } from './chase/Critters';
import { useFun } from './FunProvider';

/** A thin bar across the top of the screen while anything is loading or saving, with the mouse running and the cat in pursuit. */
export default function BusyRunner() {
  const { settings } = useFun();
  const [on, setOn] = useState(false);
  const count = useRef(0); const showT = useRef(null); const hideT = useRef(null);
  const { pathname } = useLocation();

  const bump = (d) => {
    count.current = Math.max(0, count.current + d);
    if (count.current > 0) { clearTimeout(hideT.current); if (!on && !showT.current) showT.current = setTimeout(() => { showT.current = null; if (count.current > 0) setOn(true); }, 280); }
    else { clearTimeout(showT.current); showT.current = null; clearTimeout(hideT.current); hideT.current = setTimeout(() => setOn(false), 500); }
  };
  useEffect(() => {
    const h = (e) => { if (e.detail?.type === 'busy') bump(e.detail.on ? 1 : -1); };
    window.addEventListener('tasky:fun', h);
    return () => window.removeEventListener('tasky:fun', h);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bump(1); const t = setTimeout(() => bump(-1), 650); return () => clearTimeout(t); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!on || settings.anim !== 'full') return null;
  return (
    <div className="busy-runner" role="progressbar" aria-label="Working" aria-busy="true">
      <div className="busy-bar" />
      <div className="busy-chase"><Cat pose="run" size={26} /><Mouse pose="run" size={16} /></div>
    </div>
  );
}
