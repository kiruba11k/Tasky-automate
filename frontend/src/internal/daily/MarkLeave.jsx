import { useState } from 'react';
import { CalendarOff } from 'lucide-react';
import { Se as useStore, Te as Button, lt as guarded, Ye as toast } from '@/internal/min';
import { leaveLabel, leaveOn } from '../lib/leave.js';
import { nextWorkingDay, reschedulableTasks } from '../lib/moveRows.js';
import { Popover } from './DateMenu';
import { formatShortDate } from './dateHelpers';
import { moveWork } from './moveActions';

const KINDS = [
  { id: 'full', label: 'Full day leave' },
  { id: 'half', label: 'Half day leave' },
  { id: 'holiday', label: 'Holiday' },
];
const FIELD = 'focus-ring mt-1 block w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink';

/** What is on a day that could move: the saved rows (when the day was not sent) and the open tasks given to or by the person. */
function dayWorkOf(state, personId, date) {
  const record = state.daily[`${personId}|${date}`];
  const rows = record && !record.eodAt ? (record.entries ?? []).length : 0;
  const tasks = reschedulableTasks(state.tasks, personId, date, state.me).map((t) => t.id);
  return { rows, tasks };
}

/**
 * "Mark as leave / holiday" for the picked day: a popover with the kind and a note, saved on the profile's leaves. When the day
 * already holds work, one click moves it to the next working day (rows are moved, assigned tasks are rescheduled).
 */
export function MarkLeave({ personId, date }) {
  const profiles = useStore((s) => s.profiles);
  const setProfile = useStore((s) => s.setProfile);
  const leave = leaveOn(profiles, personId, date);
  const [kind, setKind] = useState('holiday');
  const [note, setNote] = useState('');
  const [asking, setAsking] = useState(false);
  // re-read when the popover opens so the form shows what is saved for the day
  const load = () => {
    const l = leaveOn(useStore.getState().profiles, personId, date);
    setKind(l?.kind ?? 'holiday');
    setNote(l?.note ?? '');
    setAsking(false);
  };
  const save = (close) => {
    const kept = (profiles[personId]?.leaves ?? []).filter((l) => l.date !== date);
    setProfile(personId, { leaves: [...kept, { date, kind, note: note.trim() || undefined }] });
    toast({ title: `${KINDS.find((k) => k.id === kind).label} saved for ${formatShortDate(date)}`, tone: 'success' });
    if (!dayWorkOf(useStore.getState(), personId, date).rows && !dayWorkOf(useStore.getState(), personId, date).tasks.length) close();
  };
  const clear = (close) => {
    setProfile(personId, { leaves: (profiles[personId]?.leaves ?? []).filter((l) => l.date !== date) });
    toast({ title: `Marker removed from ${formatShortDate(date)}`, tone: 'info' });
    close();
  };
  const moveAll = (close) =>
    guarded(() => {
      const st = useStore.getState();
      const work = dayWorkOf(st, personId, date);
      const to = nextWorkingDay(st.profiles, personId, date);
      moveWork({ personId, from: date, to, ids: work.rows ? undefined : [], taskIds: work.tasks });
      close();
    });
  return (
    <Popover
      title="Mark as leave / holiday"
      testId="mark-leave-popover"
      onOpen={load}
      trigger={({ onClick }) => (
        <button
          type="button"
          data-testid="mark-leave"
          onClick={onClick}
          className="focus-ring flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-lavender-ink hover:bg-surface-2"
        >
          <CalendarOff size={15} /> {leave ? leaveLabel(leave) : 'Mark as leave / holiday'}
        </button>
      )}
    >
      {(close) => {
        const st = useStore.getState();
        const work = dayWorkOf(st, personId, date);
        const has = work.rows > 0 || work.tasks.length > 0;
        const to = nextWorkingDay(profiles, personId, date);
        return (
          <>
            <p className="mt-1 text-xs text-muted">{formatShortDate(date)}. Managers see this instead of a missing update.</p>
            <label className="mt-2 block text-xs font-semibold text-muted">
              Kind
              <select aria-label="Leave kind" className={FIELD} value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-xs font-semibold text-muted">
              Note (optional)
              <input aria-label="Leave note" className={FIELD} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Diwali" />
            </label>
            <div className="mt-3 flex items-center justify-between gap-2">
              {leave ? (
                <button type="button" className="focus-ring rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-coral-ink hover:bg-surface-2" onClick={() => clear(close)}>
                  Remove
                </button>
              ) : (
                <span />
              )}
              <Button data-testid="save-leave" onClick={() => save(close)}>
                Save
              </Button>
            </div>
            {leave && has && (
              <div className="mt-3 border-t border-line pt-3" data-testid="move-work-box">
                {asking ? (
                  <p className="text-xs">
                    Move {work.rows ? `${work.rows} row${work.rows === 1 ? '' : 's'}` : ''}
                    {work.rows && work.tasks.length ? ' and ' : ''}
                    {work.tasks.length ? `${work.tasks.length} task${work.tasks.length === 1 ? '' : 's'}` : ''} to {formatShortDate(to)}?
                    <span className="mt-2 flex gap-2">
                      <button type="button" data-testid="move-work-yes" className="focus-ring rounded-full border border-line px-3 py-0.5 font-semibold text-accent-ink hover:bg-surface-2" onClick={() => moveAll(close)}>
                        Yes, move
                      </button>
                      <button type="button" className="focus-ring rounded-full border border-line px-3 py-0.5 font-semibold hover:bg-surface-2" onClick={() => setAsking(false)}>
                        No
                      </button>
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    data-testid="move-work"
                    className="focus-ring rounded-full border border-line px-3 py-1 text-xs font-semibold text-accent-ink hover:bg-surface-2"
                    onClick={() => setAsking(true)}
                  >
                    Move today's work to the next working day
                  </button>
                )}
              </div>
            )}
            {!leave && has && <p className="mt-2 text-[11px] text-muted">Save first, then you can move this day's work.</p>}
          </>
        );
      }}
    </Popover>
  );
}

export default MarkLeave;
