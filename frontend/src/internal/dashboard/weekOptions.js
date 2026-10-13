import { $e as dayKey, ft as addDays, Dw as weekRanges } from '@/internal/min';
import { projectWeekStart } from '@/internal/lib/domain';

const relativeWeekLabel = (start, current) =>
  start === current ? 'this week' : start === addDays(current, 7) ? 'next week' : start === addDays(current, -7) ? 'last week' : '';

/** Week choices for a project's selects. `mode` "plan" lists all weeks, otherwise only current/future/known ones. */
export function weekOptions(project, mode = 'plan') {
  const current = projectWeekStart(project, dayKey(0)); // the project's own 7-day week that today falls in
  return weekRanges(project)
    .filter(
      (w) =>
        mode === 'plan' ||
        w.start >= current ||
        project.pastWeeks.some((p) => p.start === w.start) ||
        !!project.weekPlans?.[w.start],
    )
    .map((w) => {
      const rel = relativeWeekLabel(w.start, current);
      return {
        start: w.start,
        n: w.n,
        when: w.start < current ? 'past' : w.start === current ? 'current' : 'future',
        planned: !!project.weekPlans?.[w.start],
        label: `${w.label}${rel ? ` (${rel})` : ''}`,
      };
    });
}

/** Month choices ("YYYY-MM" keys) from the project start to the current month. */
export function monthOptions(project) {
  const thisMonth = dayKey(0).slice(0, 7);
  const startMonth = project.startDate.slice(0, 7);
  const [startYear, startMon] = startMonth.split('-').map(Number);
  return [
    ...new Set([
      thisMonth,
      ...project.pastMonths.map((m) => m.month).filter((m) => m >= startMonth && m < thisMonth),
    ]),
  ]
    .sort()
    .map((key) => {
      const [y, m] = key.split('-').map(Number);
      const n = Math.max(1, (y - startYear) * 12 + (m - startMon) + 1);
      return {
        key,
        label: `Month ${n} · ${new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}${key === thisMonth ? ' (this month)' : ''}`,
      };
    });
}
