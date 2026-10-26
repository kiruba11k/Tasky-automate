// Assigned tasks as rows of the "Tasks update" tables. A task someone was given (by a project manager, a manager, a founder, a
// colleague or themselves) is shown next to the rows the person logs, without ever being copied into the saved day / week
// records, so it follows the task live (assigned, edited, submitted, approved, deleted). Where a person logged the same
// project and kind of work for the day, the larger of the two is used, never the sum (see targetVsActualRows): the assigned
// row only carries what the logged rows do not cover yet.
import { addDays, todayKey } from "./dates.js";
import { CUSTOM_TASK, dayAsg, dayEntries, entryAsTask } from "./entries.js";
import { TASK_TYPES } from "./constants.js";
import { isSubmitted, taskBreakdownKey, workDate } from "./domain.js";

const projectOfRow = (projects, id) => projects?.find((p) => p.id === id);

/** Dedupe key of a logged row and of an assigned task: project and kind of work. */
const rowBucket = (row, projects) => `${row.projectId}|${taskBreakdownKey(entryAsTask(row, projectOfRow(projects, row.projectId))).key}`;

/** Unfinished tasks from earlier days show on today's tables too, like the Dashboard's "carried over". */
export const isCarriedOver = (task, date, today = todayKey(0)) => date === today && task.date < today && task.status !== "done";

/**
 * The assigned rows of one person for one day: { rows, covers }. `rows` are read-only rows (assigned: true) in the shape of a
 * logged row, per project and kind of work, with the part the `logged` rows do not already cover. `covers` maps the id of a
 * logged row to the assigned tasks it stands in for. `carry: false` leaves out the carried-over tasks (used for week sums, where
 * the task is already on its own day). `carryEdits` ({ rowId: { qty, estMin, desc, hidden } }, saved in that day's record) are
 * the person's changes to the carried-over part of a row for this day only: the tasks and the earlier days are never touched.
 * `hidden` lists the carried rows the person removed from today (so they can be restored). With `defaultTaken` (the day's end of day
 * was sent) a row with no time typed or logged takes its estimate as the time taken, which the person can edit.
 */
export function assignedDay(tasks, personId, date, { projects, logged = [], today = todayKey(0), carry = true, asg = {}, carryEdits = {}, defaultTaken = false } = {}) {
  const buckets = new Map();
  tasks.forEach((t) => {
    if (t.assigneeId !== personId) return;
    const carried = carry && isCarriedOver(t, date, today);
    const finishedHere = isSubmitted(t) && workDate(t) === date; // sent in today, though assigned for an earlier day
    if (t.date !== date && !carried && !finishedHere) return;
    const planned = t.date === date || carried; // the target belongs to the assigned (or carried-over) day
    const k = taskBreakdownKey(t);
    const id = `${t.projectId}|${k.key}`;
    const b = buckets.get(id) ?? { id, k, projectId: t.projectId, tasks: [], qty: 0, done: 0, est: 0, minutes: 0, approved: false, cQty: 0, cEst: 0, cTasks: 0 };
    b.tasks.push({ t, carried: t.date !== date });
    if (planned) {
      b.qty += t.qty ?? 0;
      b.est += t.targetMinutes ?? 0;
      if (carried && t.date !== date) {
        b.cQty += t.qty ?? 0; // the carried-over part, the only part today's changes apply to
        b.cEst += t.targetMinutes ?? 0;
        b.cTasks++;
      }
    }
    if (finishedHere) {
      if (t.status === "done") {
        b.done += t.doneQty ?? 0; // the number only counts once the task is approved
        b.approved = true;
      }
      b.minutes += t.minutes ?? 0;
    }
    buckets.set(id, b);
  });
  const loggedBy = new Map();
  const loggedMin = new Map(); // per project: time typed into the tables
  logged.forEach((row) => {
    const id = rowBucket(row, projects);
    const cur = loggedBy.get(id) ?? { qty: 0, done: 0, est: 0, rows: [] };
    cur.qty += row.qty ?? 0;
    cur.done += row.doneQty ?? 0;
    cur.est += row.estMin ?? 0;
    cur.rows.push(row);
    loggedBy.set(id, cur);
    if (row.actualMin > 0) loggedMin.set(row.projectId, (loggedMin.get(row.projectId) ?? 0) + row.actualMin);
  });
  Object.values(asg ?? {}).forEach((v) => {
    if (v?.projectId && v.actualMin > 0) loggedMin.set(v.projectId, (loggedMin.get(v.projectId) ?? 0) + v.actualMin); // time typed on an assigned row
  });
  // time on submitted tasks per project: only what the typed time does not reach yet is added, so the project's day is the larger of the two
  const projectMinutes = new Map();
  buckets.forEach((b) => projectMinutes.set(b.projectId, (projectMinutes.get(b.projectId) ?? 0) + b.minutes));
  const rows = [];
  const covers = new Map();
  const hidden = [];
  const edits = carryEdits ?? {};
  buckets.forEach((b) => {
    const e = b.cTasks ? edits[`asg|${personId}|${date}|${b.id}`] : undefined;
    if (!e) return;
    const all = b.tasks.every((x) => x.carried);
    if (e.hidden) {
      hidden.push({ id: `asg|${personId}|${date}|${b.id}`, projectId: b.projectId, label: b.k.label, titles: b.tasks.filter((x) => x.carried).map((x) => x.t.title), qty: b.cQty, estMin: b.cEst });
      b.qty -= b.cQty;
      b.est -= b.cEst;
      b.tasks = b.tasks.filter((x) => !x.carried);
      if (!b.tasks.length) buckets.delete(b.id);
      return;
    }
    if (e.qty != null) b.qty += e.qty - b.cQty;
    if (e.estMin != null) b.est += e.estMin - b.cEst;
    if (e.desc) b.desc = e.desc;
    b.edited = all && (e.qty != null || e.estMin != null || !!e.desc);
  });
  [...buckets.values()]
    .sort((a, b) => a.k.order - b.k.order || a.k.label.localeCompare(b.k.label))
    .forEach((b) => {
      const l = loggedBy.get(b.id);
      let actualMin;
      if (projectMinutes.has(b.projectId)) {
        const extra = Math.max(0, projectMinutes.get(b.projectId) - (loggedMin.get(b.projectId) ?? 0));
        projectMinutes.delete(b.projectId);
        if (extra > 0) actualMin = extra;
      }
      const rowId = `asg|${personId}|${date}|${b.id}`;
      const typed = asg?.[rowId];
      const typedMin = typed?.actualMin > 0 ? typed.actualMin : undefined;
      const typedDone = typed?.doneQty > 0 ? typed.doneQty : undefined; // a number typed on the row; the approved number wins when it is larger
      const estMin = Math.max(0, b.est - (l?.est ?? 0));
      const loggedTotal = typedMin || actualMin ? (typedMin ?? 0) + (actualMin ?? 0) : undefined;
      const defaulted = !loggedTotal && defaultTaken && estMin > 0;
      const totalMin = defaulted ? estMin : loggedTotal;
      const row = {
        id: rowId,
        assigned: true,
        projectId: b.projectId,
        task: TASK_TYPES.some((x) => x.id === b.tasks[0].t.typeId) ? b.tasks[0].t.typeId : CUSTOM_TASK,
        custom: TASK_TYPES.some((x) => x.id === b.tasks[0].t.typeId) ? undefined : b.k.label,
        label: b.k.label,
        kind: "number",
        qty: Math.max(0, b.qty - (l?.qty ?? 0)),
        doneQty: Math.max(0, b.done - (l?.done ?? 0), typedDone ?? 0),
        typedDone,
        approved: b.approved && !(typedDone > b.done - (l?.done ?? 0)), // false = the number "fills in with the approved number" and is still awaiting approval
        estMin,
        actualMin: totalMin,
        defaultTime: defaulted,
        typedMin,
        remarks: typed?.remarks ?? "",
        taskIds: b.tasks.map((x) => x.t.id),
        titles: b.desc && b.tasks.every((x) => x.carried) ? [b.desc] : b.tasks.map((x) => x.t.title),
        edited: !!b.edited,
        assignedBy: [...new Set(b.tasks.map((x) => x.t.assignedById).filter(Boolean))],
        priority: b.tasks.some((x) => x.t.priority),
        statuses: b.tasks.map((x) => x.t.status),
        carriedFrom: b.tasks.every((x) => x.carried) ? b.tasks.map((x) => x.t.date).sort()[0] : undefined,
        covering: !!l,
      };
      if (l && !row.qty && !row.doneQty && !row.estMin && !row.actualMin) {
        covers.set(l.rows[0].id, row); // the logged rows already cover the whole assignment
        return;
      }
      rows.push(row);
    });
  return { rows, covers, hidden };
}

/** Today's changes to the carried-over rows of a person's day: { rowId: { qty, estMin, desc, hidden } }. */
export const dayCarryEdits = (daily, personId, date) => daily?.[`${personId}|${date}`]?.carryEdits ?? {};

/** A person's logged rows for a day followed by the assigned rows they do not cover. */
export function dayRowsWithAssigned(tasks, daily, personId, date, opts = {}) {
  const logged = dayEntries(daily, personId, date);
  return [...logged, ...assignedDay(tasks ?? [], personId, date, { carryEdits: dayCarryEdits(daily, personId, date), defaultTaken: !!daily?.[`${personId}|${date}`]?.eodAt, ...opts, logged, asg: dayAsg(daily, personId, date) }).rows];
}

/** The assigned rows (no carried-over copies) of Monday to Friday of the week of `monday`, to add to the week's rows. */
export function weekAssignedRows(tasks, daily, personId, monday, opts = {}) {
  return [0, 1, 2, 3, 4].flatMap((i) => {
    const date = addDays(monday, i);
    return assignedDay(tasks ?? [], personId, date, { ...opts, carry: false, defaultTaken: !!daily?.[`${personId}|${date}`]?.eodAt, logged: dayEntries(daily, personId, date), asg: dayAsg(daily, personId, date) }).rows;
  });
}

/** A day record whose `entries` also hold the assigned rows (for the hours maths); the saved record is left alone. */
export function recordWithAssigned(tasks, daily, personId, date, opts = {}) {
  const record = daily?.[`${personId}|${date}`];
  const entries = dayRowsWithAssigned(tasks, daily, personId, date, opts);
  return record || entries.length ? { ...record, entries } : record;
}
