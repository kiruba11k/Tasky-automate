import React, { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import {
  Se as useStore,
  oe as clsx,
  Te as Button,
  Ge as INPUT_CLASS,
  $e as dayKey,
  lt as attempt,
  Ye as toast,
} from '@/internal/min';

/** Meetings tab: scheduling form (editors only) and the list of booked meetings. */
export function MeetingsPanel({ p, canEdit }) {
  const { addMeeting } = useStore();
  const [form, setForm] = useState({ company: '', contact: '', date: dayKey(1), time: '11:00' });
  return (
    <>
      {canEdit && (
        <form
          className="grid gap-2 rounded-2xl bg-surface-2 p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            attempt(() => addMeeting(p.id, form)) &&
              (toast({ title: `Meeting with ${form.company} scheduled`, tone: 'success' }),
              setForm({ ...form, company: '', contact: '' }));
          }}
        >
          <input
            className={clsx(INPUT_CLASS, 'text-ink')}
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <input
            className={clsx(INPUT_CLASS, 'text-ink')}
            placeholder="Contact (name, role)"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <input
            type="date"
            className={clsx(INPUT_CLASS, 'text-ink')}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input
            type="time"
            className={clsx(INPUT_CLASS, 'text-ink')}
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
          <Button type="submit">
            <CalendarPlus size={14} /> Schedule
          </Button>
        </form>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {p.meetings.length === 0 && <p className="text-sm text-muted">No meetings yet.</p>}
        {p.meetings.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
            <span className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
              <b className="text-sm leading-none">{new Date(m.date + 'T00:00').getDate()}</b>
              <span className="text-[10px] uppercase">
                {new Date(m.date + 'T00:00').toLocaleDateString(undefined, { month: 'short' })}
              </span>
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <b>{m.company}</b>
              <span className="block text-xs text-muted">
                {m.contact} · {m.time}
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default MeetingsPanel;
