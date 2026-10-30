// Where a week's time went per project, the same figures as the "Weekly hours" card, and the time that sits on no task row of the
// Weekly update table (plan blocks and the like), so the table's total can match the hours.
import { addDays } from "./dates.js";
import { dayHours, dayHasTime } from "./domain.js";
import { recordWithAssigned } from "./assigned.js";
import { clockToMinutes } from "./dates.js";

const blockMinutes = (b) => Math.max(0, clockToMinutes(b.end) - clockToMinutes(b.start));

/** Map projectId -> { planned, actual, extra } minutes over the week (Monday to Friday, weekend days only when they hold time). */
export function weekProjectTime(tasks, daily, personId, monday, projects) {
  const dayRecord = (d) => recordWithAssigned(tasks, daily, personId, d, { projects, carry: false });
  const days = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => addDays(monday, i))
    .filter((d, i) => i < 5 || dayHasTime(dayHours(dayRecord(d))));
  const byProject = new Map();
  days.forEach((d) => {
    const rec = dayRecord(d);
    const dayMap = new Map();
    (rec?.plan ?? []).forEach((b) => {
      if (b.id === "lunch") return;
      const pid = (b.custom ? (b.custom.projectId ?? b.projectId) : b.projectId) || `other:${b.custom?.title || "Other work"}`;
      const planned = blockMinutes(b);
      const cur = dayMap.get(pid) ?? { planned: 0, actual: 0, extra: 0 };
      cur.planned += planned;
      cur.actual += b.actualMinutes ?? (rec.eodAt ? planned : 0);
      dayMap.set(pid, cur);
    });
    const typed = new Map();
    (rec?.entries ?? []).forEach((e) => {
      if (e.actualMin > 0) typed.set(e.projectId, (typed.get(e.projectId) ?? 0) + e.actualMin);
    });
    typed.forEach((m, pid) => {
      const cur = dayMap.get(pid) ?? { planned: 0, actual: 0, extra: 0 };
      cur.actual = m;
      dayMap.set(pid, cur);
    });
    (rec?.extra ?? []).forEach((x) => {
      const pid = x.projectId ?? `other:${x.work || "Extra work"}`;
      const cur = dayMap.get(pid) ?? { planned: 0, actual: 0, extra: 0 };
      cur.extra += x.minutes || 0;
      dayMap.set(pid, cur);
    });
    dayMap.forEach((v, pid) => {
      const cur = byProject.get(pid) ?? { planned: 0, actual: 0, extra: 0 };
      byProject.set(pid, { planned: cur.planned + v.planned, actual: cur.actual + v.actual, extra: cur.extra + v.extra });
    });
  });
  return byProject;
}

/**
 * Rows for the time a project was worked on that no task row of the week table carries: per project the worked time (plan actual
 * and extra) minus the time typed on its rows. [{ id, projectId, synthetic: true, label, actualMin, estMin: 0 }].
 */
export function otherTimeRows(rows, byProject) {
  const onRows = new Map();
  rows.forEach((r) => onRows.set(r.projectId, (onRows.get(r.projectId) ?? 0) + (r.actualMin ?? 0)));
  const out = [];
  byProject.forEach((v, pid) => {
    const left = v.actual + v.extra - (onRows.get(pid) ?? 0);
    if (left >= 5) out.push({ id: `wk-other-time|${pid}`, projectId: pid, synthetic: true, label: "Planned work (no task rows)", actualMin: left, estMin: 0 });
  });
  return out;
}

/**
 * The week table's rows with the project's plan time spread over its own task rows: what a project was worked on beyond the time
 * typed on its rows is shared over them in proportion to their estimates (equally with no estimates), so every row keeps its task
 * name and the table adds up to the Weekly hours. A project worked on with no task rows at all gets one "Planned work" row.
 */
export function spreadPlanTime(rows, byProject) {
  const out = rows.map((r) => ({ ...r }));
  const fallback = [];
  byProject.forEach((v, pid) => {
    const mine = out.filter((r) => r.projectId === pid);
    const left = v.actual + v.extra - mine.reduce((sum, r) => sum + (r.actualMin ?? 0), 0);
    if (left < 5) return;
    if (!mine.length) {
      fallback.push(...otherTimeRows([], new Map([[pid, v]])));
      return;
    }
    const weights = mine.map((r) => (r.estMin > 0 ? r.estMin : 0));
    const total = weights.reduce((a, b) => a + b, 0) || mine.length;
    const w = (i) => (weights[i] || (total === mine.length && !weights.some(Boolean) ? 1 : 0));
    let given = 0;
    mine.forEach((r, i) => {
      const share = Math.floor((left * w(i)) / total);
      r.actualMin = (r.actualMin ?? 0) + share;
      given += share;
    });
    const biggest = mine.reduce((best, r, i) => (w(i) > w(best) ? i : best), 0);
    mine[biggest].actualMin += left - given;
  });
  return [...out, ...fallback];
}
