import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useFun } from './FunProvider';
import { useBuddy, speciesFor } from './BuddyContext';
import { loadTeam } from './team';
import { effects } from './effects';
import { play } from './sounds';
import { hasWebGL } from './three/species';

const HighFiveStage = lazy(() => import('./three/HighFiveStage'));

/** When a teammate cheers someone on (you, or you cheering them), the two buddies meet in the middle and high-five. */
export default function HighFive() {
  const { user } = useAuth();
  const { settings } = useFun();
  const me = useBuddy();
  const [scene, setScene] = useState(null);
  const last = useRef(0);
  const meRef = useRef(me); meRef.current = me;
  const sRef = useRef(settings); sRef.current = settings;

  useEffect(() => {
    const show = async (fromId, toId, fromName) => {
      const s = sRef.current;
      if (s.anim !== 'full' || !s.view3d || !hasWebGL() || Date.now() - last.current < 7000) return;
      last.current = Date.now();
      const rows = await loadTeam();
      const find = (id, name) => rows.find((r) => (id && r.id === id) || (name && r.name === name));
      const m = { id: user.id, name: user.full_name, buddy: meRef.current.pinned === 'auto' ? null : meRef.current.pinned, equipped: meRef.current.equipped };
      const A = fromId === user.id ? m : find(fromId, fromName) || { id: 'a', name: fromName };
      const B = toId === user.id ? m : find(toId) || { id: 'b' };
      const mk = (x) => ({ species: speciesFor(x), equipped: x.equipped, name: x.name });
      const id = Date.now();
      setScene({ id, a: mk(A), b: mk(B) });
      setTimeout(() => { play('ding', s.sound); effects.stars(); }, 1250);
      setTimeout(() => setScene((cur) => (cur?.id === id ? null : cur)), 4300);
    };
    const onFun = (e) => {
      const d = e.detail || {};
      if (d.type === 'kudosSent' && d.to_user_id) show(user.id, d.to_user_id);
      else if (d.type === 'notify' && d.notification?.type === 'kudos') show(null, user.id, d.notification.actor_name);
    };
    window.addEventListener('tasky:fun', onFun);
    return () => window.removeEventListener('tasky:fun', onFun);
  }, [user]);

  if (!scene) return null;
  return (
    <div className="fixed left-0 right-0 bottom-0 z-[149] pointer-events-none" style={{ height: 190 }} aria-hidden="true">
      <Suspense fallback={null}><HighFiveStage key={scene.id} a={scene.a} b={scene.b} /></Suspense>
      <div className="highfive-word" key={`w${scene.id}`}>HIGH FIVE!</div>
      <div className="highfive-names" key={`n${scene.id}`}><span>{scene.a.name}</span><span>{scene.b.name}</span></div>
    </div>
  );
}
