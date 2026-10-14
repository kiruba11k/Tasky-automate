import { TASK_TYPES } from "./constants.js";
import { entryAsTask, dayEntries } from "./entries.js";
import { formatMinutes } from "./domain.js";

export const EOD_HEADER = ["Date", "Project", "Tasks", "Expected Outcome", "Time", "Status", "Tasks Done"];

const STATUS = { done: "Completed", in_review: "In review", in_progress: "In Progress", changes: "Needs changes", todo: "Pending" };
const clean = (v) => String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();
const outcome = (qty, unit) => (qty > 0 ? `${qty} ${unit || ""}`.trim() : "");

/**
 * One person's end of day as rows for a sheet: Date, Project, Tasks, Expected Outcome, Time, Status, Tasks Done.
 * Assigned tasks come first, then the rows from "Daily update". A logged row that duplicates a submitted task (same project and
 * kind of work) is left out, the same way the numbers elsewhere never count it twice. Time is what was spent (the estimate when
 * nothing was logged yet).
 */
export function eodRows({ tasks, daily, projects, personId, date }) {
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? "";
  const mine = tasks.filter((t) => t.assigneeId === personId && t.date === date);
  const covered = new Set(mine.filter((t) => t.status === "done" || t.status === "in_review").map((t) => `${t.projectId}|${t.typeId}`));
  const rows = mine.map((t) => {
    const submitted = t.status === "done" || t.status === "in_review";
    const minutes = t.minutes ?? t.targetMinutes;
    return [date, projectName(t.projectId), t.title, outcome(t.qty, t.unit), minutes ? formatMinutes(minutes) : "", STATUS[t.status] ?? t.status, submitted ? (t.doneQty ?? 0) : 0];
  });
  dayEntries(daily, personId, date).forEach((e) => {
    if (!e.task || (e.task === "__custom" && !e.custom?.trim())) return;
    if (e.doneQty > 0 && covered.has(`${e.projectId}|${e.task}`)) return;
    const project = projects.find((p) => p.id === e.projectId);
    const like = entryAsTask(e, project);
    const name = TASK_TYPES.find((t) => t.id === e.task)?.name ?? like.customName;
    const minutes = e.actualMin || e.estMin;
    rows.push([date, projectName(e.projectId), e.desc ? `${name} (${e.desc})` : name, outcome(e.qty, like.unit), minutes ? formatMinutes(minutes) : "", e.doneQty > 0 ? "Completed" : "Pending", e.doneQty ?? 0]);
  });
  return rows;
}

/** Header plus rows as tab-separated text (tabs and line breaks inside a cell become spaces). */
export const toTsv = (rows, header = EOD_HEADER) => [header, ...rows].map((r) => r.map(clean).join("\t")).join("\n");
