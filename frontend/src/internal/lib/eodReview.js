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
export function eodProjectWork(record) {
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
  return [...by.values()].filter((s) => s.rows.length || s.minutes > 0).map(({ fromRows, ...rest }) => rest); // eslint-disable-line no-unused-vars
}

/**
 * The approval requests for a day that was just sent at `at`. Each project with work and a manager gets a pending request for the
 * manager; the manager's own work is approved at once (`auto`); a project without a manager is not sent anywhere.
 * Returns { reviews: { projectId: review }, sends: [{ projectId, reviewerId, rows, minutes }] } (`sends` = who to tell).
 */
export function buildEodRequests({ record, projects, personId, at }) {
  const reviews = {};
  const sends = [];
  for (const work of eodProjectWork(record)) {
    const project = projects.find((p) => p.id === work.projectId);
    if (!project?.pmId) continue;
    if (project.pmId === personId) reviews[project.id] = { status: "approved", reviewerId: personId, sentAt: at, decidedAt: at, by: personId, for: at, auto: true };
    else {
      reviews[project.id] = { status: "pending", reviewerId: project.pmId, sentAt: at };
      sends.push({ projectId: project.id, reviewerId: project.pmId, rows: work.rows.length, minutes: work.minutes });
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
export function pendingForReviewer({ daily, projects, me, seesAll = false }) {
  const mineIds = new Set(projects.filter((p) => seesAll || p.pmId === me).map((p) => p.id));
  const out = [];
  for (const [key, record] of Object.entries(daily ?? {})) {
    if (!record?.eodReviews) continue;
    const [personId, day] = key.split("|");
    if (personId === me) continue;
    for (const [projectId, review] of Object.entries(record.eodReviews)) {
      if (review?.status !== "pending" || !mineIds.has(projectId)) continue;
      out.push({ key, personId, day, projectId, review, rows: rowsOfProject(record, projectId) });
    }
  }
  return out.sort((a, b) => b.day.localeCompare(a.day) || a.personId.localeCompare(b.personId) || a.projectId.localeCompare(b.projectId));
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
