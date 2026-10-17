import { addDays, currentWeekStart as weekStart, todayKey as dayKey } from '../lib/dates.js';
import { loggedKpiExtras, loggedMetricExtras } from '../lib/entries.js';
import { withinTarget } from '../lib/domain.js';

/** On-time stats over finished tasks, or null (original: `PR`). */
export const onTimeStats = (tasks) => {
  const done = tasks.filter(
    (t) => (t.status === 'done' || t.status === 'in_review') && t.minutes && t.doneQty && t.qty,
  );
  if (!done.length) return null;
  const onTime = done.filter((t) => withinTarget(t.minutes, t.targetMinutes * (t.doneQty / t.qty))).length;
  return { onTime, total: done.length, pct: Math.round((onTime / done.length) * 100) };
};

/** Minutes saved vs target for a task, or null (original: `cU`). */
export const minutesSaved = (task) =>
  task.minutes && task.doneQty && task.qty
    ? Math.round(task.targetMinutes * (task.doneQty / task.qty) - task.minutes)
    : null;

/** Task type -> project KPI keys it counts towards (original: `dU`). */
export const TASK_TYPE_KPI_KEYS = {
  l1: ['messages'],
  l2: ['messages', 'l2'],
  followup: ['messages'],
  whatsapp: ['messages'],
  email: ['messages'],
  deck: ['decks'],
};

/** [start, end) date keys of a week/month period (original: `fU`). */
export function periodRange(period) {
  if (period.kind === 'week') return [period.key, addDays(period.end ?? addDays(period.key, 6), 1)];
  const [year, month] = period.key.split('-').map(Number);
  return [
    `${period.key}-01`,
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`,
  ];
}

/** KPI counts for a project in a period, plus the auto-counted part (original: `AR`). */
export function projectPeriodCounts(project, tasks, daily, period) {
  const currentWeek = weekStart(0);
  const currentMonth = dayKey(0).slice(0, 7);
  // Project weeks count from the project's start date, so "this week" is whichever 7 days today falls in.
  const today = dayKey(0);
  const isCurrentWeek = period.key === currentWeek || (today >= period.key && today < addDays(period.key, 7));
  const [start, end] = periodRange(period);
  // a saved week stands: numbers the manager typed in the Numbers tab win over what is derived
  const typed = period.kind === 'week' ? project.weekActuals?.[period.key] : undefined;
  const withTyped = (counts) => (typed ? { ...counts, ...typed } : counts);
  if (period.kind === 'week' && !isCurrentWeek) {
    const past = project.pastWeeks.find((w) => w.start === period.key) ?? project.pastWeeks.find((w) => w.start >= period.key && w.start < addDays(period.key, 7));
    // past weeks keep only the counters; work logged in the day tables is read from the stored days, never copied
    const auto = period.key > today ? {} : loggedMetricExtras(project, tasks, daily, start, end, { includeTyped: true });
    const counts = { ...(past?.counts ?? {}) };
    Object.entries(auto).forEach(([key, value]) => (counts[key] = (counts[key] ?? 0) + value));
    return { counts: withTyped(counts), auto };
  }
  if (period.kind === 'month' && period.key !== currentMonth) {
    const auto = loggedMetricExtras(project, tasks, daily, start, end, { includeTyped: true });
    const counts = { ...(project.pastMonths.find((m) => m.month === period.key)?.counts ?? {}) };
    Object.entries(auto).forEach(([key, value]) => (counts[key] = (counts[key] ?? 0) + value));
    return { counts, auto };
  }
  const auto = {};
  const add = (key, amount) => {
    auto[key] = (auto[key] ?? 0) + amount;
  };
  tasks
    .filter(
      (t) =>
        !t.historic &&
        t.projectId === project.id &&
        t.date >= start &&
        t.date < end &&
        t.status === 'done' &&
        t.doneQty,
    )
    .forEach((t) => (TASK_TYPE_KPI_KEYS[t.typeId] ?? []).forEach((key) => add(key, t.doneQty)));
  Object.entries(daily).forEach(([dailyKey, entry]) => {
    const date = dailyKey.split('|')[1];
    if (date >= start && date < end) {
      Object.entries(entry.eodActuals?.[project.id] ?? {}).forEach(([key, value]) => add(key, value || 0));
    }
  });
  // work logged in the day tables counts too, but not on top of assigned tasks covering the same person, day and kind of work
  Object.entries(loggedKpiExtras(project.id, tasks, daily, start, end)).forEach(([key, value]) => add(key, value));
  // work logged against a standard task that counts toward one of the project's numbers (Build workflow -> Workflows built)
  Object.entries(loggedMetricExtras(project, tasks, daily, start, end)).forEach(([key, value]) => add(key, value));
  const counts = { ...(period.kind === 'week' ? project.week : project.month) };
  Object.entries(auto).forEach(([key, value]) => {
    counts[key] = (counts[key] ?? 0) + value;
  });
  return { counts: withTyped(counts), auto };
}
