import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useFun } from './FunProvider';
import { useBuddy } from './BuddyContext';
import { buddyFor, hasWebGL } from './three/species';
import { play } from './sounds';

const LevelStage = lazy(() => import('./three/LevelStage'));

/** A short podium moment when you reach a new level. */
export default function LevelUp() {
  const { settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const loc = useLocation();
  const [lv, setLv] = useState(null);
  useEffect(() => {
    let t;
    const on = (e) => {
      if (e.detail?.type !== 'levelUpShow' || settings.anim !== 'full') return;
      setLv({ level: e.detail.level, title: e.detail.title, id: Date.now() });
      clearTimeout(t); t = setTimeout(() => setLv(null), e.detail.hold || 6500);
    };
    window.addEventListener('tasky:fun', on);
    return () => { window.removeEventListener('tasky:fun', on); clearTimeout(t); };
  }, [settings.anim]);
  useEffect(() => { if (lv) play('levelUp', settings.sound); }, [lv?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lv) return null;
  const species = buddyFor(loc.pathname.split('/').filter(Boolean)[0] || 'Dashboard', pinned);
  const three = settings.view3d && hasWebGL();
  return (
    <div className="levelup-overlay" role="status" onClick={() => setLv(null)}>
      <div className="levelup-card">
        <div className="levelup-rays" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-sm font-extrabold tracking-[.3em] text-yellow-300">LEVEL UP</div>
          <div className="levelup-num">{lv.level}</div>
          {three && <Suspense fallback={<div style={{ height: 260 }} />}><LevelStage species={species} equipped={equipped} calm={settings.anim === 'calm'} /></Suspense>}
          <div className="text-lg font-extrabold text-white -mt-2">{lv.title}</div>
          <div className="text-xs text-slate-300 mt-1">Tap to keep going</div>
        </div>
      </div>
    </div>
  );
}
