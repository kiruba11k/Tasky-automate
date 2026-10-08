import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { useFun } from './FunProvider';
import { useBuddy } from './BuddyContext';
import { buddyFor, hasWebGL } from './three/species';
import { effects } from './effects';
import { play } from './sounds';
import { emitFun } from './bus';
import { Emoji } from '@/icons/Emoji';

const Buddy3D = lazy(() => import('./three/Buddy3D'));
const dayKey = () => new Date().toLocaleDateString('en-CA');

/**
 * The shape of the working day: a yawn-and-stretch wake-up in the morning, a Friday celebration, and an end-of-day pack-up.
 * Each shows once per day (per person), is easy to dismiss, and never blocks the app.
 */
export default function DayRhythm({ onParade }) {
  const { user } = useAuth();
  const { stats, settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const loc = useLocation();
  const [card, setCard] = useState(null); // { kind, pose, title, text }
  const statsRef = useRef(stats); statsRef.current = stats;
  const setRef = useRef(settings); setRef.current = settings;
  const key = user ? `tasky_rhythm_${user.id}` : null;

  const seen = (k) => { try { return JSON.parse(localStorage.getItem(key) || '{}')[k] === dayKey(); } catch { return false; } };
  const mark = (k) => { try { const o = JSON.parse(localStorage.getItem(key) || '{}'); o[k] = dayKey(); localStorage.setItem(key, JSON.stringify(o)); } catch { /* ignore */ } };

  const show = useCallback((kind) => {
    const st = statsRef.current || {};
    const first = (user?.full_name || '').split(' ')[0] || 'friend';
    const planned = st.planned_today || 0; const done = st.completed_today || 0;
    if (kind === 'wake') {
      setCard({ kind, pose: 'yawn', title: `Good morning, ${first}!`, text: planned ? `${planned} task${planned === 1 ? '' : 's'} on today's list. Stretch, sip some water, then let's go.` : 'Nothing planned yet. A calm start, or add a task to get going.' });
      setTimeout(() => setCard((c) => (c?.kind === 'wake' ? { ...c, pose: 'wave' } : c)), 3200);
      setTimeout(() => setCard((c) => (c?.kind === 'wake' ? null : c)), 11000);
    } else if (kind === 'friday') {
      setCard({ kind, pose: 'dance', title: "It's Friday!", text: 'The week is nearly in the bag. Take a bow, then see how the whole team did.', party: true });
      if (setRef.current.anim === 'full') { effects.fireworks(); play('fanfare', setRef.current.sound); }
    } else {
      setCard({ kind: 'pack', pose: 'pack', title: "That's a wrap!", text: `${planned ? `You finished ${done} of ${planned} planned task${planned === 1 ? '' : 's'} today.` : 'Thanks for today.'}${st.streak ? ` ${st.streak}-day streak.` : ''} Tidy up and switch off. See you tomorrow!` });
      if (setRef.current.anim === 'full') play('blip', setRef.current.sound);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const check = () => {
      if (document.hidden || !setRef.current.rhythm || !statsRef.current) return;
      const d = new Date(); const h = d.getHours(); const dow = d.getDay();
      if (dow === 5 && h >= 12 && h < 20 && !seen('friday')) { mark('friday'); mark('wake'); show('friday'); return; }
      const st = statsRef.current;
      if (h >= 16 && st.planned_today > 0 && st.completed_today >= st.planned_today && !seen('pack')) { mark('pack'); show('pack'); return; }
      if (h >= 17 && h < 23 && !seen('pack')) { mark('pack'); show('pack'); return; }
      if (h >= 5 && h < 12 && !seen('wake')) { mark('wake'); show('wake'); }
    };
    const first = setTimeout(check, 3000);
    const t = setInterval(check, 60000);
    const onFun = (e) => { if (e.detail?.type === 'rhythm') show(e.detail.which); };
    window.addEventListener('tasky:fun', onFun);
    return () => { clearTimeout(first); clearInterval(t); window.removeEventListener('tasky:fun', onFun); };
  }, [user, show]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!card || !setRef.current.rhythm) return null;
  const three = settings.view3d && hasWebGL();
  const page = loc.pathname.split('/').filter(Boolean)[0] || 'Dashboard';
  const species = buddyFor(page, pinned);
  const gear = card.kind === 'friday' ? { ...equipped, hat: equipped.hat || 'partyhat' } : equipped;
  return (
    <div className="rhythm-card" role="status" aria-live="polite">
      <div className="shrink-0">
        {three
          ? <Suspense fallback={<div style={{ width: 120, height: 150 }} />}><Buddy3D species={species} pose={card.pose} size={120} equipped={gear} calm={settings.anim === 'calm'} /></Suspense>
          : <Emoji e={card.kind === 'pack' ? '🎒' : card.kind === 'friday' ? '🎉' : '☀'} size="4rem" />}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-extrabold text-white">{card.title}</div>
        <p className="text-sm text-slate-200">{card.text}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {card.kind === 'friday' && <button type="button" onClick={() => { setCard(null); onParade?.(); }} className="rounded-lg border-2 border-slate-900 bg-yellow-300 px-3 py-1.5 text-sm font-extrabold text-ink">Watch the team parade</button>}
          <button type="button" onClick={() => setCard(null)} className="rounded-lg border-2 border-slate-900 bg-slate-700 px-3 py-1.5 text-sm font-bold text-white">{card.kind === 'pack' ? 'See you!' : card.kind === 'friday' ? 'Nice!' : "Let's go!"}</button>
        </div>
      </div>
    </div>
  );
}
