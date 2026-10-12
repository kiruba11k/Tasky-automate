import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  qe as Badge,
  vt as Avatar,
  oe as cx,
  We as formatMinutes,
  be as firstName,
  $e as dayKey,
  mi as STATUS_META,
  PR as onTimeSummary,
} from '@/internal/min';
import { CollapsibleHistory } from './CollapsibleHistory';
import { ResubmitBadge } from './ResubmitBadge';

/** Month calendar of tasks with a day-detail list. `who` "assigner" shows assignees, otherwise assigners. */
export function TaskCalendar({ tasks, who }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selected, setSelected] = useState(dayKey(0));
  const byDate = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => map.set(t.date, [...(map.get(t.date) ?? []), t]));
    return map;
  }, [tasks]);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingBlanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const keyFor = (day) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayTasks = byDate.get(selected) ?? [];
  const summary = onTimeSummary(dayTasks);
  const shiftMonth = (delta) => setMonth(new Date(year, monthIndex + delta, 1));

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <button
            aria-label="Previous month"
            className="focus-ring rounded-lg p-1 hover:bg-surface-2"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-semibold">
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
          <button
            aria-label="Next month"
            className="focus-ring rounded-lg p-1 hover:bg-surface-2"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <span key={'e' + i} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const key = keyFor(i + 1);
            const count = byDate.get(key)?.length ?? 0;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                aria-label={`${key}: ${count} tasks`}
                className={cx(
                  'focus-ring relative flex h-9 flex-col items-center justify-center rounded-lg text-xs',
                  key === selected
                    ? 'bg-accent text-accent-on'
                    : count
                      ? 'bg-accent-soft font-semibold text-accent-ink'
                      : 'text-muted hover:bg-surface-2',
                  key === dayKey(0) && key !== selected && 'ring-1 ring-accent',
                )}
              >
                {i + 1}
                {count > 0 && <span className="text-[9px] leading-none">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
          {new Date(selected + 'T00:00').toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
          <Badge tone="sky">
            {dayTasks.length} task{dayTasks.length === 1 ? '' : 's'}
          </Badge>
          {summary && (
            <Badge tone="mint">
              {summary.onTime}/{summary.total} on time
            </Badge>
          )}
        </p>
        {dayTasks.length === 0 ? (
          <p className="py-6 text-sm text-muted">No tasks on this day.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-line overflow-y-auto">
            {dayTasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 py-2 text-sm" data-testid="task-log-row">
                <Avatar id={who === 'assigner' ? t.assigneeId : t.assignedById} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="first-letter:uppercase">{t.title}</span>
                  <span className="block text-xs text-muted">
                    {who === 'assigner' ? `to ${firstName(t.assigneeId)}` : `from ${firstName(t.assignedById)}`}
                    {' · target '}
                    {formatMinutes(t.targetMinutes)}
                    {t.minutes != null && ` · took ${formatMinutes(t.minutes)}`}
                    {t.doneQty != null && ` · ${t.doneQty}/${t.qty} ${t.unit}`}
                  </span>
                  <CollapsibleHistory task={t} className="mt-1" />
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={STATUS_META[t.status].tone}>{STATUS_META[t.status].label}</Badge>
                  <ResubmitBadge task={t} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default TaskCalendar;
