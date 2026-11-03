// Where a week's time went per project, the same figures as the "Weekly hours" card, and the time that sits on no task row of the
// Weekly update table (plan blocks and the like), so the table's total can match the hours.
import { addDays } from "./dates.js";
import { dayHours, dayHasTime } from "./domain.js";
import { recordWithAssigned } from "./assigned.js";
import { clockToMinutes } from "./dates.js";
import { weekRows } from "./entries.js";
import { weekAssignedRows } from "./assigned.js";

const blockMinutes = (b) => Math.max(0, clockToMinutes(b.end) - clockToMinutes(b.start));

/** Map projectId -> { planned, actual, extra } minutes of one day's record (plan blocks, time typed in its tables, extra hours). */
export function dayProjectTimes(rec) {
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
  return dayMap;
}

/** Map projectId -> { planned, actual, extra } minutes over the week (Monday to Friday, weekend days only when they hold time). */
export function weekProjectTime(tasks, daily, personId, monday, projects) {
  const dayRecord = (d) => recordWithAssigned(tasks, daily, personId, d, { projects, carry: false });
  const days = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => addDays(monday, i))
    .filter((d, i) => i < 5 || dayHasTime(dayHours(dayRecord(d))));
  const byProject = new Map();
  days.forEach((d) => {
    dayProjectTimes(dayRecord(d)).forEach((v, pid) => {
      const cur = byProject.get(pid) ?? { planned: 0, actual: 0, extra: 0 };
      byProject.set(pid, { planned: cur.planned + v.planned, actual: cur.actual + v.actual, extra: cur.extra + v.extra });
    });
  });
  return byProject;
}

/** Minutes of the week's plan and extra time on projects beyond what the week table's rows carry (never below 0), for a footnote. */
export function planTimeOffRows(rows, byProject) {
  const onRows = rows.reduce((sum, r) => sum + (r.time ?? (r.actualMin > 0 ? r.actualMin : (r.estMin ?? 0))), 0);
  let worked = 0;
  byProject.forEach((v) => (worked += v.actual + v.extra));
  return Math.max(0, worked - onRows);
}

/** The rows of a person's Weekly update table: the day tables' rows added up over the week, exactly as the days have them. */
export function weekTableRows({ tasks, daily, personId, monday, projects, weekEntries = [], overrides = {} }) {
  return weekRows(personId, monday, daily, weekEntries, overrides, weekAssignedRows(tasks, daily, personId, monday, { projects }));
}
