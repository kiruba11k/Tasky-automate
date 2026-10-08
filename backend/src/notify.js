/**
 * Notifications: stored per user and pushed live over Server-Sent Events.
 * `afterWrite` turns generic entity changes into notifications; the weekly module calls `notify` directly.
 */
export function createNotifier(store) {
  const subscribers = new Map(); // userId -> Set<res>

  const push = (userId, rec) => {
    for (const res of subscribers.get(userId) || []) res.write(`data: ${JSON.stringify(rec)}\n\n`);
  };

  async function notify(userId, { type = 'info', title, message = '', link = '', actor_name = '' }) {
    if (!userId) return null;
    const rec = await store.insert('Notification', { user_id: userId, type, title, message, link, read: false, actor_name });
    push(userId, rec);
    return rec;
  }

  async function notifyMany(userIds, payload) {
    for (const id of new Set(userIds.filter(Boolean))) await notify(id, payload);
  }

  /** Active admins and team leaders, optionally excluding some ids. */
  async function managers(exclude = []) {
    const users = await store.list('User', { query: {} });
    return users.filter((u) => (u.role === 'admin' || u.role === 'team_leader') && u.status !== 'Inactive' && !exclude.includes(u.id)).map((u) => u.id);
  }

  function subscribe(userId, res) {
    if (!subscribers.has(userId)) subscribers.set(userId, new Set());
    subscribers.get(userId).add(res);
    return () => {
      subscribers.get(userId)?.delete(res);
      if (!subscribers.get(userId)?.size) subscribers.delete(userId);
    };
  }

  const changedFields = (prev, rec, keys) => keys.filter((k) => JSON.stringify(prev?.[k]) !== JSON.stringify(rec?.[k]));

  async function afterWrite({ entity, action, rec, prev, actor }) {
    const by = actor.full_name || actor.email;
    const base = { actor_name: by };
    if (entity === 'DailyTask') {
      const target = rec?.user_id || prev?.user_id;
      const label = `${rec?.task || prev?.task} (${rec?.date || prev?.date})`;
      if (target && target !== actor.id) {
        if (action === 'create') await notify(target, { ...base, type: 'task_assigned', title: 'New task assigned', message: `${by} assigned you: ${label}`, link: '/DailyTasks' });
        else if (action === 'update') {
          const ch = changedFields(prev, rec, ['task', 'date', 'expected_outcome', 'expected_time', 'priority', 'task_status', 'notes']);
          if (ch.length) await notify(target, { ...base, type: 'task_updated', title: 'Your task was updated', message: `${by} changed ${ch.join(', ')} on: ${label}`, link: '/DailyTasks' });
        } else await notify(target, { ...base, type: 'task_removed', title: 'A task was removed', message: `${by} removed: ${label}`, link: '/DailyTasks' });
      } else if (target === actor.id && action === 'update' && prev && prev.task_status !== rec.task_status) {
        await notifyMany(await managers([actor.id]), { ...base, type: 'task_status', title: `${by} updated a task`, message: `"${rec.task}" is now ${rec.task_status}`, link: '/DailyTasks' });
      }
    } else if (entity === 'Project') {
      const src = rec || prev;
      const people = [src.project_manager_id, ...(src.assigned_members || []), ...(prev?.assigned_members || [])].filter((id) => id !== actor.id);
      const verb = { create: 'created', update: 'updated', delete: 'deleted' }[action];
      if (action !== 'update' || changedFields(prev, rec, ['name', 'status', 'priority', 'end_date', 'project_manager_id', 'assigned_members']).length) {
        await notifyMany(people, { ...base, type: `project_${verb}`, title: `Project ${verb}`, message: `${by} ${verb} project "${src.name}"`, link: '/ProjectManagement' });
      }
    }
  }

  return { notify, notifyMany, managers, subscribe, afterWrite };
}
