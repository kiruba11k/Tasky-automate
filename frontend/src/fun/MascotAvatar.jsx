import React, { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import Mascot from './Mascot';
import { buddyFor, hasWebGL } from './three/species';
import { useBuddy } from './BuddyContext';

const Buddy3D = lazy(() => import('./three/Buddy3D'));
const POSE = { cheer: 'cheer', oops: 'scared', sleep: 'sleep', wave: 'wave', wink: 'wave' };

/** The corner buddy: a 3D character that changes with the page (or the one the user pinned); 2D Tasky when 3D is off or unsupported. */
export default function MascotAvatar({ mood, settings }) {
  const loc = useLocation();
  const { pinned, equipped } = useBuddy();
  const page = loc.pathname.split('/').filter(Boolean)[0] || 'Dashboard';
  if (!settings.view3d || !hasWebGL()) {
    return <Mascot mood={mood} size={76} className={mood === 'cheer' ? 'tasky-jump' : mood === 'oops' ? 'tasky-shake' : mood === 'sleep' ? '' : 'tasky-bob'} />;
  }
  return (
    <Suspense fallback={<div style={{ width: 96, height: 120 }} />}>
      <Buddy3D species={buddyFor(page, pinned)} equipped={equipped} pose={POSE[mood] || 'idle'} size={96} calm={settings.anim === 'calm'} />
    </Suspense>
  );
}
