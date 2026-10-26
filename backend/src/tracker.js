// Lead Strategus Tracker: people, and the documents (tasks, projects, daily and weekly updates, notices, profiles, chat)
// the tracker UI keeps. The UI keeps its own rules; this module decides who may read and write which document.
// Anonymous chat: the sender of a message is kept only as owner_id and is never returned; each person's alias lives in a
// private "alias" document that only that person can read.

import { dueAlerts, OPEN, rollProject, wallClock } from './deadlines.js';

export const KINDS = ['task', 'project', 'daily', 'weekly', 'notice', 'profile', 'conv', 'msg', 'alias'];
const MAX_DOC = 1_500_000; // bytes of JSON per document (profile photos are data URLs)
const ROLES = ['founder', 'manager', 'pm', 'resource'];

/** Tracker role: founder | manager | pm | resource (derived from the user's role unless set explicitly). */
// A named project approver (the PROJECT_APPROVERS emails, or "Can approve project proposals") is at least a manager, so they get the
// team pages (People, project approvals) even when their account was not made an admin or was given another role.
const approverEmails = () => (process.env.PROJECT_APPROVERS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
const isNamedApprover = (u) => u.approver === true || approverEmails().includes(String(u.email || '').toLowerCase());
const ownRole = (u) => (u.founder ? 'founder' : ROLES.includes(u.track_role) ? u.track_role : { admin: 'manager', team_leader: 'pm' }[u.role] || 'resource');
/** An approver whose own role is below manager moves to the manager side: the team pages (People, approvals), chat and fun mode. */
const promotedApprover = (u) => isNamedApprover(u) && !['founder', 'manager'].includes(ownRole(u));
export const trackerRole = (u) => (promotedApprover(u) ? 'manager' : ownRole(u));
// Main admins (founder, manager) and project managers are all admins; only the main admins are "leadership".
const leadership = (u) => ['founder', 'manager'].includes(trackerRole(u));
const lead = (u) => leadership(u) || trackerRole(u) === 'pm';
const COLORS = { founder: 'lavender', manager: 'peach', pm: 'sky', resource: 'mint' };
const TITLES = { founder: 'Founder', manager: 'Manager', pm: 'Project Manager', resource: 'Resource' };

// Who approves project proposals: people flagged `approver` and the emails in PROJECT_APPROVERS (comma separated). Nobody else.
// If nobody qualifies yet, every manager can, so approvals never get stuck.
export const approvers = (users) => {
  const named = users.filter(isNamedApprover);
  return named.length ? named : users.filter(leadership);
};

export const publicPerson = (u) => ({
  id: u.id,
  name: u.full_name || u.email,
  role: trackerRole(u),
  title: u.designation || TITLES[trackerRole(u)],
  color: COLORS[trackerRole(u)],
  history: [],
});
const withApprovers = (users, isOwner) => { const ids = new Set(approvers(users).map((u) => u.id)); return users.map((u) => ({ ...publicPerson(u), approver: ids.has(u.id), owner: isOwner(u), tracked: u.does_tasks === true })); };

// A task only moves along these steps, so two people (or two tabs) acting on a stale screen cannot undo each other:
// an approval cannot overwrite a send-back that happened a moment earlier, and a finished task stays finished.
const TASK_STEPS = { todo: ['in_progress', 'in_review'], in_progress: ['todo', 'in_review'], changes: ['in_progress', 'in_review', 'todo'], in_review: ['done', 'changes'], done: [] };
/** Why this change of a task's status must be refused, or null. `prev` is the saved task, `next` the task after the change. */
export function taskTransitionProblem(prev, next, userId) {
  if (!prev || !next || prev.status === next.status || !(prev.status in TASK_STEPS) || !(next.status in TASK_STEPS)) return null; // only real statuses are judged
  if (!(TASK_STEPS[prev.status] || []).includes(next.status)) {
    return prev.status === 'done' ? 'This task was already approved, so your change was not saved.' : `This task is no longer ${prev.status.replace('_', ' ')} (someone else just changed it), so your change was not saved.`;
  }
  if (prev.status === 'in_review' && prev.reviewerId && prev.reviewerId !== userId) return `Only the task's reviewer can ${next.status === 'done' ? 'approve' : 'send back'} it.`;
  return null;
}

const isLink = (l) => typeof l === 'string' && l.length <= 2000 && /^https?:\/\/\S+$/i.test(l);
/** Why the links on a task are refused, or null. Links are web addresses to the sheet or doc to check. */
export function taskLinksProblem(task) {
  if (task?.links === undefined) return null;
  if (!Array.isArray(task.links) || task.links.length > 10 || !task.links.every(isLink)) return 'Links must be web addresses (at most 10).';
  return null;
}
const ENTRY_KINDS = ['number', 'milestone', 'text'];
const short = (v, n) => v === undefined || (typeof v === 'string' && v.length <= n);
const count = (v) => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e7);
/** Why the task rows of a day or week ("Daily update", "Weekly targets by project") are refused, or null. */
export function entriesProblem(doc) {
  if (doc?.entries === undefined) return null;
  const rows = doc.entries;
  if (!Array.isArray(rows) || rows.length > 300) return 'Too many task rows.';
  const ok = rows.every((r) => r && typeof r === 'object' && typeof r.id === 'string' && r.id.length <= 60 && typeof r.projectId === 'string' && r.projectId.length <= 200
    && typeof r.task === 'string' && r.task.length <= 200 && short(r.custom, 200) && short(r.desc, 500) && short(r.remarks, 1000) && count(r.qty) && count(r.estMin) && count(r.actualMin) && count(r.doneQty)
    && (r.kind === undefined || ENTRY_KINDS.includes(r.kind)) && short(r.targetText, 1000) && short(r.actualText, 1000) && short(r.status, 40) && short(r.achieved, 1000) && (r.estManual === undefined || typeof r.estManual === 'boolean'));
  return ok ? null : 'A task row is not valid.';
}

/** Why the time and notes typed on assigned-task rows of a day ("asg": { rowId: { projectId, actualMin, remarks } }) are refused, or null. */
export function asgProblem(doc) {
  if (doc?.asg === undefined) return null;
  const a = doc.asg;
  const ok = a && typeof a === 'object' && !Array.isArray(a) && Object.keys(a).length <= 300
    && Object.entries(a).every(([id, v]) => id.length <= 200 && v && typeof v === 'object' && typeof v.projectId === 'string' && v.projectId.length <= 200
      && short(v.task, 200) && short(v.custom, 200) && count(v.actualMin) && count(v.doneQty) && short(v.remarks, 1000));
  return ok ? null : 'A time or note on an assigned task is not valid.';
}

/** Why today-only edits of carried-over task rows ("carryEdits": { rowId: { qty, estMin, desc, hidden } }) are refused, or null. */
export function carryEditsProblem(doc) {
  if (doc?.carryEdits === undefined) return null;
  const c = doc.carryEdits;
  const ok = c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length <= 300
    && Object.entries(c).every(([id, v]) => id.length > 0 && id.length <= 200 && v && typeof v === 'object' && !Array.isArray(v)
      && Object.keys(v).every((k) => ['qty', 'estMin', 'desc', 'hidden'].includes(k))
      && count(v.qty) && count(v.estMin) && short(v.desc, 500) && (v.hidden === undefined || typeof v.hidden === 'boolean'));
  return ok ? null : 'A change to a carried-over task is not valid.';
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Why a day's lunch break is refused, or null. It is a start and an end time within the working day. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Why a profile's leave list is refused, or null. Each leave is a day, "full", "half" or "holiday", and a short note. */
export function leavesProblem(doc) {
  if (doc?.leaves === undefined) return null;
  const l = doc.leaves;
  const ok = Array.isArray(l) && l.length <= 400 && l.every((x) => x && typeof x === 'object' && DAY.test(x.date) && ['full', 'half', 'holiday'].includes(x.kind) && short(x.note, 300));
  return ok ? null : 'A leave needs a day, full, half or holiday, and a short note.';
}
/** Why a task's day is refused, or null. Rescheduling a task changes only this field, to a real YYYY-MM-DD day. */
export function taskDateProblem(task) {
  if (task?.date === undefined) return null;
  return typeof task.date === 'string' && DAY.test(task.date) && !Number.isNaN(Date.parse(`${task.date}T00:00:00Z`)) ? null : 'A task needs a real day (YYYY-MM-DD).';
}
/** Why a profile's task-dropdown settings are refused, or null: lists of short names, nothing else. */
export function taskMenuProblem(doc) {
  const m = doc?.taskMenu;
  if (m === undefined) return null;
  const list = (v) => v === undefined || (Array.isArray(v) && v.length <= 100 && v.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 120));
  const ok = m && typeof m === 'object' && !Array.isArray(m) && Object.keys(m).every((k) => ['hidden', 'extra', 'removed'].includes(k)) && list(m.hidden) && list(m.extra) && list(m.removed);
  return ok ? null : 'The task list settings are not valid.';
}
export function lunchProblem(doc) {
  if (doc?.lunch === undefined) return null;
  const l = doc.lunch;
  return l && typeof l === 'object' && HHMM.test(l.start) && HHMM.test(l.end) && l.start < l.end && l.start >= '10:00' && l.end <= '19:00' ? null : 'Lunch needs a start and an end between 10:00 and 19:00.';
}

const isMap = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const when = (v) => v === undefined || v === null || (typeof v === 'string' && v.length <= 40); // a saved time (ISO text), or none
const text = (v, n) => v === undefined || v === null || (typeof v === 'string' && v.length <= n);
const counts = (v) => isMap(v) && Object.keys(v).length <= 100 && Object.values(v).every((n) => n === null || (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e7));
/** A map keyed by day ("2026-10-19"), as in a project's weekPlans: every key written by this patch must be a day, null removes one. */
const byDay = (v, valueOk) => v === undefined || v === null || (isMap(v) && Object.keys(v).length <= 400 && Object.entries(v).every(([k, x]) => x === null || (DAY.test(k) && valueOk(x))));
const periods = (v) => v === undefined || v === null || (Array.isArray(v) && v.length <= 200 && v.every((w) => isMap(w) && DAY.test(w.start) && DAY.test(w.end) && w.end >= w.start));

/** What a merge patch writes (null removes a field, so it has nothing to judge). Only what a save writes is judged: older data never blocks a later save. */
const present = (patch) => (isMap(patch) ? Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== null)) : null);
/** Why the timeline of a day ("plan", "extra", times of sending) or a week is refused, or null. `doc` is the saved document. */
export function dailyProblem(patch) {
  const doc = present(patch);
  if (!doc) return null;
  const { plan, extra } = doc;
  if (plan !== undefined && !(Array.isArray(plan) && plan.length <= 100 && plan.every((b) => isMap(b) && HHMM.test(b.start) && HHMM.test(b.end) && b.start < b.end
    && text(b.id, 60) && text(b.projectId, 200) && (b.actualMinutes === undefined || b.actualMinutes === null || (typeof b.actualMinutes === 'number' && b.actualMinutes >= 0 && b.actualMinutes <= 720))))) return 'A time block is not valid.';
  if (extra !== undefined && !(Array.isArray(extra) && extra.length <= 50 && extra.every((x) => isMap(x) && typeof x.work === 'string' && x.work.length <= 300 && typeof x.minutes === 'number' && x.minutes > 0 && x.minutes <= 720
    && (x.start === undefined || HHMM.test(x.start)) && (x.end === undefined || HHMM.test(x.end))))) return 'Extra hours are not valid.';
  const stamps = ['sodAt', 'eodAt', 'actualsAt', 'entriesAt', 'entriesDoneAt'];
  if (!stamps.every((k) => when(doc[k]))) return 'A time of sending is not valid.';
  if (doc.planAt !== undefined && !(typeof doc.planAt === 'string' && doc.planAt.length <= 40 && !Number.isNaN(Date.parse(doc.planAt)))) return 'The time the plan was locked is not valid.'; // ISO text, or absent when unlocked
  if (!['sodNote', 'eodNote'].every((k) => text(doc[k], 5000))) return 'A note is too long.';
  if (!['sodTargets', 'eodActuals', 'eodSnapshot', 'snapshots', 'asg', 'carryEdits'].every((k) => doc[k] === undefined || isMap(doc[k]))) return 'A day record is not valid.';
  return null;
}
const EOD_STATUSES = ['pending', 'approved', 'changes'];
const EOD_KEYS = ['status', 'reviewerId', 'sentAt', 'decidedAt', 'by', 'note', 'for', 'auto'];
const isStamp = (v) => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
/**
 * Why a day's end-of-day reviews ("eodReviews": { projectId: { status, reviewerId, sentAt, decidedAt, by, note, for } }) are refused, or null.
 * A request is `pending` with only who reviews it and when it was sent; a decision (`approved`, `changes`) names who decided, when,
 * and which send it answers (`for` = that send's `sentAt`). A send-back needs a note.
 */
export function eodReviewsProblem(doc, field = 'eodReviews') {
  const r = doc?.[field];
  if (r === undefined || r === null) return null;
  const bad = field === 'eowReviews' ? 'An end of week approval is not valid.' : 'An end of day approval is not valid.';
  if (!isMap(r) || Object.keys(r).length > 100) return bad;
  for (const [pid, v] of Object.entries(r)) {
    if (!pid || pid.length > 200 || !isMap(v) || !Object.keys(v).every((k) => EOD_KEYS.includes(k))) return bad;
    if (!EOD_STATUSES.includes(v.status) || typeof v.reviewerId !== 'string' || !v.reviewerId || v.reviewerId.length > 200 || !isStamp(v.sentAt)) return bad;
    if (!text(v.note, 1000) || (v.by !== undefined && !(typeof v.by === 'string' && v.by.length <= 200)) || (v.auto !== undefined && typeof v.auto !== 'boolean')) return bad;
    if (v.decidedAt !== undefined && !isStamp(v.decidedAt)) return bad;
    if (v.for !== undefined && !isStamp(v.for)) return bad;
    if (v.status === 'pending') { if (['decidedAt', 'by', 'note', 'for', 'auto'].some((k) => v[k] !== undefined)) return bad; continue; }
    if (!v.decidedAt || !v.by) return bad;
    if (v.status === 'changes' && !(typeof v.note === 'string' && v.note.trim())) return 'Feedback cannot be empty.';
  }
  return null;
}
export function weeklyProblem(patch) {
  const doc = present(patch);
  if (!doc) return null;
  if (!['targetsAt', 'eowAt', 'entriesAt', 'entriesDoneAt'].every((k) => when(doc[k]))) return 'A time of sending is not valid.';
  if (!['targetsNote', 'eowNote'].every((k) => text(doc[k], 5000))) return 'A note is too long.';
  if (!['eowSnapshot', 'targetsSnapshot', 'snapshots', 'overrides'].every((k) => doc[k] === undefined || isMap(doc[k]))) return 'A week record is not valid.';
  return null;
}
/** Why a profile is refused, or null: its own settings must be the kind of value the screens save. Photos are small images. */
export function profileProblem(patch) {
  const doc = present(patch);
  if (!doc) return null;
  const bool = ['dark', 'cartoon', 'mascot', 'fun', 'funOn', 'alertSound'];
  if (!bool.every((k) => doc[k] === undefined || typeof doc[k] === 'boolean')) return 'A setting must be on or off.';
  if (!text(doc.name, 100) || !text(doc.emoji, 40) || !text(doc.theme, 60) || !text(doc.accent, 60)) return 'A profile text is too long.';
  if (!(doc.photo === undefined || (typeof doc.photo === 'string' && (doc.photo === '' || /^data:image\//.test(doc.photo))))) return 'A photo must be an image.';
  if (!(doc.qotd === undefined || ['quote', 'joke'].includes(doc.qotd))) return 'The quote setting is not valid.';
  if (!['myTheme', 'custom', 'prefs', 'water'].every((k) => doc[k] === undefined || isMap(doc[k]))) return 'A setting is not valid.';
  const hex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  if (!(doc.sheetColor === undefined || hex(doc.sheetColor))) return 'A table header colour must be a hex colour like #7B1A48.';
  if (!(doc.sheetColors === undefined || (isMap(doc.sheetColors) && Object.keys(doc.sheetColors).length <= 50
    && Object.entries(doc.sheetColors).every(([k, v]) => k.length > 0 && k.length <= 80 && hex(v))))) return 'Table header colours must be hex colours like #7B1A48.';
  return null;
}
/**
 * Why the parts of a project that this patch changes are refused, or null. Only what the patch writes is judged (a project saved
 * before a rule existed can still be edited elsewhere). Weeks and months are runs of days, plans and texts are keyed by their first day.
 */
export function projectProblem(patch) {
  if (!isMap(patch)) return null;
  const listOk = (v) => v === undefined || v === null || (Array.isArray(v) && v.length <= 200);
  if (!periods(patch.customWeeks) || !periods(patch.customMonths)) return 'A week or month needs a first and a last day.';
  if (!byDay(patch.weekPlans, counts) || !byDay(patch.monthPlans, counts) || !byDay(patch.weekActuals, counts)) return 'Targets must be numbers of zero or more for a week or month that starts on a day.';
  if (!byDay(patch.weekText, Array.isArray) || !byDay(patch.monthText, Array.isArray) || !byDay(patch.weekOff, (x) => Array.isArray(x) || typeof x === 'boolean')
    || !byDay(patch.monthOff, (x) => Array.isArray(x) || typeof x === 'boolean') || !byDay(patch.weekDoneAt, (x) => text(x, 40))) return 'A week or month note is not valid.';
  if (!(patch.periodBin === undefined || patch.periodBin === null || (Array.isArray(patch.periodBin) && patch.periodBin.length <= 200 && patch.periodBin.every((b) => isMap(b) && typeof b.id === 'string' && ['week', 'month'].includes(b.period) && isMap(b.week))))) return 'The bin of weeks and months is not valid.';
  if (!(patch.typeMinutes === undefined || patch.typeMinutes === null || counts(patch.typeMinutes))) return 'Standard times must be numbers of zero or more.';
  if (!listOk(patch.typesOff) || !listOk(patch.meetings) || !listOk(patch.updates) || !listOk(patch.teamIds) || !listOk(patch.admins) || !listOk(patch.metrics) || !listOk(patch.customStandards)) return 'A list on the project is not valid.';
  if (!(patch.customStandards === undefined || patch.customStandards === null || patch.customStandards.every((c) => isMap(c) && (c.metric === undefined || c.metric === null || text(c.metric, 60))))) return 'The number a standard task counts toward is not valid.';
  if (!(patch.status === undefined || ['pending', 'active'].includes(patch.status))) return 'The project status is not valid.';
  if (!(patch.template === undefined || patch.template === null || (typeof patch.template === 'string' && /^[a-z0-9_-]{1,40}$/.test(patch.template)))) return 'The project template is not valid.';
  if (!(patch.metrics === undefined || patch.metrics === null || (Array.isArray(patch.metrics) && patch.metrics.length <= 30
    && patch.metrics.every((m) => isMap(m) && text(m.id, 60) && m.id && text(m.label, 60) && typeof m.label === 'string' && m.label.trim()
      && (m.unit === undefined || text(m.unit, 40)) && (m.periods === undefined || (Array.isArray(m.periods) && m.periods.every((p) => p === 'week' || p === 'month'))))
    && new Set(patch.metrics.map((m) => m.id)).size === patch.metrics.length))) return 'The numbers a project tracks are not valid (a name and a unique id each, at most 30).';
  return null;
}

/** RFC 7386 JSON merge patch: objects merge key by key, arrays and scalars replace, null removes a key. */
export function mergePatch(target, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = mergePatch(out[k], v);
  }
  return out;
}

const bornAt = (r) => (Number.isFinite(r.born) ? r.born : new Date(r.created_date).getTime());
export const CHAT_TTL_MS = (Number(process.env.CHAT_TTL_MINUTES) || 24 * 60) * 60 * 1000; // chat messages and conversations live for one day (CHAT_TTL_MINUTES overrides, for testing)

export function registerTracker(app, { store, wrap, isOwner = () => false, clock = Date.now, push = null, env = process.env }) {
  // Live updates: every connected tab is told when documents change, then asks for what it may see (/docs?since=).
  const listeners = new Set();
  const announce = (what = 'changed') => listeners.forEach((res) => { try { res.write(`data: ${what}\n\n`); } catch { listeners.delete(res); } });
  app.get('/api/tracker/stream', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write(': connected\n\n');
    listeners.add(res);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(heartbeat); listeners.delete(res); });
  });

  // Writes to documents run one at a time: a change is read, merged and saved without another request (or the sweeps below)
  // reading the same document in between, so two people saving the same project in the same instant both keep their change.
  let queue = Promise.resolve();
  const serial = (fn) => { const run = queue.then(fn, fn); queue = run.catch(() => {}); return run; };

  const live = async () => (await store.list('User', { limit: 1000 })).filter((u) => u.status !== 'Inactive');
  const find = async (kind, key) => (await store.list('TrackerDoc', { query: { kind, key }, limit: 1 }))[0];
  const convMembers = async (convId) => {
    const conv = await find('conv', convId);
    return conv && !conv.deleted ? conv.data?.memberIds || [] : [];
  };

  /** May `u` see this document? */
  async function canRead(u, doc) {
    const d = doc.data || {};
    switch (doc.kind) {
      case 'notice': return d.to === u.id;
      case 'alias': return trackerRole(u) !== 'founder' && doc.key.startsWith(`${u.id}:`);
      case 'config': return false; // server-only settings (push keys, push subscriptions, alert bookkeeping)
      case 'conv': return trackerRole(u) !== 'founder' && (d.memberIds || []).includes(u.id); // founders have no anonymous chat
      case 'msg': return trackerRole(u) !== 'founder' && (await convMembers(d.convId)).includes(u.id);
      default: return true; // tasks, projects, daily, weekly and profiles are shared inside the team
    }
  }

  /**
   * "Send for approval": work nobody assigned goes straight to a reviewer as a task that starts in review. It must be the
   * sender's own work on a project they are on, and a resource's work still goes only to the project's manager.
   */
  async function adhocApprovalOk(u, data) {
    const mine = (id) => id === u.id;
    if (data.adhoc !== true || data.status !== 'in_review' || !mine(data.assigneeId) || !mine(data.assignedById) || !data.reviewerId || mine(data.reviewerId)) return false;
    const project = (await find('project', data.projectId))?.data;
    if (!project || project.status !== 'active') return false;
    if (!leadership(u) && !(project.pmId === u.id || (project.teamIds || []).includes(u.id) || (project.admins || []).includes(u.id))) return false;
    if (trackerRole(u) === 'resource') return data.reviewerId === project.pmId;
    return (await live()).some((x) => x.id === data.reviewerId);
  }

  /** The rest of a part-approved task: a new "changes" task (rework) cloned from one the user is reviewing. */
  async function reworkOk(u, data) {
    if (!data?.reworkOf || data.status !== 'changes') return false;
    const orig = (await find('task', data.reworkOf))?.data;
    return !!orig && orig.reviewerId === u.id && orig.assigneeId === data.assigneeId && orig.projectId === data.projectId;
  }

  /** A team member's own assignment: a new to-do from them, for anyone, on an active project they are on. */
  async function assignOk(u, data) {
    if (!data || data.assignedById !== u.id || data.status !== 'todo' || data.reviewerId || data.adhoc || data.approvedAt || (data.reviews || []).length) return false;
    if (!(await live()).some((x) => x.id === data.assigneeId)) return false;
    const project = (await find('project', data.projectId))?.data;
    return !!project && project.status === 'active' && (project.pmId === u.id || (project.teamIds || []).includes(u.id) || (project.admins || []).includes(u.id));
  }

  const eodChanged = (data, prev, field = 'eodReviews') => {
    const a = data?.[field] || {};
    const b = prev?.[field] || {};
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((pid) => JSON.stringify(a[pid]) !== JSON.stringify(b[pid]));
  };

  /** The owner of a day sends its end of day to each project's manager: a pending request for that manager (or, on their own project, approved at once). */
  async function eodOwnerOk(u, data, prev, field = 'eodReviews') {
    for (const pid of eodChanged(data, prev, field)) {
      const v = data[field]?.[pid];
      if (v === undefined) continue; // a request taken back
      const project = (await find('project', pid))?.data;
      if (!project) return false;
      const reviewer = project.pmId || (await live()).find(isOwner)?.id; // a project without a manager goes to the main admin (ADMIN_EMAIL)
      if (!reviewer) return false;
      if (reviewer === u.id) { if (!(v.status === 'approved' && v.reviewerId === u.id && v.by === u.id && v.auto === true && v.for === v.sentAt)) return false; continue; }
      if (!(v.status === 'pending' && v.reviewerId === reviewer)) return false;
    }
    return true;
  }

  /** Someone else's day: only the end of day decision on a project, by that project's manager or the main admins, and nothing else on the record. */
  async function eodDecisionOk(u, data, prev, changed, field = 'eodReviews') {
    if (!prev || changed.length !== 1 || changed[0] !== field) return false;
    const pids = eodChanged(data, prev, field);
    if (!pids.length) return false;
    for (const pid of pids) {
      const v = data[field]?.[pid];
      const was = prev[field]?.[pid];
      if (!v || !was) return false;
      const project = (await find('project', pid))?.data;
      if (!project || !(leadership(u) || (project.pmId ? project.pmId === u.id : isOwner(u)))) return false;
      if (!['approved', 'changes'].includes(v.status) || v.by !== u.id || v.reviewerId !== was.reviewerId || v.sentAt !== was.sentAt || v.for !== was.sentAt || v.auto) return false; // the answer to the request as it stands
    }
    return true;
  }

  /** May `u` write `data` to this document? `prev` is the stored data (undefined for a new document). */
  async function canWrite(u, kind, key, data, prev, changed = [], deleting = false, existing = null) {
    const mine = (id) => id === u.id;
    switch (kind) {
      case 'task': {
        const t = prev || data;
        if (!prev) {
          if (lead(u) && (mine(data.assignedById) || leadership(u))) return true; // managers and PMs give out tasks
          if (await reworkOk(u, data)) return true; // the reviewer sends the rest of a part-approved task back
          if (await adhocApprovalOk(u, data)) return true; // anyone may send their own unassigned work for approval
          return assignOk(u, data); // and a resource may hand a task to anyone, on a project they are on
        }
        if (deleting) return lead(u) || mine(prev.assignedById); // the assignee cannot delete their own task
        // Review rules. A task is approved (done) or sent back (changes) only by its reviewer. Work by a resource is always
        // reviewed by the project manager of its project. Only the current reviewer can pass the review to someone else.
        if (['done', 'changes'].includes(data.status) && data.status !== prev.status && !mine(prev.reviewerId)) return false;
        if (data.reviewerId !== prev.reviewerId && changed.includes('reviewerId')) {
          const submitting = data.status === 'in_review' && prev.status !== 'in_review';
          if (!submitting && !mine(prev.reviewerId)) return false;
        }
        if (data.status === 'in_review' && prev.status !== 'in_review') {
          const assignee = (await live()).find((x) => x.id === data.assigneeId);
          if (assignee && trackerRole(assignee) === 'resource') {
            const project = (await find('project', data.projectId))?.data;
            if (!project || data.reviewerId !== project.pmId) return false;
          }
        }
        return lead(u) || [t.assigneeId, t.assignedById, t.reviewerId, ...(t.history || []).map((h) => h.to)].some(mine);
      }
      case 'project': {
        const p = prev || data;
        const approves = (await live()).length ? approvers(await live()).some((a) => mine(a.id)) : false;
        // Only approvers put a project live, decline a proposal, or approve one. Everyone else proposes (status pending).
        if (!prev && data.status !== 'pending' && !approves) return false;
        if (deleting && !approves && !mine(p.pmId)) return false; // only an approver or the project's manager deletes a project
        if (prev?.status === 'pending' && (changed.includes('status') || deleting) && !approves && !(deleting && mine(prev.pmId))) return false;
        if (leadership(u) || mine(p.pmId)) return true; // the project's owner and the main admins edit everything
        if (prev && (prev.admins || []).includes(u.id)) {
          // an admin edits the project but cannot hand it over, pick other admins, or remove anyone but themselves
          if (changed.includes('pmId') && data.pmId !== prev.pmId) return false;
          if (changed.includes('admins') && !(Array.isArray(data.admins) && data.admins.every((a) => (prev.admins || []).includes(a)) && (prev.admins || []).filter((a) => !data.admins.includes(a)).every(mine))) return false;
          return true;
        }
        // everyone else on the team may only record that a day was finalized (when they send their end of day)
        return !!prev && (prev.teamIds || []).includes(u.id) && changed.every((k) => k === 'finalized');
      }
      case 'daily': return key.startsWith(`${u.id}|`) ? eodOwnerOk(u, data, prev) : eodDecisionOk(u, data, prev, changed); // a person's own days; another person's day only gets end of day decisions
      case 'weekly': return key.startsWith(`${u.id}|`) ? eodOwnerOk(u, data, prev, 'eowReviews') : eodDecisionOk(u, data, prev, changed, 'eowReviews'); // a person's own weeks; another person's week only gets end of week decisions
      case 'profile': return mine(key);
      case 'notice': return !prev || mine(prev.to); // anyone can notify, only the recipient marks it read
      case 'conv': case 'msg': case 'alias':
        if (trackerRole(u) === 'founder') return false; // founders have no anonymous chat, and nobody can add them to a group
        if (kind === 'conv' && !deleting && Array.isArray(data?.memberIds) && (await live()).some((x) => trackerRole(x) === 'founder' && data.memberIds.includes(x.id))) return false;
        return canWriteChat(u, kind, key, data, prev, deleting, existing);
      default: return false;
    }
  }

  async function canWriteChat(u, kind, key, data, prev, deleting, existing) {
    switch (kind) {
      case 'conv':
        if (deleting) return (prev.memberIds || []).includes(u.id) && ((prev.memberIds || []).every((m) => m === u.id) || existing?.owner_id === u.id);
        return (data.memberIds || []).includes(u.id) || (prev?.memberIds || []).includes(u.id);
      case 'msg':
        if (deleting) return existing?.owner_id === u.id || (await convMembers(prev.convId)).every((m) => m === u.id); // the sender (never revealed), or the last person left in the chat
        return !prev && (await convMembers(data.convId)).includes(u.id) && (data.from == null || data.from === u.id); // a named chat message carries its sender, who can only be the writer
      case 'alias': return key.startsWith(`${u.id}:`);
      default: return false;
    }
  }

  // A conversation is told whether *you* created it (so only the creator is offered "delete the group"); who created it is never revealed.
  const out = (doc, user) => ({ kind: doc.kind, key: doc.key, data: doc.deleted ? null : doc.kind === 'conv' && user ? { ...doc.data, creator: doc.owner_id === user.id } : doc.data, deleted: !!doc.deleted, updated: new Date(doc.updated_date).toISOString() });

  app.get('/api/tracker/people', wrap(async (req, res) => {
    res.json(withApprovers(await live(), isOwner).sort((a, b) => a.name.localeCompare(b.name)));
  }));

  // Everything this person may see; pass `since` (an ISO time from an earlier response's `now`) to get only changes.
  app.get('/api/tracker/docs', wrap(async (req, res) => {
    const since = typeof req.query.since === 'string' ? req.query.since : '';
    if (since && Number.isNaN(Date.parse(since))) return res.status(400).json({ error: 'since must be a time' });
    const now = new Date(clock()).toISOString();
    const rows = await store.list('TrackerDoc', { sort: 'updated_date', limit: 100000, since: since || undefined });
    const docs = [];
    for (const r of rows) {
      if (!since && r.deleted) continue; // a first load has no use for tombstones
      if (r.kind === 'msg' && !r.deleted && clock() - bornAt(r) > CHAT_TTL_MS) continue; // expired, the sweep will remove it
      if (await canRead(req.user, r)) docs.push(out(r, req.user));
    }
    res.json({ now, docs });
  }));

  // Apply a batch of changes: { patches: [{kind, key, patch}], deletes: [{kind, key}] }. `patch` is a JSON merge patch
  // (a whole document for a new one). Each item answers on its own.
  app.post('/api/tracker/docs/batch', wrap((req, res) => serial(async () => {
    const u = req.user;
    const results = [];
    const items = [
      ...(Array.isArray(req.body?.patches) ? req.body.patches.map((p) => ({ ...p, del: false })) : []),
      ...(Array.isArray(req.body?.deletes) ? req.body.deletes.map((p) => ({ ...p, del: true })) : []),
    ].slice(0, 500);
    for (const it of items) {
      const { kind, key } = it;
      const id = { kind, key };
      if (!KINDS.includes(kind) || typeof key !== 'string' || !key || key.length > 200) { results.push({ ...id, ok: false, error: 'Bad document id' }); continue; }
      const existing = await find(kind, key);
      const prev = existing && !existing.deleted ? existing.data : undefined;
      if (it.del) {
        if (!existing || existing.deleted) { results.push({ ...id, ok: true }); continue; }
        if (!(await canWrite(u, kind, key, prev, prev, [], true, existing))) { results.push({ ...id, ok: false, error: 'Not allowed' }); continue; }
        // the data stays (it is never served) so that people who could see the document are told it is gone
        await store.update('TrackerDoc', existing.id, { deleted: true, data: prev, owner_id: u.id });
        if (kind === 'task') { await mirrorTask(key, prev, true); await syncEntryMirrors(prev.assigneeId, prev.date); }
        if (kind === 'conv') await purgeConv(key); // the group's messages and everybody's names in it go with it
        results.push({ ...id, ok: true });
        continue;
      }
      const patch = kind === 'conv' && it.patch && typeof it.patch === 'object' ? (({ creator, ...rest }) => rest)(it.patch) : it.patch; // the creator flag is computed, never stored
      if (!patch || typeof patch !== 'object' || Array.isArray(patch) || JSON.stringify(patch).length > MAX_DOC) { results.push({ ...id, ok: false, error: 'Bad document' }); continue; }
      const data = mergePatch(prev || {}, patch);
      if (JSON.stringify(data).length > MAX_DOC) { results.push({ ...id, ok: false, error: 'Document too large' }); continue; }
      const changed = Object.keys(patch);
      if (kind === 'task') {
        const why = taskTransitionProblem(prev, data, u.id) || taskLinksProblem(data) || taskDateProblem(data);
        if (why) { results.push({ ...id, ok: false, error: why }); continue; }
      }
      if (kind === 'daily' || kind === 'weekly') {
        const why = entriesProblem(data) || asgProblem(data) || carryEditsProblem(data) || lunchProblem(data) || (kind === 'daily' ? dailyProblem(patch) || eodReviewsProblem(data) : weeklyProblem(patch) || eodReviewsProblem(data, 'eowReviews'));
        if (why) { results.push({ ...id, ok: false, error: why }); continue; }
      }
      if (kind === 'profile') {
        const why = leavesProblem(data) || taskMenuProblem(data) || lunchProblem(data) || profileProblem(patch);
        if (why) { results.push({ ...id, ok: false, error: why }); continue; }
      }
      if (kind === 'project') {
        const why = projectProblem(patch);
        if (why) { results.push({ ...id, ok: false, error: why }); continue; }
      }
      if (!(await canWrite(u, kind, key, data, prev, changed))) { results.push({ ...id, ok: false, error: 'Not allowed' }); continue; }
      // a conversation keeps its creator as owner, whoever edits it later (renaming, leaving)
      if (existing) await store.update('TrackerDoc', existing.id, { data, deleted: false, owner_id: kind === 'conv' && !existing.deleted ? existing.owner_id : u.id });
      else await store.insert('TrackerDoc', { kind, key, data, owner_id: u.id, deleted: false, born: clock() }, u.email);
      if (kind === 'task') { await mirrorTask(key, data, false); await syncEntryMirrors(data.assigneeId, data.date); if (prev?.date && prev.date !== data.date) await syncEntryMirrors(prev.assigneeId, prev.date); }
      if (kind === 'daily') { const [who, day] = key.split('|'); await syncEntryMirrors(who, day); }
      if (kind === 'notice' && !existing && data.to && data.to !== u.id && !data.read) pushNotice(data);
      results.push({ ...id, ok: true });
    }
    if (results.some((r) => r.ok)) announce();
    res.json({ results });
  })));

  /**
   * The fun layer (levels, streaks, quests, the weekly boss, the daily wheel) counts finished work in DailyTask records.
   * Every tracker task keeps one such record in step with it: Completed once the reviewer approves.
   */
  const SAME = (a, b) => Object.keys(b).every((k) => a[k] === b[k]);
  async function mirrorTask(key, doc, deleted, pre = null) {
    const existing = pre ? pre.mirrors.get(key) : (await store.list('DailyTask', { query: { tracker_key: key }, limit: 1 }))[0];
    if (deleted || !doc?.assigneeId) { if (existing) await store.remove('DailyTask', existing.id); return; }
    const status = { done: 'Completed', in_progress: 'In Progress', in_review: 'In Progress', changes: 'In Progress' }[doc.status] || 'Pending';
    const day = (iso) => String(iso || '').slice(0, 10);
    const rec = {
      tracker_key: key,
      user_id: doc.assigneeId,
      date: status === 'Completed' ? day(doc.approvedAt) || day(new Date(clock()).toISOString()) : day(doc.date) || day(new Date(clock()).toISOString()),
      task: String(doc.title || 'Task'),
      expected_outcome: String(doc.title || 'Task'),
      expected_time: Math.max(0.1, (Number(doc.targetMinutes) || 6) / 60),
      actual_time_taken: Math.max(0, (Number(doc.minutes) || 0) / 60),
      task_status: status,
      priority: doc.priority ? 'High' : 'Medium',
      file_source: 'manual',
    };
    if (existing) { if (!SAME(existing, rec)) await store.update('DailyTask', existing.id, rec); } // nothing is written when it already matches (a restart rechecks everything)
    else await store.insert('DailyTask', rec);
  }
  /**
   * Work ticked off in a person's day tables counts for the fun layer (levels, streaks, quests) like an approved task does: each
   * done row keeps one Completed DailyTask in step with it. A row is skipped where a submitted task already covers the same
   * project and kind of work that day, so nothing is counted twice, and rows that are removed or unticked lose their record.
   */
  async function syncEntryMirrors(personId, date, pre = null) {
    if (!personId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return;
    const doc = pre ? pre.daily.get(`${personId}|${date}`) : await find('daily', `${personId}|${date}`);
    const rows = doc && !doc.deleted && Array.isArray(doc.data?.entries) ? doc.data.entries : [];
    const covered = new Set((pre ? pre.tasks : await store.list('TrackerDoc', { query: { kind: 'task' }, limit: 100000 }))
      .filter((d) => !d.deleted && d.data?.assigneeId === personId && d.data?.date === date && ['done', 'in_review'].includes(d.data?.status))
      .map((d) => `${d.data.projectId}|${d.data.typeId}`));
    const want = new Map();
    rows.forEach((e) => { if (e.doneQty > 0 && e.task && !covered.has(`${e.projectId}|${e.task}`)) want.set(`entry:${personId}|${date}:${e.id}`, e); });
    const have = (pre ? pre.entries.get(`${personId}|${date}`) ?? [] : await store.list('DailyTask', { query: { user_id: personId, date }, limit: 1000 })).filter((r) => String(r.tracker_key || '').startsWith('entry:'));
    for (const r of have) if (!want.has(r.tracker_key)) await store.remove('DailyTask', r.id);
    for (const [key, e] of want) {
      const name = String(e.custom || e.desc || e.task).slice(0, 120);
      const rec = { tracker_key: key, user_id: personId, date, task: `Logged: ${name}`, expected_outcome: `${e.qty || e.doneQty} ${name}`, expected_time: Math.max(0.1, (Number(e.estMin) || 6) / 60), actual_time_taken: Math.max(0, (Number(e.actualMin) || 0) / 60), task_status: 'Completed', priority: 'Medium', file_source: 'manual' };
      const old = have.find((r) => r.tracker_key === key);
      if (old) { if (!SAME(old, rec)) await store.update('DailyTask', old.id, rec); } else await store.insert('DailyTask', rec);
    }
  }
  /** Brings every fun-layer record in step with the documents (after an update of the server). Reads everything once, so it stays quick with thousands of documents. */
  async function backfillMirrors() {
    const dailies = await store.list('TrackerDoc', { query: { kind: 'daily' }, limit: 100000 });
    const tasks = await store.list('TrackerDoc', { query: { kind: 'task' }, limit: 100000 });
    const records = await store.list('DailyTask', { limit: 1000000 });
    const pre = { daily: new Map(dailies.map((d) => [d.key, d])), tasks, mirrors: new Map(records.map((r) => [r.tracker_key, r])), entries: new Map() };
    for (const r of records) if (String(r.tracker_key || '').startsWith('entry:')) { const k = `${r.user_id}|${r.date}`; pre.entries.set(k, [...(pre.entries.get(k) ?? []), r]); }
    for (const d of dailies) { const [who, day] = String(d.key).split('|'); await syncEntryMirrors(who, day, pre); }
    for (const d of tasks) await mirrorTask(d.key, d.data, !!d.deleted, pre);
  }
  setTimeout(() => backfillMirrors().catch((e) => console.error('mirror backfill failed:', e)), 3000).unref?.();

  const PUSH_TITLES = { chat: '💬 New message', deadline: '⏰ Deadline', task: '📋 Tasks' };
  /** Sends a notice to the person's devices as a desktop / phone notification (fire and forget). */
  function pushNotice(n) {
    if (!push) return;
    push.sendTo(n.to, { title: PUSH_TITLES[n.kind] || PUSH_TITLES.task, body: String(n.text || '').slice(0, 200), tag: n.id, kind: n.kind || 'task', url: '/' }).catch(() => {});
  }

  /**
   * Deadline alerts: an hour before the end of a task's day, 15 minutes before, when it is overdue (the assigner is told too),
   * then once a morning while it stays open. Each alert is a notice (so it shows in the app) and a push (so it reaches the desktop).
   */
  const deadlineSweep = () => serial(deadlineSweepNow);
  async function deadlineSweepNow() {
    const tasks = (await store.list('TrackerDoc', { query: { kind: 'task' }, limit: 100000 })).filter((d) => !d.deleted && OPEN.includes(d.data?.status)).map((d) => d.data);
    if (!tasks.length) return 0;
    const stateDoc = (await store.list('TrackerDoc', { query: { kind: 'config', key: 'alerts' }, limit: 1 }))[0];
    const sent = { ...(stateDoc?.data?.sent || {}) };
    const users = await live();
    const nameOf = (id) => (users.find((u) => u.id === id)?.full_name || 'Someone').split(' ')[0];
    const alerts = dueAlerts({ tasks, nowMs: clock(), tz: env.WORK_TZ || 'Asia/Kolkata', endHour: Number(env.WORK_END_HOUR) || 19, sent, nameOf });
    const now = new Date(clock()).toISOString();
    const post = async (to, text, level, taskId) => {
      const key = `dl-${taskId}-${level}-${to}`;
      const n = { id: key, to, text, at: now, read: false, kind: 'deadline', taskId };
      if (!(await find('notice', key))) await store.insert('TrackerDoc', { kind: 'notice', key, data: n, owner_id: 'system', deleted: false, born: clock() }, 'system');
      pushNotice(n);
    };
    for (const a of alerts) {
      sent[`${a.taskId}|${a.level}`] = clock();
      await post(a.to, a.text, a.level, a.taskId);
      if (a.alsoTell) await post(a.alsoTell.to, a.alsoTell.text, a.level, a.taskId);
    }
    if (alerts.length) {
      for (const k of Object.keys(sent)) if (clock() - sent[k] > 7 * 86400000) delete sent[k];
      if (stateDoc) await store.update('TrackerDoc', stateDoc.id, { data: { sent } });
      else await store.insert('TrackerDoc', { kind: 'config', key: 'alerts', data: { sent }, owner_id: 'system', deleted: false, born: clock() }, 'system');
      announce();
    }
    return alerts.length;
  }
  /** Moves every project's week / month numbers into the history when a new week or month has begun (see rollProject). */
  const rollProjects = () => serial(rollProjectsNow);
  async function rollProjectsNow() {
    const today = wallClock(clock(), env.WORK_TZ || 'Asia/Kolkata').date;
    let n = 0;
    for (const d of await store.list('TrackerDoc', { query: { kind: 'project' }, limit: 100000 })) {
      if (d.deleted || !d.data) continue;
      const rolled = rollProject(d.data, today);
      if (rolled !== d.data) { await store.update('TrackerDoc', d.id, { data: rolled }); n += 1; }
    }
    if (n) announce();
    return n;
  }
  if (env.DEADLINE_ALERTS !== 'off') {
    const rp = setInterval(() => rollProjects().catch((e) => console.error('project roll failed:', e)), 60 * 1000);
    rp.unref?.();
    setTimeout(() => rollProjects().catch(() => {}), 4000).unref?.();
  }
  if (env.DEADLINE_ALERTS !== 'off') {
    const dl = setInterval(() => deadlineSweep().catch((e) => console.error('deadline sweep failed:', e)), 60 * 1000);
    dl.unref?.();
  }

  /** Removes a deleted conversation's messages and everybody's aliases in it (the data stays, unserved, so members are told they are gone). */
  async function purgeConv(convId) {
    const gone = (r) => store.update('TrackerDoc', r.id, { deleted: true, data: r.data, owner_id: r.owner_id });
    for (const m of await store.list('TrackerDoc', { query: { kind: 'msg' }, limit: 100000 })) if (!m.deleted && m.data?.convId === convId) await gone(m);
    for (const a of await store.list('TrackerDoc', { query: { kind: 'alias' }, limit: 100000 })) if (!a.deleted && a.key.split(':').slice(1).join(':') === convId) await gone(a);
  }

  /**
   * Chat is short lived: a message is deleted one day after it was sent, and a conversation (with everybody's aliases in it)
   * one day after its last message. This runs on the server, so it does not matter who has the page open.
   */
  const sweepChat = () => serial(sweepChatNow);
  async function sweepChatNow() {
    const now = clock();
    const old = (r) => now - bornAt(r) > CHAT_TTL_MS;
    const gone = (r) => store.update('TrackerDoc', r.id, { deleted: true, data: r.data, owner_id: r.owner_id }); // data stays: it is never served, but tells members it is gone
    const msgs = await store.list('TrackerDoc', { query: { kind: 'msg' }, limit: 100000 });
    let removed = 0;
    for (const m of msgs.filter((x) => !x.deleted && old(x))) { await gone(m); removed += 1; }
    const lastActivity = new Map(); // conversation id -> newest message time (expired or not)
    for (const m of msgs) {
      const c = m.data?.convId;
      if (c) lastActivity.set(c, Math.max(lastActivity.get(c) || 0, bornAt(m)));
    }
    const convs = await store.list('TrackerDoc', { query: { kind: 'conv' }, limit: 100000 });
    const dead = new Set();
    for (const c of convs.filter((x) => !x.deleted)) {
      if (now - Math.max(bornAt(c), lastActivity.get(c.key) || 0) > CHAT_TTL_MS) { await gone(c); dead.add(c.key); removed += 1; }
    }
    if (dead.size) {
      for (const a of await store.list('TrackerDoc', { query: { kind: 'alias' }, limit: 100000 })) {
        if (!a.deleted && dead.has(a.key.split(':').slice(1).join(':'))) { await gone(a); removed += 1; }
      }
    }
    if (removed) announce();
    return removed;
  }
  const timer = setInterval(() => sweepChat().catch((e) => console.error('chat sweep failed:', e)), 60 * 1000);
  timer.unref?.();
  setTimeout(() => sweepChat().catch(() => {}), 5000).unref?.();

  return { announce, sweepChat, deadlineSweep, rollProjects };
}
