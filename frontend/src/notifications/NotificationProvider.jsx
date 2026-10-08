import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { getToken, request } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { emitFun } from '@/fun/bus';
import { Emoji, Rich } from '@/icons/Emoji';

const NotificationContext = createContext(null);
const TOAST_MS = 8000;
const TOAST_EMOJI = { weekly_allocation: '📬', task_assigned: '📦', task_updated: '✏️', task_removed: '💨', weekly_submitted: '📨', weekly_approved: '🏆', weekly_rejected: '🛠️', weekly_plan_saved: '🗓️', task_status: '✅' };

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [latest, setLatest] = useState(null); // most recent live notification, so pages can refresh themselves
  const seen = useRef(new Set());

  const refresh = useCallback(async () => {
    try {
      const list = await request('GET', '/api/notifications?limit=50');
      list.forEach((n) => seen.current.add(n.id));
      setItems(list);
    } catch {
      /* offline or signed out */
    }
  }, []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const handleIncoming = useCallback((n) => {
    if (seen.current.has(n.id)) return;
    seen.current.add(n.id);
    setItems((prev) => [n, ...prev].slice(0, 100));
    setLatest(n);
    emitFun({ type: 'notify', notification: n });
    setToasts((t) => [...t, n].slice(-4));
    setTimeout(() => dismissToast(n.id), TOAST_MS);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
      try {
        const desktop = new Notification(n.title, { body: n.message, tag: n.id });
        desktop.onclick = () => { window.focus(); if (n.link) navigate(n.link); };
      } catch {
        /* some browsers only allow notifications from a service worker */
      }
    }
  }, [dismissToast, navigate]);

  // Live stream (Server-Sent Events over fetch so the auth header can be sent) with automatic reconnect.
  useEffect(() => {
    if (!user) return undefined;
    let stopped = false;
    const ctl = new AbortController();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      let delay = 1000;
      while (!stopped) {
        try {
          const res = await fetch('/api/notifications/stream', { headers: { authorization: `Bearer ${getToken()}` }, signal: ctl.signal });
          if (res.status === 401) return;
          if (!res.ok || !res.body) throw new Error('stream unavailable');
          delay = 1000;
          await refresh(); // catch up on anything missed while disconnected
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let end;
            while ((end = buffer.indexOf('\n\n')) >= 0) {
              const line = buffer.slice(0, end).split('\n').find((l) => l.startsWith('data: '));
              buffer = buffer.slice(end + 2);
              if (line) handleIncoming(JSON.parse(line.slice(6)));
            }
          }
        } catch {
          if (stopped) return;
        }
        await sleep(delay);
        delay = Math.min(delay * 2, 30000);
      }
    })();

    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    refresh();
    return () => {
      stopped = true;
      ctl.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, refresh, handleIncoming]);

  const unread = items.filter((n) => !n.read).length;
  useEffect(() => {
    document.title = unread ? `(${unread}) TaskFlow` : 'TaskFlow';
  }, [unread]);

  const markRead = useCallback(async (ids) => {
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    try { await request('POST', '/api/notifications/read', { ids }); } catch { /* retried on next refresh */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await request('POST', '/api/notifications/read', { all: true }); } catch { /* retried on next refresh */ }
  }, []);

  const open = useCallback((n) => {
    if (!n.read) markRead([n.id]);
    dismissToast(n.id);
    if (n.link) navigate(n.link);
  }, [markRead, dismissToast, navigate]);

  const value = useMemo(() => ({ items, unread, latest, markRead, markAllRead, open, refresh }), [items, unread, latest, markRead, markAllRead, open, refresh]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }} className="fixed right-4 z-[100] flex flex-col gap-2 w-[22rem] max-w-[calc(100vw-2rem)]" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-comic animate-pop rounded-2xl border-[3px] border-slate-900 bg-slate-800 shadow-[4px_4px_0_rgba(0,0,0,.5)] p-3 pr-8 relative cursor-pointer" onClick={() => open(t)}>
            <button aria-label="Dismiss" className="absolute top-2 right-2 text-slate-400 hover:text-white" onClick={(e) => { e.stopPropagation(); dismissToast(t.id); }}>
              <X className="w-4 h-4" />
            </button>
            <div className="text-sm font-bold text-white"><Emoji e={TOAST_EMOJI[t.type] || '🔔'} className="mr-1.5" /><Rich text={t.title} /></div>
            {t.message && <div className="text-xs text-slate-300 mt-1 whitespace-pre-line line-clamp-4"><Rich text={t.message} /></div>}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
