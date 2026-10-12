import { ft as addDays, Mt as weekStart, $e as dayKey } from '@/internal/min';

/** On-time stats over finished tasks, or null (original: `PR`). */
export const onTimeStats = (tasks) => {
  const done = tasks.filter(
    (t) => (t.status === 'done' || t.status === 'in_review') && t.minutes && t.doneQty && t.qty,
  );
  if (!done.length) return null;
  const onTime = done.filter((t) => t.minutes <= t.targetMinutes * (t.doneQty / t.qty)).length;
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
  if (period.kind === 'week') return [period.key, addDays(period.key, 7)];
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
  if (period.kind === 'week' && period.key !== currentWeek) {
    return { counts: project.pastWeeks.find((w) => w.start === period.key)?.counts ?? {}, auto: {} };
  }
  if (period.kind === 'month' && period.key !== currentMonth) {
    return { counts: project.pastMonths.find((m) => m.month === period.key)?.counts ?? {}, auto: {} };
  }
  const [start, end] = periodRange(period);
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
        (t.status === 'done' || t.status === 'in_review') &&
        t.doneQty,
    )
    .forEach((t) => (TASK_TYPE_KPI_KEYS[t.typeId] ?? []).forEach((key) => add(key, t.doneQty)));
  Object.entries(daily).forEach(([dailyKey, entry]) => {
    const date = dailyKey.split('|')[1];
    if (date >= start && date < end) {
      Object.entries(entry.eodActuals[project.id] ?? {}).forEach(([key, value]) => add(key, value || 0));
    }
  });
  const counts = { ...(period.kind === 'week' ? project.week : project.month) };
  Object.entries(auto).forEach(([key, value]) => {
    counts[key] = (counts[key] ?? 0) + value;
  });
  return { counts, auto };
}
