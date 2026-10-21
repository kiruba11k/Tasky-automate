/** Share (%) of a person's items in the period that are done, from `personMetrics` (null when nothing was assigned). */
export function completionPct(row) {
  return row?.assigned > 0 ? Math.min(100, Math.round((Math.min(row.tasks, row.assigned) / row.assigned) * 100)) : null;
}

/** "88% on time · 51% of assigned work done", leaving out a part that cannot be measured yet. */
export function personStat(row) {
  const done = completionPct(row);
  return [row.onTime != null && `${row.onTime}% on time`, done != null && `${done}% of assigned work done`]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Best of `rows` ranked by the average of on-time % and completion %; only people with enough timed items compete.
 * Equal scores go to whoever put in more hours (a few big tasks and many small ones can be the same effort), then to whoever
 * finished more tasks.
 */
export function pickStar(rows, minTimed) {
  return rows
    .filter((r) => r.onTime != null && r.tasks > 0 && r.timed >= minTimed)
    .map((row) => {
      const done = completionPct(row) ?? 0;
      return { row, score: (row.onTime + done) / 2 };
    })
    .sort((a, b) => b.score - a.score || (b.row.hours ?? 0) - (a.row.hours ?? 0) || b.row.tasks - a.row.tasks)[0]?.row;
}

/** How far a project is through this month's targets (0-100, mean over the metrics that have a target), or null with no progress. */
export function projectProgress(project, tracked = () => true) {
  const parts = (project.metrics ?? [])
    .filter((m) => tracked(m) && (project.monthTarget?.[m.id] ?? 0) > 0)
    .map((m) => Math.min(1, (project.month?.[m.id] ?? 0) / project.monthTarget[m.id]));
  if (!parts.length) return null;
  const pct = Math.round((parts.reduce((s, v) => s + v, 0) / parts.length) * 100);
  return pct > 0 ? pct : null;
}

/** Active project furthest through its monthly targets (any template); undefined when none has made progress. */
export function pickProject(projects, tracked) {
  return projects
    .filter((p) => p.status === 'active')
    .map((p) => ({ p, pct: projectProgress(p, tracked) }))
    .filter((x) => x.pct != null)
    .sort((a, b) => b.pct - a.pct)[0];
}
