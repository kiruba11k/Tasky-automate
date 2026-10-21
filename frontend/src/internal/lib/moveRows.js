// Moving work to another date: a day was a holiday, or the person was absent. Pure helpers (no store, no UI) for
//  - moving logged rows of one day record to another day record (clearing rules),
//  - finding the next working day (weekends, holidays and full-day leave are skipped),
//  - the leave/holiday kinds and which tasks of a day may be rescheduled.
import { addDays, isWeekday, todayKey } from "./dates.js";

/** Furthest day (from today) that work can be planned for. */
export const MAX_AHEAD_DAYS = 60;

/** True for a leave entry that takes the whole day off: full day leave or a holiday. A half day is still a working day. */
export const isOffLeave = (leave) => !!leave && (leave.kind === "full" || leave.kind === "holiday");

/** The leave entry of a person on a day (`jj` without the store). */
const leaveFor = (profiles, personId, date) => profiles?.[personId]?.leaves?.find((l) => l.date === date);

/** True when `date` is a weekend, a holiday or a full-day leave of the person. */
export const isOffDay = (profiles, personId, date) => !isWeekday(date) || isOffLeave(leaveFor(profiles, personId, date));

/** The next day after `date` that is a weekday and not a holiday / full-day leave of the person (looks up to 60 days ahead). */
export function nextWorkingDay(profiles, personId, date) {
  let d = addDays(date, 1);
  for (let i = 0; i < 60 && isOffDay(profiles, personId, d); i++) d = addDays(d, 1);
  return d;
}

/** The latest day a date picker accepts: `MAX_AHEAD_DAYS` after today. */
export const maxPlanDate = (today = todayKey(0)) => addDays(today, MAX_AHEAD_DAYS);

/** Fields of a row that record what happened (not what was planned). */
const ACTUAL_FIELDS = ["actualMin", "doneQty", "status", "actualText", "achieved", "remarks"];

/** A row for another day: new id, and its results cleared unless the target day has already gone by (then they stay). */
export function rowForDay(row, newId, targetDate, today = todayKey(0)) {
  const next = { ...row, id: newId };
  if (targetDate >= today) {
    ACTUAL_FIELDS.forEach((f) => delete next[f]);
    next.remarks = "";
    next.achieved = "";
    if ((row.kind ?? "number") === "milestone") next.status = "Not started";
  }
  return next;
}

/**
 * Moves rows between two day records' entries. `ids` picks the rows to move (all rows when omitted). Returns
 * { from, to, moved } (the new entries lists of both days), or null when nothing moves.
 */
export function moveRows({ fromEntries = [], toEntries = [], ids, targetDate, today = todayKey(0), newId }) {
  const pick = ids ? new Set(ids) : null;
  const moving = fromEntries.filter((r) => !pick || pick.has(r.id));
  if (!moving.length) return null;
  const made = moving.map((r) => rowForDay(r, newId(), targetDate, today));
  return { from: fromEntries.filter((r) => !moving.includes(r)), to: [...toEntries, ...made], moved: made.length };
}

/** Why work cannot be moved onto a day (a sent day, or a day outside the allowed range), or null. */
export function moveTargetProblem(targetDate, targetRecord, { today = todayKey(0) } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate ?? "")) return "Pick a date.";
  if (targetDate > maxPlanDate(today)) return `Pick a date within ${MAX_AHEAD_DAYS} days from today.`;
  if (targetRecord?.eodAt) return "That day's update was already sent, so rows cannot be added to it.";
  return null;
}

/** A task's day can be changed by the person it was given to or who gave it, while it is still open (not in review, not approved). */
export const canReschedule = (task, viewerId) =>
  !!task && ["todo", "in_progress", "changes"].includes(task.status) && (task.assigneeId === viewerId || task.assignedById === viewerId);

/** Tasks of a day the viewer may move to another day: still open (not in review, not approved) and given to or by the viewer. */
export function reschedulableTasks(tasks, personId, date, viewerId) {
  return (tasks ?? []).filter(
    (t) => t.assigneeId === personId && t.date === date && canReschedule(t, viewerId),
  );
}

/** The history entry for a rescheduled task: { action: 'rescheduled', note: '<from> to <to> by <name>' }. */
export const rescheduleNote = (from, to, name) => ({ action: "rescheduled", note: `${from} to ${to} by ${name}` });
