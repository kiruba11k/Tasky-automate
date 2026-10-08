import { schemas } from './schema.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const parse = (s) => new Date(`${s}T00:00:00Z`);
const validDate = (s) => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(parse(s).getTime()) && parse(s).toISOString().slice(0, 10) === s;
export const addDays = (s, n) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const isMonday = (s) => parse(s).getUTCDay() === 1;
const round = (n) => Math.round(n * 100) / 100;

/** Splits `target` across `dates`: whole numbers stay whole (earlier days take the remainder). */
export function evenSplit(target, dates) {
  const plan = {};
  const n = dates.length;
  if (Number.isInteger(target)) {
    dates.forEach((d, i) => { plan[d] = Math.floor(target / n) + (i < target % n ? 1 : 0); });
  } else {
    dates.forEach((d) => { plan[d] = round(target / n); });
    plan[dates[n - 1]] = round(target - round(target / n) * (n - 1));
  }
  return plan;
}

const taskSig = (t) => JSON.stringify([t.project_id || '', t.title, t.expected_outcome || '', t.unit || '', t.hours_per_unit ?? 1, t.priority]);
const planSig = (p) => JSON.stringify(Object.entries(p || {}).filter(([, v]) => v > 0).sort());
const label = (t, a) => `${t.title} — ${a.target}${t.unit ? ` ${t.unit}` : ''}`;
const fmtWeek = (w) => new Date(`${w}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

class Bad extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function registerWeekly(app, { store, notifier, wrap }) {
  const isLeader = (u) => u.role === 'admin' || u.role === 'team_leader';
  const leaderOnly = (req, res, next) => (isLeader(req.user) ? next() : res.status(403).json({ error: 'Only team leaders can do this' }));

  /** Recreates the daily tasks of an assignment from its plan, keeping days already completed. */
  async function regenDaily(asg, task, actor) {
    const existing = await store.list('DailyTask', { query: { weekly_assignment_id: asg.id } });
    const doneDates = new Set(existing.filter((d) => d.task_status === 'Completed').map((d) => d.date));
    for (const d of existing.filter((x) => x.task_status !== 'Completed')) await store.remove('DailyTask', d.id);
    for (const [date, qty] of Object.entries(asg.daily_plan || {})) {
      if (!(qty > 0) || doneDates.has(date)) continue;
      await store.insert('DailyTask', {
        date,
        project_id: task.project_id || undefined,
        user_id: asg.user_id,
        task: `${task.title} — ${qty}${task.unit ? ` ${task.unit}` : ''}`,
        expected_outcome: task.expected_outcome || task.title,
        expected_time: Math.max(0.25, round(qty * (task.hours_per_unit ?? 1))),
        task_status: 'Pending',
        priority: task.priority || 'Medium',
        file_source: 'manual',
        weekly_assignment_id: asg.id,
        assigned_by: actor.id,
      }, actor.email);
    }
  }

  async function dropDaily(asgId) {
    for (const d of await store.list('DailyTask', { query: { weekly_assignment_id: asgId } })) {
      if (d.task_status !== 'Completed') await store.remove('DailyTask', d.id);
    }
  }

  function normalise(body, users) {
    const { week_start, tasks } = body || {};
    if (!validDate(week_start) || !isMonday(week_start)) throw new Bad('week_start must be a Monday (yyyy-MM-dd)');
    if (!Array.isArray(tasks) || tasks.length > 200) throw new Bad('tasks must be an array (max 200)');
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(week_start, i));
    const out = tasks.map((t, i) => {
      const title = String(t?.title || '').trim();
      if (!title) throw new Bad(`Task ${i + 1} needs a title`);
      const priority = t.priority || 'Medium';
      if (!schemas.WeeklyTask.properties.priority.enum.includes(priority)) throw new Bad(`Task "${title}": invalid priority`);
      const hours = t.hours_per_unit === undefined || t.hours_per_unit === '' ? 1 : Number(t.hours_per_unit);
      if (!Number.isFinite(hours) || hours < 0) throw new Bad(`Task "${title}": hours per unit must be 0 or more`);
      const seen = new Set();
      const assignments = (t.assignments || []).map((a) => {
        const user = users.get(a?.user_id);
        if (!user || user.status === 'Inactive') throw new Bad(`Task "${title}": unknown or inactive user`);
        if (seen.has(user.id)) throw new Bad(`Task "${title}": ${user.full_name} is listed twice`);
        seen.add(user.id);
        const target = Number(a.target);
        if (!Number.isFinite(target) || target <= 0 || target > 100000) throw new Bad(`Task "${title}": target for ${user.full_name} must be greater than 0`);
        let plan = a.plan;
        if (plan && typeof plan === 'object') {
          let sum = 0;
          for (const [d, v] of Object.entries(plan)) {
            if (!weekDates.includes(d)) throw new Bad(`Task "${title}": ${d} is outside the week`);
            if (!Number.isFinite(Number(v)) || Number(v) < 0) throw new Bad(`Task "${title}": invalid daily quantity`);
            sum += Number(v);
          }
          if (Math.abs(sum - target) > 0.01) throw new Bad(`Task "${title}": ${user.full_name}'s daily split (${round(sum)}) must add up to the target (${target})`);
          plan = Object.fromEntries(Object.entries(plan).map(([d, v]) => [d, Number(v)]));
        } else plan = evenSplit(target, weekDates.slice(0, 5));
        return { user_id: user.id, target, plan };
      });
      return {
        id: t.id,
        fields: {
          week_start,
          project_id: t.project_id || undefined,
          title,
          description: t.description || undefined,
          expected_outcome: t.expected_outcome || undefined,
          unit: String(t.unit || '').trim() || undefined,
          hours_per_unit: hours,
          priority,
          category: t.category || undefined,
          notes: t.notes || undefined,
          sort_order: i,
        },
        assignments,
      };
    });
    return { week_start, tasks: out };
  }

  // Replaces the whole week's plan with the submitted grid, regenerates daily tasks and notifies people.
  app.post('/api/weekly/save', leaderOnly, wrap(async (req, res) => {
    const actor = req.user;
    const users = new Map((await store.list('User')).map((u) => [u.id, u]));
    const { week_start, tasks } = normalise(req.body, users);
    const exTasks = await store.list('WeeklyTask', { query: { week_start } });
    const exAsg = await store.list('WeeklyAssignment', { query: { week_start } });
    for (const t of tasks) if (t.id && !exTasks.some((e) => e.id === t.id)) throw new Bad('A task no longer exists. Reload the week and try again.', 409);

    const log = new Map(); // userId -> { added, updated, removed }
    const note = (uid, kind, text) => {
      if (!log.has(uid)) log.set(uid, { added: [], updated: [], removed: [] });
      log.get(uid)[kind].push(text);
    };
    const keptAsg = new Set();
    const keptTasks = new Set();

    for (const t of tasks) {
      const fields = { ...t.fields, allocated_by: actor.id };
      const existing = t.id && exTasks.find((e) => e.id === t.id);
      const metaChanged = !!existing && taskSig(existing) !== taskSig({ ...fields });
      const rec = existing ? await store.update('WeeklyTask', existing.id, fields) : await store.insert('WeeklyTask', fields, actor.email);
      keptTasks.add(rec.id);
      for (const a of t.assignments) {
        const prev = exAsg.find((e) => e.weekly_task_id === rec.id && e.user_id === a.user_id);
        if (prev) {
          keptAsg.add(prev.id);
          if (metaChanged || prev.target !== a.target || planSig(prev.daily_plan) !== planSig(a.plan)) {
            const upd = await store.update('WeeklyAssignment', prev.id, {
              target: a.target, daily_plan: a.plan, status: 'Assigned', done: null, note: null, review_note: null, submitted_at: null, approved_by: null, approved_at: null, allocated_by: actor.id,
            });
            await regenDaily(upd, rec, actor);
            note(a.user_id, 'updated', label(rec, upd));
          }
        } else {
          const created = await store.insert('WeeklyAssignment', {
            weekly_task_id: rec.id, week_start, user_id: a.user_id, target: a.target, daily_plan: a.plan, status: 'Assigned', allocated_by: actor.id,
          }, actor.email);
          await regenDaily(created, rec, actor);
          note(a.user_id, 'added', label(rec, created));
        }
      }
    }
    for (const prev of exAsg.filter((e) => !keptAsg.has(e.id))) {
      const task = exTasks.find((t) => t.id === prev.weekly_task_id);
      await dropDaily(prev.id);
      await store.remove('WeeklyAssignment', prev.id);
      if (task) note(prev.user_id, 'removed', label(task, prev));
    }
    for (const t of exTasks.filter((e) => !keptTasks.has(e.id))) await store.remove('WeeklyTask', t.id);

    const by = actor.full_name || actor.email;
    const link = `/WeeklyTasks?week=${week_start}`;
    let total = 0;
    for (const [uid, c] of log) {
      total += c.added.length + c.updated.length + c.removed.length;
      if (uid === actor.id) continue; // you don't need a notification for your own edits
      const lines = [
        ...c.added.map((x) => `New: ${x}`),
        ...c.updated.map((x) => `Updated: ${x}`),
        ...c.removed.map((x) => `Removed: ${x}`),
      ];
      await notifier.notify(uid, {
        type: 'weekly_allocation',
        title: c.added.length && !c.updated.length && !c.removed.length ? `New weekly tasks (week of ${fmtWeek(week_start)})` : `Your weekly plan changed (week of ${fmtWeek(week_start)})`,
        message: `${by}\n${lines.join('\n')}`,
        actor_name: by,
        link,
      });
    }
    if (total) {
      const others = await notifier.managers([actor.id, ...log.keys()]);
      await notifier.notifyMany(others, { type: 'weekly_plan_saved', title: `Weekly plan updated (week of ${fmtWeek(week_start)})`, message: `${by} changed ${total} allocation${total === 1 ? '' : 's'}`, actor_name: by, link });
    }
    res.json({
      changes: total,
      tasks: await store.list('WeeklyTask', { query: { week_start }, sort: 'sort_order' }),
      assignments: await store.list('WeeklyAssignment', { query: { week_start } }),
    });
  }));

  const loadAssignment = async (id) => {
    const asg = await store.get('WeeklyAssignment', id);
    if (!asg) throw new Bad('Assignment not found', 404);
    return { asg, task: await store.get('WeeklyTask', asg.weekly_task_id) };
  };
  const setDailyStatus = async (asgId, status, onlyFrom) => {
    for (const d of await store.list('DailyTask', { query: { weekly_assignment_id: asgId } })) {
      if (!onlyFrom || onlyFrom.includes(d.task_status)) await store.update('DailyTask', d.id, { task_status: status });
    }
  };

  // Member: mark my weekly task done and send it for approval.
  app.post('/api/weekly/assignments/:id/submit', wrap(async (req, res) => {
    const { asg, task } = await loadAssignment(req.params.id);
    if (asg.user_id !== req.user.id) throw new Bad('You can only submit your own tasks', 403);
    if (!['Assigned', 'Changes Requested'].includes(asg.status)) throw new Bad(`This task is already ${asg.status.toLowerCase()}`, 409);
    const done = req.body?.done === undefined || req.body.done === '' ? asg.target : Number(req.body.done);
    if (!Number.isFinite(done) || done < 0) throw new Bad('Completed quantity must be 0 or more');
    const upd = await store.update('WeeklyAssignment', asg.id, {
      status: 'Submitted', done, note: String(req.body?.note || '').slice(0, 1000) || null, review_note: null, submitted_at: new Date().toISOString(),
    });
    await setDailyStatus(asg.id, 'Completed');
    const by = req.user.full_name || req.user.email;
    const recipients = [asg.allocated_by, ...(await notifier.managers())].filter((id) => id && id !== req.user.id);
    await notifier.notifyMany(recipients, {
      type: 'weekly_submitted', title: `${by} submitted a task for approval`, message: `${task?.title}: ${done}/${asg.target}${task?.unit ? ` ${task.unit}` : ''}${upd.note ? `\n"${upd.note}"` : ''}`,
      actor_name: by, link: `/WeeklyTasks?week=${asg.week_start}&tab=approvals`,
    });
    res.json(upd);
  }));

  const review = (approve) => wrap(async (req, res) => {
    const { asg, task } = await loadAssignment(req.params.id);
    if (asg.status !== 'Submitted') throw new Bad('Only submitted tasks can be reviewed', 409);
    if (asg.user_id === req.user.id && req.user.role !== 'admin') throw new Bad('You cannot review your own task', 403);
    const reviewNote = String(req.body?.note || '').slice(0, 1000);
    if (!approve && !reviewNote.trim()) throw new Bad('Please say what needs to change');
    const now = new Date().toISOString();
    const upd = await store.update('WeeklyAssignment', asg.id, approve
      ? { status: 'Approved', approved_by: req.user.id, approved_at: now, review_note: reviewNote || null }
      : { status: 'Changes Requested', review_note: reviewNote, approved_by: null, approved_at: null });
    if (!approve) await setDailyStatus(asg.id, 'In Progress', ['Completed']);
    const by = req.user.full_name || req.user.email;
    await notifier.notify(asg.user_id, {
      type: approve ? 'weekly_approved' : 'weekly_rejected',
      title: approve ? 'Task approved' : 'Changes requested',
      message: `${by} ${approve ? 'approved' : 'asked for changes on'} "${task?.title}"${reviewNote ? `\n"${reviewNote}"` : ''}`,
      actor_name: by,
      link: `/WeeklyTasks?week=${asg.week_start}`,
    });
    res.json(upd);
  });
  app.post('/api/weekly/assignments/:id/approve', leaderOnly, review(true));
  app.post('/api/weekly/assignments/:id/reject', leaderOnly, review(false));

  // Local error type -> JSON
  // eslint-disable-next-line no-unused-vars
  app.use('/api/weekly', (err, _req, res, next) => (err instanceof Bad ? res.status(err.status).json({ error: err.message }) : next(err)));
}
