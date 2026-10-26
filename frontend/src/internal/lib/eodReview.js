// End of day approval: when a person sends their end of day, the work they report for each project goes to THAT project's
// manager (project.pmId) to approve or send back. A day record keeps it as
//   eodReviews: { [projectId]: { status: 'pending'|'approved'|'changes', reviewerId, sentAt, decidedAt?, by?, note?, for?, auto? } }
// It is only a review status: hours, metrics and snapshots never depend on it. Pure helpers, no store.
export const OTHER_PREFIX = "other:";

const planProject = (b) => (b.custom ? (b.custom.projectId ?? b.projectId) : b.projectId);
const isRow = (r) => !!r?.task;

/** The saved day table rows of one project (only the rows with a task). */
export const rowsOfProject = (record, projectId) => (record?.entries ?? []).filter((r) => isRow(r) && r.projectId === projectId);

/**
 * What a day's record reports per project: { projectId, rows, minutes }. Rows come from the Daily update tables; a project that only has
 * plan blocks or extra hours with minutes counts too (rows: []). "Other work" (not a project) and tasks assigned by others are left out.
 */
export function eodProjectWork(record, assigned = []) {
  const by = new Map();
  const slot = (pid) => {
    if (!pid || String(pid).startsWith(OTHER_PREFIX)) return null;
    if (!by.has(pid)) by.set(pid, { projectId: pid, rows: [], minutes: 0, fromRows: false });
    return by.get(pid);
  };
  for (const r of record?.entries ?? []) {
    if (!isRow(r)) continue;
    const s = slot(r.projectId);
    if (!s) continue;
    s.rows.push(r);
    s.fromRows = true;
    s.minutes += r.actualMin ?? r.estMin ?? 0;
  }
  // tasks assigned to the person (the assigned rows of the day tables) are work for their project too: they count even with no logged row
  for (const r of assigned) {
    const s = slot(r.projectId);
    if (!s || !((r.actualMin ?? r.estMin ?? 0) > 0 || r.qty > 0)) continue;
    s.assignedRows = (s.assignedRows ?? 0) + 1;
    s.assignedMin = (s.assignedMin ?? 0) + (r.actualMin ?? r.estMin ?? 0);
  }
  const extraMinutes = new Map();
  for (const b of record?.plan ?? []) {
    const pid = planProject(b);
    if (b.actualMinutes > 0) extraMinutes.set(pid, (extraMinutes.get(pid) ?? 0) + b.actualMinutes);
  }
  for (const x of record?.extra ?? []) if (x.projectId && x.minutes > 0) extraMinutes.set(x.projectId, (extraMinutes.get(x.projectId) ?? 0) + x.minutes);
  for (const [pid, min] of extraMinutes) {
    const s = slot(pid);
    if (s && !s.fromRows) s.minutes += min; // projects with rows are summed from the rows
  }
  return [...by.values()]
    .map(({ fromRows, assignedRows = 0, assignedMin = 0, ...rest }) => ({ ...rest, minutes: rest.minutes + assignedMin, assignedRows })) // eslint-disable-line no-unused-vars
    .filter((s) => s.rows.length || s.assignedRows || s.minutes > 0);
}

/** What a week's table reports per project (the rows of the Weekly update): { projectId, rows, minutes, assignedRows: 0 }. */
export function weekProjectWork(rows = []) {
  const by = new Map();
  for (const r of rows) {
    const pid = r.projectId;
    if (!pid || String(pid).startsWith(OTHER_PREFIX) || !(r.task || r.assigned)) continue;
    if (!by.has(pid)) by.set(pid, { projectId: pid, rows: [], minutes: 0, assignedRows: 0 });
    const s = by.get(pid);
    s.rows.push(r);
    s.minutes += r.actualMin ?? r.estMin ?? 0;
  }
  return [...by.values()];
}

/** Who approves a project's end of day: its manager, or the main admin (`ownerId`, the ADMIN_EMAIL account) when it has none. */
export const eodReviewerOf = (project, ownerId) => project?.pmId || ownerId || null;

/**
 * The approval requests for a day that was just sent at `at`. Each project with work and a manager gets a pending request for the
 * manager (the main admin when it has none); the approver's own work is approved at once (`auto`).
 * Returns { reviews: { projectId: review }, sends: [{ projectId, reviewerId, rows, minutes }] } (`sends` = who to tell).
 */
export function buildEodRequests({ record, projects, personId, at, ownerId, assigned = [], work }) {
  const reviews = {};
  const sends = [];
  for (const item of work ?? eodProjectWork(record, assigned)) {
    const project = projects.find((p) => p.id === item.projectId);
    const reviewer = eodReviewerOf(project, ownerId);
    if (!project || !reviewer) continue;
    if (reviewer === personId) reviews[project.id] = { status: "approved", reviewerId: personId, sentAt: at, decidedAt: at, by: personId, for: at, auto: true };
    else {
      reviews[project.id] = { status: "pending", reviewerId: reviewer, sentAt: at };
      sends.push({ projectId: project.id, reviewerId: reviewer, rows: item.rows.length + (item.assignedRows ?? 0), minutes: item.minutes });
    }
  }
  return { reviews, sends };
}

/** The review of a project on a day, or undefined. */
export const eodReviewOf = (record, projectId) => record?.eodReviews?.[projectId];

/** Short status text and tone for a review: Sent to Bheeshma for approval / Approved by Bheeshma / Changes asked: note. */
export function eodStatusText(review, reviewerFirstName = "the project manager", deciderFirstName = reviewerFirstName) {
  if (!review) return null;
  if (review.status === "approved") return { tone: "mint", text: review.auto ? "Your project, approved" : `Approved by ${deciderFirstName}` };
  if (review.status === "changes") return { tone: "coral", text: `Changes asked: ${review.note ?? ""}`.trim() };
  return { tone: "butter", text: `Sent to ${reviewerFirstName} for approval` };
}

/** "3 tasks, 2h 30m" style summary of a send. */
export function sendSummary(rows, minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const time = h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
  return `${rows} task${rows === 1 ? "" : "s"}, ${time}`;
}

/**
 * The pending requests a person decides: a project's manager sees theirs, `seesAll` (leadership) sees every project's.
 * Newest day first. Each item: { key, personId, day, projectId, review, rows }. Own work is never listed.
 */
export function pendingForReviewer({ daily, weekly, projects, me, seesAll = false, ownerId }) {
  const mineIds = new Set(projects.filter((p) => seesAll || eodReviewerOf(p, ownerId) === me).map((p) => p.id));
  const out = [];
  const collect = (records, field, kind) => {
    for (const [key, record] of Object.entries(records ?? {})) {
      if (!record?.[field]) continue;
      const [personId, day] = key.split("|");
      if (personId === me) continue;
      for (const [projectId, review] of Object.entries(record[field])) {
        if (review?.status !== "pending" || !mineIds.has(projectId)) continue;
        out.push({ key: `${kind}:${key}`, kind, personId, day, projectId, review, rows: rowsOfProject(record, projectId) });
      }
    }
  };
  collect(daily, "eodReviews", "day");
  collect(weekly, "eowReviews", "week");
  return out.sort((a, b) => b.day.localeCompare(a.day) || a.personId.localeCompare(b.personId) || a.projectId.localeCompare(b.projectId) || a.kind.localeCompare(b.kind));
}

/** Group pending items by project: [{ projectId, items }] in order of first appearance. */
export function groupByProject(items) {
  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.projectId)) groups.set(it.projectId, []);
    groups.get(it.projectId).push(it);
  }
  return [...groups].map(([projectId, list]) => ({ projectId, items: list }));
}

/**
 * The decision as a day-record patch for `eodReviews[projectId]` (it answers the send it names with `for`). Throws the same message
 * as task feedback when a send-back has no note.
 */
export function decisionFor(review, verdict, by, at, note = "") {
  if (verdict === "changes" && !note.trim()) throw new Error("Feedback cannot be empty.");
  const { note: _old, ...rest } = review; // eslint-disable-line no-unused-vars
  return { ...rest, status: verdict, by, decidedAt: at, for: review.sentAt, ...(verdict === "changes" ? { note: note.trim() } : {}) };
}

/** Projects whose end of day was sent back: their tables are open for editing again until the day is sent again. */
export const reopenedProjects = (record) => new Set(Object.entries(record?.eodReviews ?? {}).filter(([, r]) => r?.status === "changes").map(([pid]) => pid));

const workSignature = (record, assigned = []) => new Map(eodProjectWork(record, assigned).map((w) => [w.projectId, JSON.stringify([w.rows.map((r) => r.id).sort(), w.minutes])]));

/**
 * A day that is already sent had rows or plan time moved to another project (Change project). The review moves with the work:
 * a project with no work left loses its request; a project that got work gets a pending request for its manager (approved at once
 * when that is the sender, the main admin when it has no manager). A pending or sent-back request stays as it is; an approved one becomes
 * pending again because there is new work to look at. Returns { reviews, sends, changed }.
 */
export function reviewsAfterMove({ prev, record, projects, personId, at, ownerId, assigned = [], prevAssigned = assigned }) {
  const before = workSignature(prev, prevAssigned);
  const after = workSignature(record, assigned);
  const reviews = { ...(record?.eodReviews ?? {}) };
  const sends = [];
  let changed = false;
  for (const pid of Object.keys(reviews)) if (!after.has(pid)) { delete reviews[pid]; changed = true; }
  for (const [pid, sig] of after) {
    if (before.get(pid) === sig) continue;
    const project = projects.find((p) => p.id === pid);
    const reviewer = eodReviewerOf(project, ownerId);
    if (!project || !reviewer) continue;
    const cur = reviews[pid];
    if (cur && cur.status !== "approved") continue;
    if (reviewer === personId) {
      if (cur?.auto) continue;
      reviews[pid] = { status: "approved", reviewerId: personId, sentAt: at, decidedAt: at, by: personId, for: at, auto: true };
    } else {
      reviews[pid] = { status: "pending", reviewerId: reviewer, sentAt: at };
      const work = eodProjectWork(record, assigned).find((w) => w.projectId === pid);
      sends.push({ projectId: pid, reviewerId: reviewer, rows: (work?.rows.length ?? 0) + (work?.assignedRows ?? 0), minutes: work?.minutes ?? 0 });
    }
    changed = true;
  }
  return { reviews, sends, changed };
}

/** What a task is doing, as the project manager sees it next to an end of day. */
export const taskReviewLabel = (t) =>
  t.status === "done" ? "approved" : t.status === "in_review" ? "awaiting approval" : t.status === "changes" ? "changes asked" : t.status === "in_progress" ? "in progress" : "to do";

/** The person's assigned tasks for a project on a day (and the unfinished ones carried over to today), as context for the approver. */
export function assignedContext(tasks, personId, day, projectId, today) {
  return tasks.filter((t) => t.assigneeId === personId && t.projectId === projectId && (t.date === day || (day === today && t.date < today && t.status !== "done")));
}
