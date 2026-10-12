import { useMemo, useState } from 'react';
import { Rows3, LayoutGrid } from 'lucide-react';
import {
  Se as useStore,
  qe as Badge,
  oe as cx,
  yt as formatDate,
  $e as dayKey,
  Mt as weekStart,
  $g as workingDaysBetween,
  AR as countProgress,
  df as weeklyTargetFor,
  ea as canPlanFor,
  tc as metricInPeriod,
} from '@/internal/min';
import { ProgressBars } from './ProgressBars';
import { ProgressTile } from './ProgressTile';
import { weekOptions, monthOptions } from './weekOptions';

/** Percentage of the working days of the current week / month that have elapsed. */
export function expectedProgressPct(kind) {
  const today = dayKey(0);
  if (kind === 'week') {
    const start = weekStart(0);
    return Math.round((workingDaysBetween(start, today).length / 5) * 100);
  }
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastDay = new Date(+today.slice(0, 4), +today.slice(5, 7), 0);
  const monthEnd = `${today.slice(0, 7)}-${String(lastDay.getDate()).padStart(2, '0')}`;
  return Math.round(
    (workingDaysBetween(monthStart, today).length / Math.max(1, workingDaysBetween(monthStart, monthEnd).length)) * 100,
  );
}

const selectClass =
  'focus-ring min-w-0 max-w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-sm text-ink';
const pillClass = (active) =>
  cx('focus-ring rounded-full px-3.5 py-1 text-sm font-semibold', active ? 'bg-accent text-accent-on' : 'text-muted hover:text-ink');

/** Weekly / monthly progress of a project's numbers against targets (bars or tiles). */
export function ProjectProgress({ p: project, compact }) {
  const tasks = useStore((s) => s.tasks);
  const daily = useStore((s) => s.daily);
  const currentWeek = weekStart(0);
  const currentMonth = dayKey(0).slice(0, 7);
  const weeks = useMemo(() => weekOptions(project, 'progress'), [project]);
  const months = useMemo(() => monthOptions(project), [project]);
  const [kind, setKind] = useState('week');
  const [weekPick, setWeekPick] = useState(currentWeek);
  const [monthPick, setMonthPick] = useState(currentMonth);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('bars');

  const week = weeks.some((w) => w.start === weekPick)
    ? weekPick
    : ((weeks.find((w) => w.when === 'current') ?? weeks[0])?.start ?? currentWeek);
  const month = months.some((m) => m.key === monthPick) ? monthPick : currentMonth;
  const periodKey = kind === 'week' ? week : month;

  const { counts, auto } = useMemo(
    () => countProgress(project, tasks, daily, { kind, key: periodKey }),
    [project, tasks, daily, kind, periodKey],
  );
  const savedPlan = kind === 'week' ? project.weekPlans?.[week] : undefined;
  const me = useStore((s) => s.me);
  const canPlan = canPlanFor(project, me);
  const isDraft = kind === 'week' && !savedPlan && !project.weekLocked;
  const targets =
    kind === 'week'
      ? isDraft && !canPlan
        ? undefined
        : weeklyTargetFor(project, week)
      : project.monthLocked
        ? project.monthTarget
        : undefined;
  const isFuture = kind === 'week' && week > currentWeek;
  const expected = (kind === 'week' ? week === currentWeek : month === currentMonth) ? expectedProgressPct(kind) : undefined;
  const metrics = project.metrics.filter((m) => metricInPeriod(m, kind));
  const items = metrics
    .filter((m) => filter === 'all' || m.id === filter)
    .map((m) => ({
      id: m.id,
      label: m.label,
      value: counts[m.id] ?? 0,
      target: targets?.[m.id] || undefined,
      auto: auto[m.id],
    }));
  const withTarget = items.filter((i) => i.target);
  const average = withTarget.length
    ? Math.round(withTarget.reduce((sum, i) => sum + Math.min(100, (i.value / i.target) * 100), 0) / withTarget.length)
    : null;

  return (
    <div className="space-y-4" data-testid="project-progress">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-surface-2 p-1" role="group" aria-label="Weekly or monthly">
          {['week', 'month'].map((k) => (
            <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={pillClass(kind === k)}>
              {k === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
        {kind === 'week' ? (
          <select aria-label="Week" className={selectClass} value={week} onChange={(e) => setWeekPick(e.target.value)}>
            {weeks.map((w) => (
              <option key={w.start} value={w.start}>
                {w.label}
                {w.planned ? ' · plan saved' : ''}
              </option>
            ))}
          </select>
        ) : (
          <select aria-label="Month" className={selectClass} value={month} onChange={(e) => setMonthPick(e.target.value)}>
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter numbers"
          className={selectClass}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All numbers</option>
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {kind === 'week' &&
          (savedPlan ? (
            <Badge tone="mint">Using this week's saved plan</Badge>
          ) : targets && isDraft ? (
            <Badge tone="butter">Draft target</Badge>
          ) : targets ? (
            <Badge tone="grey">Using the default weekly target</Badge>
          ) : null)}
        {!targets && (
          <Badge tone="butter">
            {kind === 'week' ? 'No weekly target saved for this week yet' : 'Monthly targets not locked yet'}
          </Badge>
        )}
        {isFuture ? (
          <span>Starts {formatDate(week)}: these are the planned targets.</span>
        ) : (
          average != null && (
            <span>
              <b className="text-ink">{average}%</b> of target on average across {withTarget.length} number
              {withTarget.length === 1 ? '' : 's'}
            </span>
          )
        )}
        {expected != null && !isFuture && targets && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-0.5 rounded bg-ink/40" /> expected by today: {expected}%
          </span>
        )}
        <div className="ml-auto flex rounded-xl bg-surface-2 p-0.5" role="group" aria-label="Chart style">
          {[
            ['bars', Rows3, 'Bar chart view'],
            ['tiles', LayoutGrid, 'Tiles view'],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              aria-label={label}
              title={label}
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={cx(
                'focus-ring rounded-lg p-1.5',
                view === key ? 'bg-surface text-accent-ink shadow-soft' : 'text-muted hover:text-ink',
              )}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Nothing tracked for this period.</p>
      ) : view === 'bars' ? (
        <ProgressBars items={items} compact={compact} expected={expected} planned={isFuture} />
      ) : (
        <div
          className={cx(
            'grid grid-cols-2 gap-3',
            compact ? 'sm:grid-cols-2 2xl:grid-cols-3' : 'md:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {items.map((i) => (
            <ProgressTile key={i.id} label={i.label} value={i.value} target={i.target} auto={i.auto} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectProgress;
