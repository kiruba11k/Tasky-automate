// Places weekly tasks onto days so a person's week is balanced, instead of repeating every task on every day.
const PRIORITY = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const MAX_HOURS_PER_DAY_SLICE = 4;

/**
 * rows: [{ key, priority, estimated_hours, assign: { [userId]: { days: string[] | null } } }]
 * dates: the week's dates (Mon..Sun). workDates: the dates to plan onto.
 * Returns { [rowKey]: { [userId]: string[] } } for every assignment whose days are not set by hand.
 * A task gets one day, or several when it is long (about one day per 4 hours), always on the least loaded days.
 */
export function spreadDays(rows, workDates) {
  const load = {}; // userId -> { date: hours }
  const slot = (u) => (load[u] ||= Object.fromEntries(workDates.map((d) => [d, 0])));
  const per = (r, n) => (Number(r.estimated_hours) > 0 ? Number(r.estimated_hours) / Math.max(1, n) : 1);
  // hand-picked days still count towards a person's load
  for (const r of rows) for (const [u, c] of Object.entries(r.assign)) if (c.days) for (const d of c.days) if (slot(u)[d] !== undefined) slot(u)[d] += per(r, c.days.length);
  const order = [...rows].sort((a, b) => (PRIORITY[a.priority] ?? 2) - (PRIORITY[b.priority] ?? 2) || (Number(b.estimated_hours) || 0) - (Number(a.estimated_hours) || 0));
  const out = {};
  for (const r of order) {
    for (const [u, c] of Object.entries(r.assign)) {
      if (c.days) continue;
      const assignees = Object.keys(r.assign).length;
      const hours = Number(r.estimated_hours) > 0 ? Number(r.estimated_hours) / assignees : 0;
      const n = Math.max(1, Math.min(workDates.length, Math.ceil(hours / MAX_HOURS_PER_DAY_SLICE)));
      const l = slot(u);
      const picked = [...workDates].sort((a, b) => l[a] - l[b] || (a < b ? -1 : 1)).slice(0, n).sort();
      for (const d of picked) l[d] += (hours || 1) / n;
      (out[r.key] ||= {})[u] = picked;
    }
  }
  return out;
}
