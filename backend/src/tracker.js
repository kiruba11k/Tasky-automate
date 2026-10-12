// Lead Strategus Tracker: people, and the documents (tasks, projects, daily and weekly updates, notices, profiles, chat)
// the tracker UI keeps. The UI keeps its own rules; this module decides who may read and write which document.
// Anonymous chat: the sender of a message is kept only as owner_id and is never returned; each person's alias lives in a
// private "alias" document that only that person can read.

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

export function registerTracker(app, { store, wrap, isOwner = () => false, clock = Date.now }) {
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
      case 'alias': return doc.key.startsWith(`${u.id}:`);
      case 'conv': return (d.memberIds || []).includes(u.id);
      case 'msg': return (await convMembers(d.convId)).includes(u.id);
      default: return true; // tasks, projects, daily, weekly and profiles are shared inside the team
    }
  }

  /** May `u` write `data` to this document? `prev` is the stored data (undefined for a new document). */
  async function canWrite(u, kind, key, data, prev, changed = [], deleting = false, existing = null) {
    const mine = (id) => id === u.id;
    switch (kind) {
      case 'task': {
        const t = prev || data;
        if (!prev) return lead(u) && (mine(data.assignedById) || leadership(u)); // only managers and PMs give out tasks
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
      case 'conv':
        if (deleting) return (prev.memberIds || []).includes(u.id) && ((prev.memberIds || []).every((m) => m === u.id) || existing?.owner_id === u.id);
        return (data.memberIds || []).includes(u.id) || (prev?.memberIds || []).includes(u.id);
      case 'msg':
        if (deleting) return existing?.owner_id === u.id || (await convMembers(prev.convId)).every((m) => m === u.id); // the sender (never revealed), or the last person left in the chat
        return !prev && (await convMembers(data.convId)).includes(u.id);
      case 'alias': return key.startsWith(`${u.id}:`);
      default: return false;
    }
  }

  const out = (doc) => ({ kind: doc.kind, key: doc.key, data: doc.deleted ? null : doc.data, deleted: !!doc.deleted, updated: new Date(doc.updated_date).toISOString() });

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
      if (await canRead(req.user, r)) docs.push(out(r));
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
        results.push({ ...id, ok: true });
        continue;
      }
      const patch = it.patch;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch) || JSON.stringify(patch).length > MAX_DOC) { results.push({ ...id, ok: false, error: 'Bad document' }); continue; }
      const data = mergePatch(prev || {}, patch);
      if (JSON.stringify(data).length > MAX_DOC) { results.push({ ...id, ok: false, error: 'Document too large' }); continue; }
      const changed = Object.keys(patch);
      if (!(await canWrite(u, kind, key, data, prev, changed))) { results.push({ ...id, ok: false, error: 'Not allowed' }); continue; }
      if (existing) await store.update('TrackerDoc', existing.id, { data, deleted: false, owner_id: u.id });
      else await store.insert('TrackerDoc', { kind, key, data, owner_id: u.id, deleted: false, born: clock() }, u.email);
      results.push({ ...id, ok: true });
    }
    if (results.some((r) => r.ok)) announce();
    res.json({ results });
  }));

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

  return { announce, sweepChat };
}
