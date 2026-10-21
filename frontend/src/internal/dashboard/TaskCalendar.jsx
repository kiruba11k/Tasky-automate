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
  Se as useStore,
  PR as onTimeSummary,
} from '@/internal/min';
import { entryName, projectLabel, rowDone, rowTarget } from '../daily/entryHelpers';
import { blockLabel } from '../daily/planBlocks';
import { CollapsibleHistory } from './CollapsibleHistory';
import { ResubmitBadge } from './ResubmitBadge';

const clockMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

/** What a person did on a day besides assigned tasks: plan blocks, day-table rows and extra hours (read from the day record). */
export function dayWork(record, projects) {
  if (!record) return { blocks: [], rows: [], extra: [] };
  const blocks = (record.plan ?? [])
    .filter((b) => !b.lunch)
    .map((b) => ({
      id: b.id,
      name: blockLabel(b.projectId, b.custom, projects),
      planned: Math.max(0, clockMinutes(b.end) - clockMinutes(b.start)),
      actual: b.actualMinutes,
    }));
  const rows = (record.entries ?? [])
    .filter((e) => e.task || e.desc || e.custom)
    .map((e) => ({
      id: e.id,
      project: projectLabel(e.projectId, projects),
      name: entryName(e, projects.find((p) => p.id === e.projectId)),
      target: rowTarget(e),
      done: rowDone(e),
      est: e.estMin,
      actual: e.actualMin,
    }));
  const extra = (record.extra ?? []).filter((x) => x.minutes > 0).map((x) => ({ id: x.id, name: x.work || 'Extra work', minutes: x.minutes }));
  return { blocks, rows, extra };
}

/** Month calendar of tasks with a day-detail list. `who` "assigner" shows assignees, otherwise assigners.
 *  With `personId` the person's own day (plan blocks, day-table rows, extra hours, tasks they gave out and leave) is shown too. */
export function TaskCalendar({ tasks, who, personId }) {
  const daily = useStore((s) => s.daily);
  const projects = useStore((s) => s.projects);
  const allTasks = useStore((s) => s.tasks);
  const profiles = useStore((s) => s.profiles);
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
  // tasks this person gave to others, by day
  const givenByDate = useMemo(() => {
    const map = new Map();
    if (personId)
      allTasks.forEach((t) => {
        if (t.assignedById === personId && t.assigneeId !== personId) map.set(t.date, [...(map.get(t.date) ?? []), t]);
      });
    return map;
  }, [allTasks, personId]);
  /** Items logged on a day (blocks + rows + extra hours), for the calendar badges and the day list. */
  const workOf = (day) => (personId ? dayWork(daily[`${personId}|${day}`], projects) : { blocks: [], rows: [], extra: [] });
  const activityCount = (day) => {
    const w = workOf(day);
    return (byDate.get(day)?.length ?? 0) + (givenByDate.get(day)?.length ?? 0) + w.blocks.length + w.rows.length + w.extra.length;
  };
  const leave = personId ? profiles[personId]?.leaves?.find((l) => l.date === selected) : undefined;
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
            const count = personId ? activityCount(key) : (byDate.get(key)?.length ?? 0);
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                aria-label={`${key}: ${count} ${personId ? 'items' : 'tasks'}`}
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
        {leave && (
          <p className="mb-2 rounded-xl bg-lavender/40 px-3 py-2 text-sm">
            🌴 {leave.kind === 'half' ? 'On half day leave' : leave.kind === 'holiday' ? 'Holiday' : 'On leave'}
            {leave.note ? `: ${leave.note}` : ''}
          </p>
        )}
        {dayTasks.length === 0 && !(personId && activityCount(selected) > 0) ? (
          <p className="py-6 text-sm text-muted">No tasks on this day.</p>
        ) : dayTasks.length === 0 ? null : (
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
        {personId && <DayLog work={workOf(selected)} given={givenByDate.get(selected) ?? []} />}
      </div>
    </div>
  );
}

/** The person's own day under the task list: tasks they gave out, plan blocks, day-table rows and extra hours. */
export function DayLog({ work, given }) {
  const { blocks, rows, extra } = work;
  if (!given.length && !blocks.length && !rows.length && !extra.length) return null;
  const heading = 'mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-muted';
  return (
    <div data-testid="day-log">
      {given.length > 0 && (
        <>
          <p className={heading}>Tasks I gave ({given.length})</p>
          <ul className="divide-y divide-line">
            {given.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-1.5 text-sm">
                <Avatar id={t.assigneeId} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="first-letter:uppercase">{t.title}</span>
                  <span className="block text-xs text-muted">
                    to {firstName(t.assigneeId)} · target {formatMinutes(t.targetMinutes)}
                    {t.doneQty != null && ` · ${t.doneQty}/${t.qty} ${t.unit}`}
                  </span>
                </span>
                <Badge tone={STATUS_META[t.status].tone}>{STATUS_META[t.status].label}</Badge>
              </li>
            ))}
          </ul>
        </>
      )}
      {blocks.length > 0 && (
        <>
          <p className={heading}>Plan blocks ({blocks.length})</p>
          <ul className="divide-y divide-line">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">{b.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  planned {formatMinutes(b.planned)}
                  {b.actual > 0 && ` · actual ${formatMinutes(b.actual)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {rows.length > 0 && (
        <>
          <p className={heading}>Daily update ({rows.length})</p>
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{r.name}</span>
                  <span className="block truncate text-xs text-muted">{r.project}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {r.target > 0 && `${r.done}/${r.target} done`}
                  {r.est > 0 && ` · est ${formatMinutes(r.est)}`}
                  {r.actual > 0 && ` · took ${formatMinutes(r.actual)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {extra.length > 0 && (
        <>
          <p className={heading}>Extra hours</p>
          <ul className="divide-y divide-line">
            {extra.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">{x.name}</span>
                <span className="shrink-0 text-xs text-muted">{formatMinutes(x.minutes)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default TaskCalendar;
