import React, { useState } from 'react';
import { CalendarPlus, Pencil, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../kit/ConfirmModal';
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
  const { addMeeting, updateMeeting, removeMeeting } = useStore();
  const blank = { company: '', contact: '', date: dayKey(1), time: '11:00' };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [removing, setRemoving] = useState(null);
  return (
    <>
      {canEdit && (
        <form
          className="grid gap-2 rounded-2xl bg-surface-2 p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (editingId) {
              attempt(() => updateMeeting(p.id, editingId, form)) &&
                (toast({ title: `Meeting with ${form.company} updated`, tone: 'success' }), setEditingId(null), setForm(blank));
              return;
            }
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
          <div className="flex gap-1">
            <Button type="submit">
              <CalendarPlus size={14} /> {editingId ? 'Save' : 'Schedule'}
            </Button>
            {editingId && (
              <Button type="button" tone="ghost" aria-label="Cancel editing" onClick={() => { setEditingId(null); setForm(blank); }}>
                <X size={14} />
              </Button>
            )}
          </div>
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
            {canEdit && (
              <span className="flex shrink-0 gap-1">
                <Button tone="ghost" aria-label={`Edit meeting with ${m.company}`} onClick={() => { setEditingId(m.id); setForm({ company: m.company, contact: m.contact, date: m.date, time: m.time }); }}>
                  <Pencil size={13} />
                </Button>
                <Button tone="ghost" aria-label={`Delete meeting with ${m.company}`} onClick={() => setRemoving(m)}>
                  <Trash2 size={13} />
                </Button>
              </span>
            )}
          </div>
        ))}
      </div>
      <ConfirmModal
        open={!!removing}
        title="Delete this meeting?"
        message={removing ? `The meeting with ${removing.company} will be removed.` : ''}
        onClose={() => setRemoving(null)}
        onConfirm={() => attempt(() => removeMeeting(p.id, removing.id)) && toast({ title: 'Meeting deleted', tone: 'info' })}
      />
    </>
  );
}

export default MeetingsPanel;
