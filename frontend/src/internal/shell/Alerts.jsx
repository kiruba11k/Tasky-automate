import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { request } from '@/api/client';
import { Se as useStore } from '@/internal/min';
import { Emoji3D } from './Emoji3D';

/** Look of an alert, from what the notice says: [emoji, tone, animation]. */
export function look(n) {
  const t = String(n.text || '').toLowerCase();
  if (n.kind === 'deadline') {
    if (t.includes('passed its deadline') || t.includes('past its deadline')) return ['😬', 'late', 'shake'];
    if (t.includes('still waiting')) return ['🐌', 'late', 'wobble'];
    if (t.includes('minute')) return ['🏃', 'soon', 'dash'];
    return ['⏰', 'soon', 'ring'];
  }
  if (n.kind === 'chat') return ['💬', 'chat', 'pop'];
  if (t.includes('approved')) return ['✅', 'good', 'pop'];
  if (t.includes('sent back') || t.includes('changes') || t.includes('feedback')) return ['🔄', 'warn', 'wobble'];
  if (t.includes('review')) return ['👀', 'info', 'wobble'];
  if (t.includes('assigned') || t.includes('new task')) return ['🎯', 'info', 'pop'];
  return ['🔔', 'info', 'ring'];
}

const b64 = (s) => { const pad = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); };

/** Registers this device for desktop / phone push, so alerts arrive even when the tracker is closed. */
export async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { key } = await request('GET', '/api/push/key');
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
    }
    await request('POST', '/api/push/subscribe', { subscription: sub.toJSON() });
    return true;
  } catch { return false; }
}

const DISMISS = 'tracker_alerts_dismissed';

/** Asks (politely, once) to turn on desktop alerts, then keeps this device registered. */
function DesktopPrompt() {
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(DISMISS) === '1'; } catch { return false; } });
  useEffect(() => { if (perm === 'granted') enablePush(); }, [perm]);
  if (perm !== 'default' || hidden) return null;
  const turnOn = async () => { const p = await Notification.requestPermission(); setPerm(p); };
  const later = () => { try { localStorage.setItem(DISMISS, '1'); } catch { /* ignore */ } setHidden(true); };
  return (
    <div className="nt-prompt" role="dialog" aria-label="Desktop alerts">
      <Emoji3D e="🔔" size="2.2rem" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Get desktop alerts?</p>
        <p className="text-xs text-muted">New tasks, approvals and deadline reminders, even when this tab is closed.</p>
      </div>
      <button className="focus-ring rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-on" onClick={turnOn}>Turn on</button>
      <button className="focus-ring rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Not now" onClick={later}><X size={14} /></button>
    </div>
  );
}

/** Cute animated cards for every new notice addressed to me; also a desktop notification when the tab is in the background. */
function Toasts() {
  const [cards, setCards] = useState([]);
  const seen = useRef(null);
  useEffect(() => {
    const check = (state) => {
      const mine = state.notices.filter((n) => n.to === state.me && !n.read);
      if (seen.current === null) { seen.current = new Set(state.notices.map((n) => n.id)); return; }
      const fresh = mine.filter((n) => !seen.current.has(n.id));
      state.notices.forEach((n) => seen.current.add(n.id));
      if (!fresh.length) return;
      setCards((c) => [...c, ...fresh.map((n) => ({ ...n, k: n.id }))].slice(-3));
      fresh.forEach((n) => {
        if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try { new Notification(n.kind === 'deadline' ? '⏰ Deadline' : n.kind === 'chat' ? '💬 New message' : '📋 Tasks', { body: n.text, tag: n.id, icon: '/logo.jpg' }); } catch { /* some browsers need the service worker */ }
        }
        setTimeout(() => setCards((c) => c.filter((x) => x.k !== n.id)), 7500);
      });
    };
    check(useStore.getState());
    return useStore.subscribe((s, prev) => { if (s.notices !== prev.notices) check(s); });
  }, []);
  if (!cards.length) return null;
  return (
    <div className="nt-stack" aria-live="polite">
      {cards.map((n) => {
        const [emoji, tone, anim] = look(n);
        return (
          <div key={n.k} className={`nt-card nt-${tone}`} role="status">
            <span className={`nt-emoji nt-${anim}`}><Emoji3D e={emoji} size="2.6rem" /></span>
            <p className="min-w-0 flex-1 text-sm font-semibold">{n.text}</p>
            <button className="focus-ring rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Dismiss" onClick={() => setCards((c) => c.filter((x) => x.k !== n.k))}><X size={14} /></button>
            <span className="nt-bar" />
          </div>
        );
      })}
    </div>
  );
}

export function Alerts() {
  return (
    <>
      <Toasts />
      <DesktopPrompt />
    </>
  );
}

export default Alerts;
