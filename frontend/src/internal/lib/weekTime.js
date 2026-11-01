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

/**
 * The days Monday to Friday with each logged row's missing time filled from that day's plan, so a row keeps the time of its own day
 * (the estimate and time taken a day's table shows) even where the saved row carries none: per day and project, the time worked
 * (plan actual, time typed, extra hours) beyond what the rows carry goes to the rows without a time, else over all of them by estimate;
 * the planned minutes beyond the rows' estimates go to the rows without an estimate. Returns a new `daily`; saved records are untouched.
 */
export function fillDayRowTimes(tasks, daily, personId, monday, projects) {
  const out = { ...daily };
  for (let i = 0; i < 5; i++) {
    const date = addDays(monday, i);
    const key = `${personId}|${date}`;
    const rec = daily?.[key];
    if (!rec?.entries?.length) continue;
    const withAssigned = recordWithAssigned(tasks, daily, personId, date, { projects, carry: false });
    const times = dayProjectTimes(withAssigned);
    const entries = rec.entries.map((e) => ({ ...e }));
    times.forEach((v, pid) => {
      const mine = entries.filter((e) => e.projectId === pid && (e.task ?? "") !== "");
      if (!mine.length) return;
      // time the day's rows already carry: the logged rows' own and what sits on the project's assigned rows
      const assignedTyped = (withAssigned.entries ?? []).filter((e) => e.assigned && e.projectId === pid).reduce((sum, e) => sum + (e.actualMin ?? 0), 0);
      const typed = mine.reduce((sum, e) => sum + (e.actualMin ?? 0), 0) + assignedTyped;
      const left = v.actual + v.extra - typed;
      const noEst = mine.filter((e) => !(e.estMin > 0));
      const estLeft = v.planned - mine.reduce((sum, e) => sum + (e.estMin ?? 0), 0);
      if (noEst.length && estLeft >= 5) {
        const each = Math.floor(estLeft / noEst.length / 5) * 5;
        noEst.forEach((e, k) => (e.estMin = k === noEst.length - 1 ? estLeft - each * (noEst.length - 1) : each));
      }
      if (left >= 5) {
        const blank = mine.filter((e) => !(e.actualMin > 0));
        const receivers = blank.length ? blank : mine;
        const weights = receivers.map((e) => (e.estMin > 0 ? e.estMin : 0));
        const useEst = weights.some(Boolean);
        const w = (k) => (useEst ? weights[k] : 1);
        const total = receivers.reduce((sum, _e, k) => sum + w(k), 0);
        let given = 0;
        receivers.forEach((e, k) => {
          const share = Math.floor((left * w(k)) / total);
          e.actualMin = (e.actualMin ?? 0) + share;
          given += share;
        });
        const big = receivers.reduce((best, _e, k) => (w(k) > w(best) ? k : best), 0);
        receivers[big].actualMin += left - given;
      }
    });
    out[key] = { ...rec, entries };
  }
  return out;
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
export function spreadPlanTime(rows, byProject, isFixed = () => false) {
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
    // rows whose time was typed over in the week table keep it; the rest share what is left
    const open = mine.filter((r) => !isFixed(r));
    if (!open.length) return;
    const withEst = open.some((r) => r.estMin > 0);
    const w = (r) => (withEst ? r.estMin || 0 : 1);
    const total = open.reduce((sum, r) => sum + w(r), 0);
    let given = 0;
    open.forEach((r) => {
      const share = Math.floor((left * w(r)) / total);
      r.actualMin = (r.actualMin ?? 0) + share;
      given += share;
    });
    const biggest = open.reduce((best, r) => (w(r) > w(best) ? r : best), open[0]);
    biggest.actualMin += left - given;
  });
  return [...out, ...fallback];
}

/**
 * The rows of a person's Weekly update table: each day's logged rows with their own day's time filled in (`fillDayRowTimes`), added
 * up over the week, times typed over in the week table kept, and a "Planned work" row for a project worked on with no task rows.
 */
export function weekTableRows({ tasks, daily, personId, monday, projects, weekEntries = [], overrides = {} }) {
  const filled = fillDayRowTimes(tasks, daily, personId, monday, projects);
  const rows = weekRows(personId, monday, filled, weekEntries, overrides, weekAssignedRows(tasks, filled, personId, monday, { projects }));
  return spreadPlanTime(rows, weekProjectTime(tasks, daily, personId, monday, projects), () => true); // only adds the no-rows fallback
}
