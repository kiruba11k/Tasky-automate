// Lead Strategus Tracker: people, and the documents (tasks, projects, daily and weekly updates, notices, profiles, chat)
// the tracker UI keeps. The UI keeps its own rules; this module decides who may read and write which document.
// Anonymous chat: the sender of a message is kept only as owner_id and is never returned; each person's alias lives in a
// private "alias" document that only that person can read.

import { dueAlerts, OPEN, rollProject, wallClock } from './deadlines.js';

export const KINDS = ['task', 'project', 'daily', 'weekly', 'notice', 'profile', 'conv', 'msg', 'alias'];
const MAX_DOC = 1_500_000; // bytes of JSON per document (profile photos are data URLs)
const ROLES = ['founder', 'manager', 'pm', 'resource'];

/** Tracker role: founder | manager | pm | resource (derived from the user's role unless set explicitly). */
export const trackerRole = (u) => (u.founder ? 'founder' : ROLES.includes(u.track_role) ? u.track_role : { admin: 'manager', team_leader: 'pm' }[u.role] || 'resource');
// Main admins (founder, manager) and project managers are all admins; only the main admins are "leadership".
const leadership = (u) => ['founder', 'manager'].includes(trackerRole(u));
const lead = (u) => leadership(u) || trackerRole(u) === 'pm';
const COLORS = { founder: 'lavender', manager: 'peach', pm: 'sky', resource: 'mint' };
const TITLES = { founder: 'Founder', manager: 'Manager', pm: 'Project Manager', resource: 'Resource' };

// Who approves project proposals: people flagged `approver` and the emails in PROJECT_APPROVERS (comma separated). Nobody else.
// If nobody qualifies yet, every manager can, so approvals never get stuck.
const approverEmails = () => (process.env.PROJECT_APPROVERS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const isNamedApprover = (u) => u.approver === true || approverEmails().includes(String(u.email || '').toLowerCase());
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
const short = (v, n) => v === undefined || (typeof v === 'string' && v.length <= n);
const count = (v) => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e7);
/** Why the task rows of a day or week ("Daily update", "Weekly targets by project") are refused, or null. */
export function entriesProblem(doc) {
  if (doc?.entries === undefined) return null;
  const rows = doc.entries;
  if (!Array.isArray(rows) || rows.length > 300) return 'Too many task rows.';
  const ok = rows.every((r) => r && typeof r === 'object' && typeof r.id === 'string' && r.id.length <= 60 && typeof r.projectId === 'string' && r.projectId.length <= 200
    && typeof r.task === 'string' && r.task.length <= 200 && short(r.custom, 200) && short(r.desc, 500) && short(r.remarks, 1000) && count(r.qty) && count(r.estMin) && count(r.actualMin) && count(r.doneQty));
  return ok ? null : 'A task row is not valid.';
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Why a day's lunch break is refused, or null. It is a start and an end time within the working day. */
export function lunchProblem(doc) {
  if (doc?.lunch === undefined) return null;
  const l = doc.lunch;
  return l && typeof l === 'object' && HHMM.test(l.start) && HHMM.test(l.end) && l.start < l.end && l.start >= '10:00' && l.end <= '19:00' ? null : 'Lunch needs a start and an end between 10:00 and 19:00.';
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

  /** May `u` write `data` to this document? `prev` is the stored data (undefined for a new document). */
  async function canWrite(u, kind, key, data, prev, changed = [], deleting = false, existing = null) {
    const mine = (id) => id === u.id;
    switch (kind) {
      case 'task': {
        const t = prev || data;
        if (!prev) {
          if (lead(u) && (mine(data.assignedById) || leadership(u))) return true; // only managers and PMs give out tasks
          return adhocApprovalOk(u, data); // ...but anyone may send their own unassigned work for approval
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
        if (lead(u) || (p.admins || []).includes(u.id) || mine(p.pmId)) return true; // admins: managers, founders and PMs
        // everyone else on the team may only record that a day was finalized (when they send their end of day)
        return !!prev && (prev.teamIds || []).includes(u.id) && changed.every((k) => k === 'finalized');
      }
      case 'daily': case 'weekly': return key.startsWith(`${u.id}|`) || leadership(u);
      case 'profile': return mine(key) || leadership(u);
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
  app.post('/api/tracker/docs/batch', wrap(async (req, res) => {
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
        if (kind === 'task') await mirrorTask(key, prev, true);
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
        const why = taskTransitionProblem(prev, data, u.id) || taskLinksProblem(data);
        if (why) { results.push({ ...id, ok: false, error: why }); continue; }
      }
      if (kind === 'daily' || kind === 'weekly') {
        const why = entriesProblem(data) || lunchProblem(data);
        if (why) { results.push({ ...id, ok: false, error: why }); continue; }
      }
      if (!(await canWrite(u, kind, key, data, prev, changed))) { results.push({ ...id, ok: false, error: 'Not allowed' }); continue; }
      // a conversation keeps its creator as owner, whoever edits it later (renaming, leaving)
      if (existing) await store.update('TrackerDoc', existing.id, { data, deleted: false, owner_id: kind === 'conv' && !existing.deleted ? existing.owner_id : u.id });
      else await store.insert('TrackerDoc', { kind, key, data, owner_id: u.id, deleted: false, born: clock() }, u.email);
      if (kind === 'task') await mirrorTask(key, data, false);
      if (kind === 'notice' && !existing && data.to && data.to !== u.id && !data.read) pushNotice(data);
      results.push({ ...id, ok: true });
    }
    if (results.some((r) => r.ok)) announce();
    res.json({ results });
  }));

  /**
   * The fun layer (levels, streaks, quests, the weekly boss, the daily wheel) counts finished work in DailyTask records.
   * Every tracker task keeps one such record in step with it: Completed once the reviewer approves.
   */
  async function mirrorTask(key, doc, deleted) {
    const existing = (await store.list('DailyTask', { query: { tracker_key: key }, limit: 1 }))[0];
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
    if (existing) await store.update('DailyTask', existing.id, rec);
    else await store.insert('DailyTask', rec);
  }
  async function backfillMirrors() {
    for (const d of await store.list('TrackerDoc', { query: { kind: 'task' }, limit: 100000 })) await mirrorTask(d.key, d.data, !!d.deleted);
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
  async function deadlineSweep() {
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
  async function rollProjects() {
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
  async function sweepChat() {
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
