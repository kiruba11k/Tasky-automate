import React, { Suspense, lazy } from 'react';
import { useFun } from './FunProvider';
import { useBuddy } from './BuddyContext';
import { hasWebGL } from './three/species';
import { Emoji } from '@/icons/Emoji';

const Buddy3D = lazy(() => import('./three/Buddy3D'));

/** An empty inbox turns into a calm night scene: moon, twinkling stars, drifting clouds and a sleeping buddy. */
export default function CalmScene({ title = "You're all caught up.", hint = 'Nothing needs you right now. Enjoy the quiet.', species = 'cat', className = '' }) {
  const { settings } = useFun();
  const { equipped } = useBuddy();
  const three = settings.view3d && hasWebGL();
  return (
    <div className={`calm-scene ${className}`}>
      <div className="calm-moon" />
      {[...Array(14)].map((_, i) => <span key={i} className="calm-star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 55}%`, animationDelay: `${(i % 5) * 0.6}s` }} />)}
      <div className="calm-cloud c1" /><div className="calm-cloud c2" />
      <div className="calm-buddy">
        {three
          ? <Suspense fallback={null}><Buddy3D species={species} pose="sleep" size={92} equipped={equipped} calm={settings.anim === 'calm'} /></Suspense>
          : <Emoji e="🌙" size="3rem" />}
        <span className="calm-z z1">z</span><span className="calm-z z2">z</span>
      </div>
      <div className="calm-text"><div className="font-extrabold text-white">{title}</div><div className="text-xs text-slate-300">{hint}</div></div>
    </div>
  );
}
