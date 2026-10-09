import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useFun } from './FunProvider';
import { useBuddy } from './BuddyContext';
import { buddyFor, hasWebGL } from './three/species';

const Buddy3D = lazy(() => import('./three/Buddy3D'));

/** Optional: a tiny buddy that trails your mouse pointer, running when you move and sitting down when you stop. */
export default function CursorPal() {
  const { settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const loc = useLocation();
  const box = useRef(null);
  const [moving, setMoving] = useState(false);
  const enabled = settings.pal && settings.view3d && settings.anim === 'full' && hasWebGL() && typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
  useEffect(() => {
    if (!enabled) return undefined;
    const pos = { x: -200, y: -200, tx: -200, ty: -200 }; let raf; let idle; let wasMoving = false;
    const move = (e) => { pos.tx = e.clientX + 26; pos.ty = e.clientY + 18; if (pos.x < 0) { pos.x = pos.tx; pos.y = pos.ty; } clearTimeout(idle); idle = setTimeout(() => { wasMoving = false; setMoving(false); }, 350); if (!wasMoving) { wasMoving = true; setMoving(true); } };
    const tick = () => { pos.x += (pos.tx - pos.x) * 0.12; pos.y += (pos.ty - pos.y) * 0.12; if (box.current) box.current.style.transform = `translate(${pos.x - 36}px, ${pos.y - 60}px)`; raf = requestAnimationFrame(tick); };
    window.addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); clearTimeout(idle); };
  }, [enabled]);
  if (!enabled) return null;
  const species = buddyFor(loc.pathname.split('/').filter(Boolean)[0] || 'Dashboard', pinned);
  return (
    <div ref={box} className="cursor-pal" aria-hidden="true">
      <Suspense fallback={null}><Buddy3D species={species} pose={moving ? 'run' : 'idle'} size={72} equipped={equipped} spin={0.9} /></Suspense>
    </div>
  );
}
