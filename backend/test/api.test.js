import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, bootstrapAdmin } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { PgStore } from '../src/pgStore.js';
import { tableName } from '../src/ddl.js';
import { schemas } from '../src/schema.js';

const backends = [['memory', () => new MemoryStore()]];
if (process.env.TEST_DATABASE_URL) backends.push(['postgres', () => new PgStore(process.env.TEST_DATABASE_URL)]);

for (const [name, makeStore] of backends) {
  describe(`API (${name})`, () => {
    let store, server, base;
    const api = async (method, url, { body, token } = {}) => {
      const res = await fetch(base + url, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body && JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    };
    const login = async (email) => (await api('POST', '/api/auth/login', { body: { email } })).body.token;
    let admin;

    before(async () => {
      store = makeStore();
      await store.init();
      if (name === 'postgres') for (const e of Object.keys(schemas)) await store.pool.query(`TRUNCATE "${tableName(e)}"`);
      await bootstrapAdmin(store, { email: 'Boss@Example.com' });
      server = createApp({ store, jwtSecret: 'test-secret' }).listen(0);
      base = `http://localhost:${server.address().port}`;
      admin = await login(' BOSS@example.com ');
    });
    after(async () => {
      server.close();
      await store.close();
    });

    test('everything except login/health requires a session', async () => {
      assert.equal((await api('GET', '/api/health')).status, 200);
      assert.equal((await api('GET', '/api/entities/Project')).status, 401);
      assert.equal((await api('GET', '/api/auth/me')).status, 401);
      assert.equal((await api('GET', '/api/entities/Project', { token: 'garbage' })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'nobody@example.com' } })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', { body: {} })).status, 401);
      const me = await api('GET', '/api/auth/me', { token: admin });
      assert.equal(me.body.role, 'admin');
      assert.equal(me.body.email, 'boss@example.com');
    });

    test('only emails added by an admin can sign in', async () => {
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'lena@x.com' } })).status, 401);
      const add = await api('POST', '/api/entities/User', { token: admin, body: { full_name: 'Lena', email: 'Lena@X.com', role: 'team_leader' } });
      assert.equal(add.status, 201);
      assert.equal(add.body.email, 'lena@x.com');
      assert.equal((await api('POST', '/api/entities/User', { token: admin, body: { full_name: 'Dup', email: 'LENA@x.com' } })).status, 409);
      assert.ok(await login('lena@x.com'));
      // deactivated users are locked out, including existing sessions
      const t = await login('lena@x.com');
      await api('PUT', `/api/entities/User/${add.body.id}`, { token: admin, body: { status: 'Inactive' } });
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'lena@x.com' } })).status, 401);
      assert.equal((await api('GET', '/api/auth/me', { token: t })).status, 401);
      await api('PUT', `/api/entities/User/${add.body.id}`, { token: admin, body: { status: 'Active' } });
      // removing the user revokes access
      const tmp = await api('POST', '/api/entities/User', { token: admin, body: { full_name: 'Tmp', email: 'tmp@x.com' } });
      const tmpToken = await login('tmp@x.com');
      await api('DELETE', `/api/entities/User/${tmp.body.id}`, { token: admin });
      assert.equal((await api('GET', '/api/auth/me', { token: tmpToken })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'tmp@x.com' } })).status, 401);
    });

    test('role rules', async () => {
      const lena = await login('lena@x.com');
      const member = await api('POST', '/api/entities/User', { token: lena, body: { full_name: 'Mo', email: 'mo@x.com' } });
      assert.equal(member.status, 201);
      assert.equal(member.body.role, 'team_member');
      assert.equal((await api('POST', '/api/entities/User', { token: lena, body: { full_name: 'X', email: 'x@x.com', role: 'admin' } })).status, 403);
      const mo = await login('mo@x.com');
      assert.equal((await api('POST', '/api/entities/User', { token: mo, body: { full_name: 'Y', email: 'y@x.com' } })).status, 403);
      const adminRec = (await api('GET', '/api/entities/User', { token: mo })).body.find((u) => u.role === 'admin');
      assert.equal((await api('PUT', `/api/entities/User/${adminRec.id}`, { token: lena, body: { role: 'team_member' } })).status, 403);
      assert.equal((await api('PUT', `/api/entities/User/${adminRec.id}`, { token: admin, body: { role: 'team_member' } })).status, 400); // last admin
      assert.equal((await api('DELETE', `/api/entities/User/${adminRec.id}`, { token: admin })).status, 400);
      assert.equal((await api('DELETE', `/api/entities/User/${adminRec.id}`, { token: admin })).status, 400);
      const put = await api('PUT', `/api/entities/User/${member.body.id}`, { token: admin, body: { designation: 'Dev', skills: 'a,b' } });
      assert.equal(put.body.designation, 'Dev');
    });

    test('entity CRUD, defaults, validation, filter, sort', async () => {
      const t = admin;
      assert.equal((await api('POST', '/api/entities/Project', { token: t, body: { name: 'x' } })).status, 400);
      const p = await api('POST', '/api/entities/Project', { token: t, body: { name: 'A', team_id: 't', project_manager_id: 'm', assigned_members: ['u1', 'u2'], budget: 12.5, extra_field: 'kept' } });
      assert.equal(p.status, 201);
      assert.equal(p.body.status, 'Planning');
      assert.equal(p.body.budget, 12.5);
      assert.equal(p.body.extra_field, 'kept');
      assert.equal((await api('POST', '/api/entities/Project', { token: t, body: { name: 'B', team_id: 't', project_manager_id: 'm', status: 'Nope' } })).status, 400);
      await api('POST', '/api/entities/Project', { token: t, body: { name: 'B', team_id: 't2', project_manager_id: 'm' } });
      assert.deepEqual((await api('GET', '/api/entities/Project?team_id=t2', { token: t })).body.map((r) => r.name), ['B']);
      assert.deepEqual((await api('GET', '/api/entities/Project?assigned_members=u2', { token: t })).body.map((r) => r.name), ['A']);
      assert.deepEqual((await api('GET', '/api/entities/Project?sort=name&limit=1', { token: t })).body.map((r) => r.name), ['A']);
      assert.deepEqual((await api('GET', '/api/entities/Project?sort=-name', { token: t })).body.map((r) => r.name), ['B', 'A']);
      const u = await api('PUT', `/api/entities/Project/${p.body.id}`, { token: t, body: { status: 'Active', extra_field: 'changed' } });
      assert.equal(u.body.status, 'Active');
      assert.equal(u.body.name, 'A');
      assert.equal(u.body.extra_field, 'changed');
      assert.equal((await api('GET', `/api/entities/Project/${p.body.id}`, { token: t })).body.assigned_members.length, 2);
      assert.equal((await api('DELETE', `/api/entities/Project/${p.body.id}`, { token: t })).status, 200);
      assert.equal((await api('GET', `/api/entities/Project/${p.body.id}`, { token: t })).status, 404);
      assert.equal((await api('GET', '/api/entities/Project/not-a-uuid', { token: t })).status, 404);
      assert.equal((await api('GET', '/api/entities/Nope', { token: t })).status, 404);
    });

    test('upload, extract CSV, serve file, LLM fallback', async () => {
      const form = new FormData();
      form.append('file', new Blob(['Date,Task\n2025-01-01,Write\n']), 'a.csv');
      const upRes = await fetch(`${base}/api/integrations/upload`, { method: 'POST', body: form });
      assert.equal(upRes.status, 401);
      const up = await (await fetch(`${base}/api/integrations/upload`, { method: 'POST', body: form, headers: { authorization: `Bearer ${admin}` } })).json();
      const ex = await api('POST', '/api/integrations/extract', { token: admin, body: { file_url: up.file_url } });
      assert.deepEqual(ex.body.output.columns, ['Date', 'Task']);
      assert.equal(ex.body.output.tasks[0].Task, 'Write');
      assert.equal((await api('POST', '/api/integrations/extract', { token: admin, body: { file_url: '/uploads/../x' } })).status, 400);
      const file = await fetch(base + up.file_url);
      assert.equal(file.status, 200);
      assert.match(file.headers.get('content-disposition'), /attachment/);
      assert.equal((await api('POST', '/api/integrations/llm', { token: admin, body: { prompt: 'hi' } })).status, 200);
    });
  });
}

for (const [name, makeStore] of backends) {
  describe(`Weekly tasks + notifications (${name})`, () => {
    let store, server, base, admin, lena, mo, ids;
    const api = async (method, url, { body, token } = {}) => {
      const res = await fetch(base + url, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body && JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    };
    const login = async (email) => (await api('POST', '/api/auth/login', { body: { email } })).body.token;
    const W = '2026-10-12'; // a Monday
    const notes = async (t, q = '') => (await api('GET', `/api/notifications${q}`, { token: t })).body;

    before(async () => {
      store = makeStore();
      await store.init();
      if (name === 'postgres') for (const e of Object.keys(schemas)) await store.pool.query(`TRUNCATE "${tableName(e)}"`);
      await bootstrapAdmin(store, { email: 'boss@example.com' });
      server = createApp({ store, jwtSecret: 'test-secret' }).listen(0);
      base = `http://localhost:${server.address().port}`;
      admin = await login('boss@example.com');
      ids = {};
      for (const [k, email, role] of [['lena', 'lena@x.com', 'team_leader'], ['mo', 'mo@x.com', 'team_member'], ['zed', 'zed@x.com', 'team_member']]) {
        ids[k] = (await api('POST', '/api/entities/User', { token: admin, body: { full_name: k, email, role } })).body.id;
      }
      lena = await login('lena@x.com');
      mo = await login('mo@x.com');
    });
    after(async () => {
      server.close();
      await store.close();
    });

    test('only leaders allocate; input is validated', async () => {
      const task = { title: 'Review prospects', expected_result: '35% connection rate', estimated_hours: 10, assignments: [{ user_id: ids.mo }] };
      assert.equal((await api('POST', '/api/weekly/save', { token: mo, body: { week_start: W, tasks: [task] } })).status, 403);
      assert.equal((await api('POST', '/api/weekly/save', { token: lena, body: { week_start: '2026-10-13', tasks: [task] } })).status, 400); // not a Monday
      assert.equal((await api('POST', '/api/weekly/save', { token: lena, body: { week_start: W, tasks: [{ ...task, title: ' ' }] } })).status, 400);
      assert.equal((await api('POST', '/api/weekly/save', { token: lena, body: { week_start: W, tasks: [{ ...task, assignments: [{ user_id: 'nope' }] }] } })).status, 400);
      assert.equal((await api('POST', '/api/weekly/save', { token: lena, body: { week_start: W, tasks: [{ ...task, assignments: [{ user_id: ids.mo, days: ['2026-10-30'] }] }] } })).status, 400); // outside week
      assert.equal((await api('POST', '/api/weekly/save', { token: lena, body: { week_start: W, tasks: [{ ...task, estimated_hours: -1 }] } })).status, 400);
      assert.equal((await api('POST', '/api/entities/WeeklyTask', { token: lena, body: { week_start: W, title: 'x' } })).status, 403);
    });

    const grid = async (token, mutate) => {
      const tasks = (await api('GET', `/api/entities/WeeklyTask?week_start=${W}&sort=sort_order`, { token })).body;
      const asg = (await api('GET', `/api/entities/WeeklyAssignment?week_start=${W}`, { token })).body;
      const rows = tasks.map((t) => ({ ...t, assignments: asg.filter((a) => a.weekly_task_id === t.id).map((a) => ({ user_id: a.user_id, days: a.days })) }));
      return api('POST', '/api/weekly/save', { token, body: { week_start: W, tasks: mutate(rows) } });
    };

    test('allocation: shared tasks, free-text targets, daily tasks for members and leaders, notifications', async () => {
      const save = await api('POST', '/api/weekly/save', {
        token: lena,
        body: {
          week_start: W,
          tasks: [
            { title: 'Review 100 prospects, send messages', project_name: 'BlueDove Hospitality', expected_result: '35% connection rate', estimated_hours: 10, assignments: [{ user_id: ids.mo }, { user_id: ids.zed }, { user_id: ids.lena, days: ['2026-10-12', '2026-10-14'] }] },
            { title: 'Daily Internal Meetings', project_name: 'Others', expected_result: 'TBD', assignments: [{ user_id: ids.mo, days: ['2026-10-12'] }] },
          ],
        },
      });
      assert.equal(save.status, 200, JSON.stringify(save.body));
      assert.equal(save.body.assignments.length, 4);
      assert.equal(save.body.tasks[0].project_name, 'BlueDove Hospitality');
      assert.equal(save.body.tasks[0].expected_result, '35% connection rate');
      const moDaily = (await api('GET', `/api/entities/DailyTask?user_id=${ids.mo}`, { token: mo })).body;
      const review = moDaily.filter((d) => d.task.startsWith('Review'));
      assert.equal(review.length, 5); // default Mon-Fri
      assert.equal(review[0].expected_time, 0.67); // 10h / 3 people / 5 days
      assert.equal(review[0].expected_outcome, '35% connection rate');
      assert.equal(moDaily.filter((d) => d.task === 'Daily Internal Meetings').length, 1);
      assert.equal(moDaily.find((d) => d.task === 'Daily Internal Meetings').expected_time, 1); // N/A hours default
      const leadDaily = (await api('GET', `/api/entities/DailyTask?user_id=${ids.lena}`, { token: lena })).body;
      assert.deepEqual(leadDaily.map((d) => d.date).sort(), ['2026-10-12', '2026-10-14']); // leaders get tasks too, custom days
      const moNotes = await notes(mo, '?unread=true');
      assert.equal(moNotes.length, 1);
      assert.match(moNotes[0].message, /New: Review 100 prospects/);
      assert.match(moNotes[0].message, /New: Daily Internal Meetings/);
      assert.equal((await notes(lena)).length, 0); // no self-notification
      assert.ok((await notes(admin)).some((n) => n.type === 'weekly_plan_saved')); // other leaders hear about it
      const again = await grid(lena, (rows) => rows);
      assert.equal(again.body.changes, 0); // unchanged re-save is silent
      assert.equal((await notes(mo)).length, 1);
    });

    test('matching a project by name; editing hours/people updates daily tasks; removing work notifies', async () => {
      const proj = await api('POST', '/api/entities/Project', { token: admin, body: { name: 'SSDI', team_id: 't', project_manager_id: 'm' } });
      const r = await grid(lena, (rows) => [
        ...rows.map((t) => (t.title.startsWith('Review')
          ? { ...t, estimated_hours: 20, assignments: t.assignments.filter((a) => a.user_id !== ids.zed) } // zed removed, hours change
          : t)),
        { title: 'Tele for 15 VIPs', project_name: 'ssdi', assignments: [{ user_id: ids.zed, days: ['2026-10-15'] }] },
      ]);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.tasks.find((t) => t.title.startsWith('Tele')).project_id, proj.body.id); // matched case-insensitively
      const moReview = (await api('GET', `/api/entities/DailyTask?user_id=${ids.mo}`, { token: mo })).body.filter((d) => d.task.startsWith('Review'));
      assert.equal(moReview.length, 5);
      assert.equal(moReview[0].expected_time, 2); // 20h / 2 people / 5 days
      const zedDaily = (await api('GET', `/api/entities/DailyTask?user_id=${ids.zed}`, { token: lena })).body;
      assert.deepEqual(zedDaily.map((d) => d.task), ['Tele for 15 VIPs']);
      const zedNotes = await notes(await login('zed@x.com'));
      assert.ok(zedNotes.some((n) => /Removed: Review 100 prospects/.test(n.message)));
      assert.ok(zedNotes.some((n) => /New: Tele for 15 VIPs/.test(n.message)));
    });

    test('submit -> approval workflow with notifications', async () => {
      const a = (await api('GET', `/api/entities/WeeklyAssignment?user_id=${ids.mo}`, { token: mo })).body.find((x) => x.hours === 10);
      assert.ok(a);
      assert.equal((await api('POST', `/api/weekly/assignments/${a.id}/submit`, { token: lena, body: { result: 'x' } })).status, 403); // not theirs
      assert.equal((await api('POST', `/api/weekly/assignments/${a.id}/approve`, { token: lena })).status, 409); // not submitted yet
      assert.equal((await api('POST', `/api/weekly/assignments/${a.id}/submit`, { token: mo, body: {} })).status, 400); // result required
      const sub = await api('POST', `/api/weekly/assignments/${a.id}/submit`, { token: mo, body: { result: '44% connection rate\nSent 104 first level messages' } });
      assert.equal(sub.body.status, 'Submitted');
      const dailies = (await api('GET', `/api/entities/DailyTask?weekly_assignment_id=${a.id}`, { token: mo })).body;
      assert.ok(dailies.length && dailies.every((d) => d.task_status === 'Completed'));
      assert.ok((await notes(lena)).some((n) => n.type === 'weekly_submitted' && /44% connection rate/.test(n.message)));
      assert.equal((await api('POST', `/api/weekly/assignments/${a.id}/approve`, { token: mo })).status, 403); // members can't approve
      assert.equal((await api('POST', `/api/weekly/assignments/${a.id}/reject`, { token: lena, body: {} })).status, 400); // needs a reason
      const rej = await api('POST', `/api/weekly/assignments/${a.id}/reject`, { token: lena, body: { note: 'send the remaining messages' } });
      assert.equal(rej.body.status, 'Changes Requested');
      assert.ok((await notes(mo)).some((n) => n.type === 'weekly_rejected' && /send the remaining messages/.test(n.message)));
      assert.equal((await api('POST', `/api/weekly/assignments/${a.id}/submit`, { token: mo, body: { result: 'all sent' } })).body.status, 'Submitted');
      const ok = await api('POST', `/api/weekly/assignments/${a.id}/approve`, { token: lena });
      assert.equal(ok.body.status, 'Approved');
      assert.ok((await notes(mo)).some((n) => n.type === 'weekly_approved'));
      // changing an approved assignment reopens it
      const re = await grid(lena, (rows) => rows.map((t) => (t.title.startsWith('Review') ? { ...t, estimated_hours: 30 } : t)));
      assert.equal(re.body.assignments.find((x) => x.id === a.id).status, 'Assigned');
    });

    test('generic entity changes notify, notifications are private and markable read', async () => {
      const dt = await api('POST', '/api/entities/DailyTask', { token: lena, body: { date: '2026-10-20', user_id: ids.zed, task: 'Ad hoc', expected_outcome: 'x', expected_time: 1 } });
      const zed = await login('zed@x.com');
      assert.ok((await notes(zed)).some((n) => n.type === 'task_assigned'));
      await api('PUT', `/api/entities/DailyTask/${dt.body.id}`, { token: zed, body: { task_status: 'Completed' } });
      assert.ok((await notes(lena)).some((n) => n.type === 'task_status' && /Completed/.test(n.message)));
      assert.equal((await api('GET', '/api/entities/Notification', { token: zed })).status, 403);
      const unread = await notes(zed, '?unread=true');
      assert.ok(unread.length > 0);
      await api('POST', '/api/notifications/read', { token: zed, body: { ids: [unread[0].id] } });
      assert.equal((await notes(zed, '?unread=true')).length, unread.length - 1);
      await api('POST', '/api/notifications/read', { token: zed, body: { all: true } });
      assert.equal((await notes(zed, '?unread=true')).length, 0);
    });

    test('live push over SSE', async () => {
      const ctl = new AbortController();
      const res = await fetch(`${base}/api/notifications/stream`, { headers: { authorization: `Bearer ${mo}` }, signal: ctl.signal });
      assert.match(res.headers.get('content-type'), /^text\/event-stream/);
      const reader = res.body.getReader();
      await reader.read(); // ": connected"
      await api('POST', '/api/entities/DailyTask', { token: lena, body: { date: '2026-10-21', user_id: ids.mo, task: 'Live ping', expected_outcome: 'x', expected_time: 1 } });
      const chunk = new TextDecoder().decode((await reader.read()).value);
      assert.match(chunk, /"title":"New task assigned"/);
      ctl.abort();
    });
  });
}
