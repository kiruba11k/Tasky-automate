import { useEffect } from 'react';
import { getToken } from '@/api/client';
import { emitFun } from '@/fun/bus';
import { useStore } from '../store';

/**
 * Connects the tracker to the fun layer. The fun layer reacts to events (confetti when work is approved, a bird when
 * someone sends one, "new task!" when something is assigned to you). The tracker store has no such events, so this watches
 * it and sends them. It starts after the first load, so nothing fires for what was already there.
 */
export function FunBridge() {
  useEffect(() => {
    let prev = useStore.getState().tasks;
    return useStore.subscribe((state) => {
      const tasks = state.tasks;
      if (tasks === prev) return;
      const me = state.me;
      const before = new Map(prev.map((t) => [t.id, t]));
      for (const t of tasks) {
        const was = before.get(t.id);
        if (!was) {
          if (t.assigneeId === me && t.assignedById !== me) emitFun({ type: 'notify', notification: { type: 'task_assigned' } });
          else if (t.assignedById === me) emitFun({ type: 'entity', entity: 'DailyTask', action: 'create' });
          continue;
        }
        if (was.status === t.status) continue;
        if (t.assigneeId === me) {
          if (t.status === 'in_progress' && was.status === 'todo') emitFun({ type: 'entity', entity: 'DailyTask', action: 'update', patch: { task_status: 'In Progress' } });
          else if (t.status === 'in_review') emitFun({ type: 'weekly', action: 'submit' });
          else if (t.status === 'done') emitFun({ type: 'notify', notification: { type: 'weekly_approved' } });
          else if (t.status === 'changes') emitFun({ type: 'notify', notification: { type: 'weekly_rejected' } });
        } else if (t.reviewerId === me) {
          if (t.status === 'in_review') emitFun({ type: 'notify', notification: { type: 'weekly_submitted' } });
          else if (t.status === 'done') emitFun({ type: 'weekly', action: 'approve' });
          else if (t.status === 'changes') emitFun({ type: 'weekly', action: 'reject' });
        }
      }
      prev = tasks;
    });
  }, []);

  // Anonymous birds arrive over the notification stream as a bare signal; pass them on so the bird flies in.
  useEffect(() => {
    let stopped = false;
    const ctl = new AbortController();
    (async () => {
      while (!stopped) {
        try {
          const res = await fetch('/api/notifications/stream', { headers: { authorization: `Bearer ${getToken()}` }, signal: ctl.signal });
          if (!res.ok || !res.body) throw new Error('stream unavailable');
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop();
            for (const part of parts) {
              const line = part.split('\n').find((l) => l.startsWith('data: '));
              try { if (line && JSON.parse(line.slice(6)).__bird) emitFun({ type: 'bird' }); } catch { /* not a bird */ }
            }
          }
        } catch { /* reconnect below */ }
        if (!stopped) await new Promise((r) => setTimeout(r, 3000));
      }
    })();
    return () => { stopped = true; ctl.abort(); };
  }, []);
  return null;
}

export default FunBridge;
