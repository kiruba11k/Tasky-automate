/** Share (%) of a person's items in the period that are done, from `personMetrics` (null when nothing was assigned). */
export function completionPct(row) {
  return row?.assigned > 0 ? Math.min(100, Math.round((Math.min(row.tasks, row.assigned) / row.assigned) * 100)) : null;
}

/** "88% on time · 51% of assigned work done", leaving out a part that cannot be measured yet. */
export function personStat(row) {
  const done = effortCompletion(row);
  return [row.onTime != null && `${row.onTime}% on time`, done != null && `${done}% of assigned work done`]
    .filter(Boolean)
    .join(' · ');
}

const SHARED_MAX = 3;

/** Share (%) of the assigned work done, weighted by estimated minutes (a big task counts for more than a small one); by count without estimates. */
export function effortCompletion(row) {
  return row?.assignedMin > 0 ? Math.min(100, Math.round((row.doneMin / row.assignedMin) * 100)) : completionPct(row);
}

/**
 * Score of every eligible person, from three things in the data, each 0-100:
 *  - quality: on time % (finished within the estimate),
 *  - follow-through: share of the assigned work done, weighted by estimated minutes,
 *  - output: estimated minutes of work finished relative to the best in the group (by tasks done when no estimates exist),
 * so four big tasks and nine small ones that add up to the same effort score the same. The score is their average.
 */
export function scoreStars(rows, minTimed) {
  const eligible = rows.filter((r) => r.onTime != null && r.tasks > 0 && r.timed >= minTimed);
  const useMinutes = eligible.some((r) => r.doneMin > 0);
  const volume = (r) => (useMinutes ? (r.doneMin ?? 0) : r.tasks);
  const top = Math.max(0, ...eligible.map(volume));
  return eligible.map((row) => {
    const output = top ? (volume(row) / top) * 100 : 0;
    return { row, output: Math.round(output), score: (row.onTime + (effortCompletion(row) ?? 0) + output) / 3 };
  });
}

/**
 * Star(s) of `rows`: highest score, equal scores by hours worked, then tasks done. People still equal after that share the title:
 * { rows } (1..SHARED_MAX people). When too many tie, or everyone does, nobody stands out: { rows: [], team: true }. No one eligible
 * gives undefined.
 */
export function pickStars(rows, minTimed) {
  const ranked = scoreStars(rows, minTimed);
  if (!ranked.length) return undefined;
  const key = (x) => [Math.round(x.score * 10), x.row.hours ?? 0, x.row.tasks].join('|');
  const sorted = ranked.sort((a, b) => b.score - a.score || (b.row.hours ?? 0) - (a.row.hours ?? 0) || b.row.tasks - a.row.tasks);
  const tied = sorted.filter((x) => key(x) === key(sorted[0]));
  if (tied.length > SHARED_MAX || (tied.length === ranked.length && ranked.length >= 3)) return { rows: [], team: true };
  return { rows: tied.map((x) => x.row) };
}

/** The single best person (the first of a shared title), or undefined. */
export const pickStar = (rows, minTimed) => pickStars(rows, minTimed)?.rows[0];

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
