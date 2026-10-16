// How the rows people type into "Daily update" and "Weekly targets by project" (daily.entries / weekly.entries) join the
// rest of the numbers. A row is a self-logged piece of work: a task type, a target, an estimate, actual time and how much got
// done. Assigned tasks cover the same ground when someone logs work they were also assigned, so wherever both exist for the
// same person, day, project and kind of work the larger of the two is used, never the sum.
import { TASK_TYPES } from "./constants.js";
import { addDays } from "./dates.js";

export const CUSTOM_TASK = "__custom";

/** Task type -> project KPI keys it counts towards (messages, decks...). */
export const KPI_KEYS_BY_TYPE = {
  l1: ["messages"],
  l2: ["messages", "l2"],
  followup: ["messages"],
  whatsapp: ["messages"],
  email: ["messages"],
  deck: ["decks"],
};

/** A table row seen as a task, so the reports can group it exactly like one (same labels, units and order). */
export function entryAsTask(entry, project) {
  const builtIn = TASK_TYPES.find((t) => t.id === entry.task);
  const std = String(entry.task).startsWith("std:")
    ? (project?.customStandards ?? []).find((c) => `std:${c.id}` === entry.task)
    : undefined;
  const name = builtIn ? undefined : std?.name || (entry.task === CUSTOM_TASK ? entry.custom?.trim() : "") || "Custom task";
  return {
    typeId: builtIn ? builtIn.id : "custom",
    variant: undefined,
    customName: name,
    title: name ?? builtIn.name,
    unit: builtIn ? builtIn.unit : std?.unit || "items",
    projectId: entry.projectId,
  };
}

/** The rows saved for one person on one day. */
export const dayEntries = (daily, personId, date) => daily?.[`${personId}|${date}`]?.entries ?? [];

/**
 * Time and notes a person typed on the rows of their assigned tasks (the rows come from the tasks themselves, see assigned.js):
 * kept in the day record as `asg`, { rowId: { projectId, actualMin, remarks } }.
 */
export const dayAsg = (daily, personId, date) => daily?.[`${personId}|${date}`]?.asg ?? {};

/** [{ date, entry }] for a person over [from, to] (inclusive), from the day tables. */
export function entriesBetween(daily, personId, from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dayEntries(daily, personId, d).forEach((entry) => out.push({ date: d, entry }));
  return out;
}

/** Achieved count of a weekly row: what was typed, otherwise the sum of the matching daily rows over the week's days. */
export function weeklyDone(entry, personId, monday, daily) {
  if (entry.doneQty != null) return entry.doneQty;
  const same = (a, b) => a.projectId === b.projectId && a.task === b.task && (a.task !== CUSTOM_TASK || (a.custom ?? "").trim().toLowerCase() === (b.custom ?? "").trim().toLowerCase());
  const matches = entriesBetween(daily, personId, monday, addDays(monday, 6)).filter(({ entry: row }) => same(row, entry) && row.doneQty != null);
  return matches.length ? matches.reduce((sum, { entry: row }) => sum + (row.doneQty ?? 0), 0) : undefined;
}

/**
 * Project numbers (messages, l2, decks) from work logged in the day tables over [start, end): per person, day and task type the
 * amount by which the logged "done" exceeds what the person's submitted tasks already count. { messages: n, ... }
 */
export function loggedKpiExtras(projectId, tasks, daily, start, end) {
  const taskDone = new Map();
  tasks.forEach((t) => {
    if (t.historic || t.projectId !== projectId || t.date < start || t.date >= end || !(t.status === "done" || t.status === "in_review") || !t.doneQty) return;
    const id = `${t.assigneeId}|${t.date}|${t.typeId}`;
    taskDone.set(id, (taskDone.get(id) ?? 0) + t.doneQty);
  });
  const logged = new Map();
  Object.entries(daily).forEach(([key, record]) => {
    const [person, date] = key.split("|");
    if (date < start || date >= end) return;
    (record.entries ?? []).forEach((row) => {
      if (row.projectId !== projectId || !row.doneQty || !KPI_KEYS_BY_TYPE[row.task]) return;
      const id = `${person}|${date}|${row.task}`;
      logged.set(id, (logged.get(id) ?? 0) + row.doneQty);
    });
  });
  const out = {};
  logged.forEach((qty, id) => {
    const extra = qty - (taskDone.get(id) ?? 0);
    if (extra > 0) KPI_KEYS_BY_TYPE[id.split("|")[2]].forEach((key) => { out[key] = (out[key] ?? 0) + extra; });
  });
  return out;
}

/**
 * What the team planned for a project's week in "Weekly targets by project", added up over everyone's rows, as project numbers
 * (messages, 2nd level, decks). Weekly records are kept by Monday while a project's weeks run from its start date, so each
 * record belongs to the project week that contains its Wednesday.
 */
export function plannedWeekTargets(project, weekly, projectWeekStartKey) {
  const out = {};
  const end = addDays(projectWeekStartKey, 7);
  Object.entries(weekly ?? {}).forEach(([key, record]) => {
    const monday = key.split("|")[1];
    const mid = addDays(monday, 2);
    if (!(mid >= projectWeekStartKey && mid < end)) return;
    (record.entries ?? []).forEach((row) => {
      if (row.projectId !== project.id || !(row.qty > 0)) return;
      (KPI_KEYS_BY_TYPE[row.task] ?? []).forEach((k) => {
        if (project.template && project.template !== "outbound" && !(project.metrics ?? []).some((m) => m.id === k)) return; // a number this project's template does not track
        out[k] = (out[k] ?? 0) + row.qty;
      });
    });
  });
  return out;
}

/** Identity of a row across days: the same project, task, custom name and kind of target add up in the week's table. */
export const rowKey = (row) => `${row.projectId}|${row.task}|${(row.custom ?? "").trim().toLowerCase()}|${row.kind ?? "number"}`;

/**
 * The rows of a person's "Weekly update": every row of the week's Monday to Friday day tables plus the rows added to the week
 * itself, with the same work added up into one row (targets, achieved, estimated and taken time, latest status / text, notes
 * joined). `overrides` are numbers or statuses typed over the sums in the week table, by `rowKey`. `assignedRows` are the
 * week's assigned-task rows (`weekAssignedRows`), added up with the rest.
 */
export function weekRows(personId, monday, daily, weekEntries = [], overrides = {}, assignedRows = []) {
  const all = [...[0, 1, 2, 3, 4].flatMap((i) => dayEntries(daily, personId, addDays(monday, i))), ...assignedRows, ...weekEntries];
  const merged = new Map();
  all.forEach((row) => {
    const key = rowKey(row);
    const sum = merged.get(key);
    if (!sum) {
      merged.set(key, { ...row, id: `wk-${key}`, remarks: row.remarks ?? "" });
      return;
    }
    sum.qty = row.qty != null || sum.qty != null ? (sum.qty ?? 0) + (row.qty ?? 0) : undefined;
    sum.doneQty = row.doneQty != null || sum.doneQty != null ? (sum.doneQty ?? 0) + (row.doneQty ?? 0) : undefined;
    sum.estMin += row.estMin;
    sum.actualMin = row.actualMin != null || sum.actualMin != null ? (sum.actualMin ?? 0) + (row.actualMin ?? 0) : undefined;
    if (row.targetText) sum.targetText = row.targetText;
    if (row.actualText) sum.actualText = row.actualText;
    if (row.status) sum.status = row.status;
    if (row.assigned) sum.assigned = true;
    if (row.titles?.length) sum.titles = [...new Set([...(sum.titles ?? []), ...row.titles])];
    if (!sum.desc && row.desc) sum.desc = row.desc;
    if (row.remarks && !sum.remarks.includes(row.remarks)) sum.remarks = sum.remarks ? `${sum.remarks}; ${row.remarks}` : row.remarks;
  });
  merged.forEach((sum, key) => {
    const typed = overrides[key];
    if (typed?.qty != null) sum.qty = typed.qty;
    if (typed?.doneQty != null) sum.doneQty = typed.doneQty;
    if (typed?.status) sum.status = typed.status;
    if (typed?.actualText != null) sum.actualText = typed.actualText;
  });
  return [...merged.values()];
}
