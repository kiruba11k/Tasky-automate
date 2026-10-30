// "Plan your day" follows the person's assigned work. For one person and day, the minutes assigned per project (the tasks'
// target minutes, carried-over tasks included, see assigned.js) are compared with what the plan already holds for that project;
// the missing minutes are added as new blocks. Nothing the person planned is ever removed or shrunk. `autoPlanned` remembers
// how many minutes per project were already covered this way, so a block the person deleted or shortened is not put back, and
// only assigned minutes beyond max(planned, previously auto-planned) are added.
import { assignedDay } from "./assigned.js";

const WORK_START = 600;
const WORK_END = 1140;
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toClock = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** At most this many minutes a day are put into Extra hours automatically; the rest stays unplanned for the person to place. */
export const MAX_AUTO_EXTRA = 180;
const span = (b) => Math.max(0, toMin(b.end) - toMin(b.start));

/** Assigned minutes per project for a person's day: { [projectId]: minutes } (only projects with minutes). */
export function assignedMinutesByProject(tasks, personId, date, opts = {}) {
  const out = {};
  assignedDay(tasks ?? [], personId, date, { ...opts, logged: [] }).rows.forEach((r) => {
    if (r.estMin > 0) out[r.projectId] = (out[r.projectId] ?? 0) + r.estMin;
  });
  return out;
}

/**
 * The minutes the plan should hold per project: what the Daily update tables say (the estimated time of the day's rows) or what is
 * assigned, whichever is larger, never both added (the rows usually cover the assigned work).
 */
export function wantedMinutesByProject(assigned = {}, entries = []) {
  const logged = {};
  entries.forEach((r) => {
    if (r?.projectId && r.estMin > 0 && (r.task ?? "") !== "") logged[r.projectId] = (logged[r.projectId] ?? 0) + r.estMin;
  });
  const out = { ...assigned };
  Object.entries(logged).forEach(([pid, m]) => (out[pid] = Math.max(out[pid] ?? 0, m)));
  return out;
}

/**
 * Top the plan up to the assigned minutes. Returns null when nothing is to be added, else
 * { plan, extra, autoPlanned, added: { [projectId]: minutes } }. New blocks (marked `auto: true`) are laid after the last planned
 * block, around lunch, inside 10:00-19:00; what does not fit before 19:00 becomes Extra hours.
 * @param {{plan?: object[], extra?: object[], autoPlanned?: object, assigned: object, lunch: {start:string,end:string}, names?: object, makeId?: () => string}} a
 */
export function autoPlanBlocks({ plan = [], extra = [], autoPlanned = {}, assigned, lunch, names = {}, makeId }) {
  let seq = 0;
  const newId = makeId ?? (() => `au${Date.now().toString(36)}${++seq}`);
  const lunchStart = toMin(lunch.start);
  const lunchEnd = toMin(lunch.end);
  const planned = {};
  plan.forEach((b) => (planned[b.projectId] = (planned[b.projectId] ?? 0) + span(b)));
  extra.forEach((x) => {
    if (!x.projectId) return;
    const m = x.start && x.end && x.end > x.start ? toMin(x.end) - toMin(x.start) : (x.minutes ?? 0);
    planned[x.projectId] = (planned[x.projectId] ?? 0) + m;
  });

  const nextPlan = [...plan];
  const nextExtra = [...extra];
  const nextAuto = { ...autoPlanned };
  const added = {};
  let cursor = Math.max(WORK_START, ...plan.map((b) => toMin(b.end)));
  let extraAt = Math.max(WORK_END, cursor, ...extra.map((x) => (x.end ? toMin(x.end) : 0)));
  let extraRoom = Math.max(0, MAX_AUTO_EXTRA - extra.reduce((s, x) => s + (x.minutes ?? 0), 0));
  Object.entries(assigned).forEach(([projectId, want]) => {
    const add = want - Math.max(planned[projectId] ?? 0, autoPlanned[projectId] ?? 0);
    if (!(add > 0)) return;
    const id = newId();
    let left = add;
    let piece = 0;
    while (left > 0 && cursor < WORK_END) {
      if (cursor >= lunchStart && cursor < lunchEnd) cursor = lunchEnd;
      if (cursor >= WORK_END) break;
      let end = cursor + left;
      if (cursor < lunchStart && end > lunchStart) end = lunchStart;
      if (end > WORK_END) end = WORK_END;
      nextPlan.push({
        id: piece ? `${id}~${piece + 1}` : id,
        start: toClock(cursor),
        end: toClock(end),
        projectId,
        taskIds: [],
        auto: true,
      });
      piece++;
      left -= end - cursor;
      cursor = end;
    }
    while (left > 0 && extraRoom > 0) {
      const m = Math.min(left, extraRoom);
      extraRoom -= m;
      nextExtra.push({ id: newId(), start: toClock(extraAt), end: toClock(extraAt + m), minutes: m, work: names[projectId] || "Assigned work", projectId, auto: true });
      extraAt += m;
      left -= m;
    }
    if (left === add) return; // nothing fitted
    added[projectId] = add - left;
    nextAuto[projectId] = want - left;
  });
  if (!Object.keys(added).length) return null;
  return { plan: nextPlan, extra: nextExtra, autoPlanned: nextAuto, added };
}
