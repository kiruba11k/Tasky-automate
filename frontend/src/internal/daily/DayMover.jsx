import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Se as useStore, lt as guarded } from '@/internal/min';
import { dayRowsWithAssigned } from '../lib/assigned.js';
import { canReschedule } from '../lib/moveRows.js';
import { DateMenu } from './DateMenu';
import { moveWork } from './moveActions';
import { entryName } from './entryHelpers';

/**
 * The Date cell of a sheet for the owner: opens a small menu to move all of that day's work, or a single row, to another date
 * (logged rows are moved, assigned tasks are rescheduled). `children` is the date label shown on the button.
 */
export function DayMover({ personId, date, children, className = '', testId }) {
  const { tasks, daily, projects, me } = useStore();
  const [choice, setChoice] = useState('all');
  const rows = dayRowsWithAssigned(tasks, daily, personId, date, { projects, carry: false });
  const sent = !!daily[`${personId}|${date}`]?.eodAt;
  const movable = rows.filter((r) => (r.assigned ? r.taskIds.some((id) => canReschedule(tasks.find((t) => t.id === id), me)) : true));
  const label = (r) => `${r.assigned ? 'Assigned: ' : ''}${entryName(r, projects.find((p) => p.id === r.projectId))}`;
  if (personId !== me || !movable.length || sent)
    return (
      <span className={className} title={sent && personId === me ? 'This day was sent. Press Update in Daily update to change it.' : undefined}>
        {children}
      </span>
    );
  const pick = (to) =>
    guarded(() => {
      const one = choice !== 'all' ? movable.find((r) => r.id === choice) : undefined;
      if (one) moveWork({ personId, from: date, to, ids: one.assigned ? [] : [one.id], taskIds: one.assigned ? one.taskIds : [] });
      else
        moveWork({
          personId,
          from: date,
          to,
          taskIds: movable.filter((r) => r.assigned).flatMap((r) => r.taskIds),
        });
      setChoice('all');
    });
  return (
    <DateMenu
      personId={personId}
      from={date}
      title="Move this day's work"
      hint="Weekends, holidays and past days work too."
      testId="day-mover-popover"
      onPick={pick}
      trigger={({ onClick }) => (
        <button
          type="button"
          data-testid={testId ?? 'change-day-date'}
          aria-label="Change date"
          title="Change the date of this day's work"
          onClick={onClick}
          className={`focus-ring inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 hover:bg-surface-2 ${className}`}
        >
          {children} <CalendarDays size={12} className="text-accent-ink" />
        </button>
      )}
    >
      <label className="block text-xs font-semibold text-muted">
        What to move
        <select aria-label="What to move" className="focus-ring mt-1 block w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="all">Move all of this day</option>
          {movable.map((r) => (
            <option key={r.id} value={r.id}>
              Move this row: {label(r)}
            </option>
          ))}
        </select>
      </label>
    </DateMenu>
  );
}

export default DayMover;
