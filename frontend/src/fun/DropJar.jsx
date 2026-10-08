import React, { useEffect, useState } from 'react';
import { Jar } from './DoneJar';
import { useFun } from './FunProvider';

/** Shown only while a task card is being dragged: the jar to drop it into. */
export default function DropJar() {
  const { stats } = useFun();
  const [dragging, setDragging] = useState(false);
  const [hot, setHot] = useState(false);
  useEffect(() => {
    const onFun = (e) => { if (e.detail?.type === 'taskDrag') { setDragging(e.detail.on); if (!e.detail.on) setHot(false); } };
    window.addEventListener('tasky:fun', onFun);
    return () => window.removeEventListener('tasky:fun', onFun);
  }, []);
  useEffect(() => {
    if (!dragging) return undefined;
    const move = (e) => {
      const r = document.getElementById('drop-jar')?.getBoundingClientRect();
      setHot(Boolean(r && e.clientX >= r.left - 20 && e.clientX <= r.right + 20 && e.clientY >= r.top - 20 && e.clientY <= r.bottom + 20));
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [dragging]);
  if (!dragging) return null;
  return (
    <div style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }} className="drop-jar fixed right-4 z-[120] pointer-events-none flex flex-col items-center drop-jar-in" aria-hidden="true">
      <div className="rounded-full bg-slate-900/90 border-2 border-slate-900 px-3 py-1 text-xs font-extrabold text-white mb-1">{hot ? 'Let go to finish it!' : 'Drop it in the jar!'}</div>
      <Jar id="drop-jar" count={stats?.completed_today || 0} hot={hot} className="w-28 h-36 sm:w-36 sm:h-44" />
    </div>
  );
}
