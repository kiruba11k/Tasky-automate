import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Se as useStore, oe as cn, $e as dayKey } from '@/internal/min';
import { isSubmitted, workDate } from '../lib/domain';
import { LeaveBadge } from '../ui/LeaveBadge';
import { TaskLine } from './TaskLine';
import { DayLog, dayWork } from '../dashboard/TaskCalendar';
import { MONTH_SHORT, isWeekday, parseDateKey, previousWeekday } from '../lib/dates';

const WEEK_STARTS_MONDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dateKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Task history as a month calendar (dots for assigned / submitted tasks, lavender for leave) plus the tasks of the picked day. (Jue) */
export function HistoryCalendar({ tasks, personId }) {
  const leaves = useStore((s) => s.profiles[personId]?.leaves) ?? [];
  const daily = useStore((s) => s.daily);
  const projects = useStore((s) => s.projects);
  // work logged in the person's day record (plan blocks, Daily update rows, extra hours): it counts in Day by day, so it shows here too
  const workOf = (day) => dayWork(daily[`${personId}|${day}`], projects);
  const workCount = (day) => {
    const w = workOf(day);
    return w.blocks.length + w.rows.length + w.extra.length;
  };
  const leaveOn = (date) => leaves.find((l) => l.date === date);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const [picked, setPicked] = useState(isWeekday(dayKey(0)) ? dayKey(0) : previousWeekday(dayKey(0)));
  const assignedByDay = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => map.set(t.date, [...(map.get(t.date) ?? []), t]));
    return map;
  }, [tasks]);
  const submittedByDay = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (isSubmitted(t)) {
        const day = workDate(t); // the day the work counts for, as in Tasks done
        map.set(day, [...(map.get(day) ?? []), t]);
      }
    });
    return map;
  }, [tasks]);
  const offset = (new Date(month.y, month.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateKey(month.y, month.m, i + 1)),
  ];
  const shiftMonth = (delta) =>
    setMonth((cur) => {
      const next = cur.m + delta;
      return { y: cur.y + Math.floor(next / 12), m: ((next % 12) + 12) % 12 };
    });
  const assigned = assignedByDay.get(picked) ?? [];
  const submitted = submittedByDay.get(picked) ?? [];
  const pickedLeave = leaveOn(picked);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]" data-testid="history-calendar">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <button
            aria-label="Previous month"
            className="focus-ring rounded-lg p-1.5 hover:bg-surface-2"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-bold">
            {MONTH_SHORT[month.m]} {month.y}
          </p>
          <button
            aria-label="Next month"
            className="focus-ring rounded-lg p-1.5 hover:bg-surface-2"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted">
          {WEEK_STARTS_MONDAY.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <span key={`e${i}`} />;
            const assignedCount = assignedByDay.get(day)?.length ?? 0;
            const submittedCount = (submittedByDay.get(day)?.length ?? 0) + workOf(day).rows.filter((r) => r.done > 0).length;
            const loggedCount = workCount(day);
            return (
              <button
                key={day}
                data-day={day}
                onClick={() => setPicked(day)}
                title={leaveOn(day) ? (leaveOn(day).kind === 'half' ? 'Half day leave' : 'On leave') : undefined}
                className={cn(
                  'focus-ring flex h-11 flex-col items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                  picked === day
                    ? 'bg-accent text-accent-on'
                    : leaveOn(day)
                      ? 'bg-lavender text-lavender-ink hover:bg-lavender/80'
                      : assignedCount || submittedCount || loggedCount
                        ? 'bg-surface-2 hover:bg-accent-soft'
                        : 'text-faint hover:bg-surface-2',
                  day === dayKey(0) && picked !== day && 'ring-1 ring-accent/60',
                )}
              >
                {parseDateKey(day).getDate()}
                {(assignedCount > 0 || submittedCount > 0 || loggedCount > 0) && (
                  <span className="mt-0.5 flex gap-0.5">
                    {(assignedCount > 0 || (loggedCount > 0 && submittedCount === 0)) && (
                      <span className={cn('h-1.5 w-1.5 rounded-full', picked === day ? 'bg-white' : 'bg-sky-strong')} />
                    )}
                    {submittedCount > 0 && (
                      <span
                        className={cn('h-1.5 w-1.5 rounded-full', picked === day ? 'bg-white/70' : 'bg-mint-strong')}
                      />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex gap-3 text-[11px] text-muted">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-strong" />
            Assigned
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-mint-strong" />
            Submitted
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded bg-lavender" />
            Leave
          </span>
        </p>
      </div>
      <div className="space-y-4">
        <p className="flex items-center gap-2 font-bold">
          {new Date(`${picked}T12:00:00`).toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
          <LeaveBadge personId={personId} date={picked} />
        </p>
        {pickedLeave && (
          <p className="rounded-xl bg-lavender/40 px-3 py-2 text-sm" data-testid="leave-note">
            🌴 {pickedLeave.kind === 'half' ? 'On half day leave' : 'On leave'} this day
            {pickedLeave.note ? `: ${pickedLeave.note}` : ''}.
          </p>
        )}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Tasks assigned ({assigned.length})</p>
          {assigned.length ? (
            <ul data-testid="day-assigned">
              {assigned.map((t) => (
                <TaskLine key={t.id} t={t} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing assigned for this day.</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Tasks submitted ({submitted.length})</p>
          {submitted.length ? (
            <ul data-testid="day-submitted">
              {submitted.map((t) => (
                <TaskLine key={t.id} t={t} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing submitted on this day.</p>
          )}
        </div>
        <DayLog work={workOf(picked)} given={[]} />
      </div>
    </div>
  );
}

export default HistoryCalendar;
