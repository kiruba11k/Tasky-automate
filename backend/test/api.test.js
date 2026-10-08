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

import { heuristicParse, parseVoice, resolveDay } from '../src/voice.js';

describe('voice parsing', () => {
  const users = [
    { id: 'u1', full_name: 'Alok Kumar', role: 'team_member', status: 'Active' },
    { id: 'u2', full_name: 'Komala R', role: 'team_member', status: 'Active' },
    { id: 'u3', full_name: 'Lena Lead', role: 'team_leader', status: 'Active' },
    { id: 'u4', full_name: 'Alok Singh', role: 'team_member', status: 'Active' },
  ];
  const projects = [{ id: 'p1', name: 'BlueDove Hospitality' }, { id: 'p2', name: 'SSDI' }];
  const me = users[2];
  const ctx = { users, projects, me, today: '2026-10-14', weekStart: '2026-10-12' };

  test('resolveDay', () => {
    const weekDates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
    assert.equal(resolveDay('Friday', { today: '2026-10-14', weekDates }), '2026-10-16');
    assert.equal(resolveDay('tomorrow', { today: '2026-10-14' }), '2026-10-15');
    assert.equal(resolveDay('monday', { today: '2026-10-14' }), '2026-10-19'); // next Monday in daily mode
    assert.equal(resolveDay('wed', { today: '2026-10-14' }), '2026-10-14');
    assert.equal(resolveDay('2026-10-20', { today: '2026-10-14' }), '2026-10-20');
    assert.equal(resolveDay('someday', { today: '2026-10-14' }), null);
  });

  test('rule-based parser: several tasks, names, hours, project, target', async () => {
    const text = 'Assign Komala to review 100 prospects for BlueDove Hospitality, target is 35% connection rate, takes 8 hours. Then Lena and Komala should build a model of 45 companies on Monday and Tuesday for SSDI, 5 hours.';
    const r = await parseVoice({ ...ctx, mode: 'weekly', transcript: text });
    assert.equal(r.used_llm, false);
    assert.equal(r.tasks.length, 2);
    const [a, b] = r.tasks;
    assert.match(a.title, /review 100 prospects/i);
    assert.equal(a.project_name, 'BlueDove Hospitality');
    assert.equal(a.expected_result, '35% connection rate');
    assert.equal(a.estimated_hours, 8);
    assert.deepEqual(a.assignee_ids, ['u2']);
    assert.match(b.title, /^build a model of 45 companies/i); // connector words like "Then" are not part of the title
    assert.equal(b.project_id, 'p2');
    assert.deepEqual(b.assignee_ids.sort(), ['u2', 'u3']);
    assert.deepEqual(b.days, ['2026-10-12', '2026-10-13']);
    assert.equal(b.estimated_hours, 5);
  });

  test('ambiguous or unknown names are flagged, not guessed', async () => {
    const r = await parseVoice({ ...ctx, mode: 'weekly', llm: async () => ({ tasks: [{ title: 'Write blog', assignees: ['Alok', 'Zorro', 'Komala'] }] }) });
    assert.equal(r.used_llm, true);
    assert.deepEqual(r.tasks[0].assignee_ids, ['u2']);
    assert.equal(r.tasks[0].unresolved.length, 2);
    assert.ok(r.warnings.some((w) => /more than one person/.test(w)));
    assert.ok(r.warnings.some((w) => /not a team member/.test(w)));
  });

  test('LLM output is resolved: me, fuzzy project, weekdays; daily mode defaults to me and today', async () => {
    const llm = async ({ prompt }) => {
      assert.match(prompt, /Alok Kumar/);
      assert.match(prompt, /BlueDove Hospitality/);
      return { tasks: [
        { title: 'Prepare weekly report', project_name: 'blue dove hospitality', assignees: ['__me__'], days: ['friday'], estimated_hours: 2.5, priority: 'High' },
        { title: 'Tele calls', project_name: 'ssdi', assignees: ['Komala R'], days: [], estimated_hours: null, expected_result: '2 meetings' },
      ] };
    };
    const w = await parseVoice({ ...ctx, mode: 'weekly', transcript: 'whatever', llm });
    assert.equal(w.tasks[0].project_name, 'blue dove hospitality'); // not an exact match: kept as spoken, leader can fix
    assert.deepEqual(w.tasks[0].assignee_ids, ['u3']);
    assert.deepEqual(w.tasks[0].days, ['2026-10-16']);
    assert.equal(w.tasks[0].priority, 'High');
    assert.equal(w.tasks[1].project_id, 'p2');
    assert.equal(w.tasks[1].days, null);
    const d = await parseVoice({ ...ctx, mode: 'daily', transcript: 'whatever', llm: async () => ({ tasks: [{ title: 'Update Zoho', assignees: [], days: ['tomorrow'] }, { title: 'Write post', assignees: ['Komala'], days: [] }] }) });
    assert.deepEqual(d.tasks[0].assignee_ids, ['u3']);
    assert.equal(d.tasks[0].date, '2026-10-15');
    assert.equal(d.tasks[1].date, '2026-10-14');
  });

  test('LLM failure falls back to rules with a warning', async () => {
    const r = await parseVoice({ ...ctx, mode: 'daily', transcript: 'Write the newsletter for SSDI, 2 hours', llm: async () => { throw new Error('boom'); } });
    assert.equal(r.used_llm, false);
    assert.ok(r.warnings.some((w) => /AI parser was unavailable/.test(w)));
    assert.equal(r.tasks[0].estimated_hours, 2);
    assert.equal(r.tasks[0].project_name, 'SSDI');
  });

  test('empty input finds nothing', async () => {
    const r = await parseVoice({ ...ctx, mode: 'daily', transcript: 'um okay' });
    assert.equal(r.tasks.length, 0);
    assert.ok(r.warnings.length);
  });
});

for (const [name, makeStore] of backends.slice(0, 1)) {
  describe(`voice endpoint (${name})`, () => {
    let store, server, base, admin, mo;
    const api = async (method, url, { body, token } = {}) => {
      const res = await fetch(base + url, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    };
    before(async () => {
      store = makeStore();
      await store.init();
      await bootstrapAdmin(store, { email: 'boss@example.com' });
      server = createApp({ store, jwtSecret: 's' }).listen(0);
      base = `http://localhost:${server.address().port}`;
      admin = (await api('POST', '/api/auth/login', { body: { email: 'boss@example.com' } })).body.token;
      await api('POST', '/api/entities/User', { token: admin, body: { full_name: 'Mo Member', email: 'mo@x.com' } });
      mo = (await api('POST', '/api/auth/login', { body: { email: 'mo@x.com' } })).body.token;
    });
    after(async () => { server.close(); await store.close(); });

    test('validation and permissions', async () => {
      assert.equal((await api('POST', '/api/voice/parse', { body: { mode: 'daily', transcript: 'x task' } })).status, 401);
      assert.equal((await api('POST', '/api/voice/parse', { token: admin, body: { mode: 'nope', transcript: 'write post' } })).status, 400);
      assert.equal((await api('POST', '/api/voice/parse', { token: admin, body: { mode: 'daily', transcript: ' ' } })).status, 400);
      assert.equal((await api('POST', '/api/voice/parse', { token: mo, body: { mode: 'weekly', week_start: '2026-10-12', transcript: 'write post' } })).status, 403);
      assert.equal((await api('POST', '/api/voice/parse', { token: admin, body: { mode: 'weekly', transcript: 'write post' } })).status, 400);
    });

    test('members can dictate their own daily tasks', async () => {
      const r = await api('POST', '/api/voice/parse', { token: mo, body: { mode: 'daily', today: '2026-10-14', transcript: 'Write the newsletter, 2 hours. Update Zoho tomorrow' } });
      assert.equal(r.status, 200);
      assert.equal(r.body.tasks.length, 2);
      assert.equal(r.body.tasks[0].estimated_hours, 2);
      assert.equal(r.body.tasks[1].date, '2026-10-15');
      assert.ok(r.body.tasks.every((t) => t.assignee_ids.length === 1)); // defaults to the speaker
    });
  });
}

import { computeStats, levelForXp, xpForLevel, streakDays } from '../src/stats.js';

describe('stats (XP, levels, streaks)', () => {
  test('levels line up with their XP thresholds', () => {
    for (let l = 1; l <= 12; l += 1) {
      assert.equal(levelForXp(xpForLevel(l)), l);
      assert.equal(levelForXp(xpForLevel(l + 1) - 1), l);
    }
    assert.equal(levelForXp(0), 1);
  });

  test('streaks', () => {
    assert.equal(streakDays([], '2026-10-14'), 0);
    assert.equal(streakDays(['2026-10-14', '2026-10-13', '2026-10-12', '2026-10-10'], '2026-10-14'), 3);
    assert.equal(streakDays(['2026-10-13', '2026-10-12'], '2026-10-14'), 2); // today not done yet: the streak is still alive
    assert.equal(streakDays(['2026-10-11'], '2026-10-14'), 0);
    assert.equal(streakDays(['2026-10-14', '2026-10-14'], '2026-10-14'), 1);
  });

  test('computeStats', () => {
    const s = computeStats({ done: Array.from({ length: 6 }, () => ({ date: '2026-10-14' })), approved: [{}], planned: [{ task_status: 'Completed' }, { task_status: 'Pending' }], today: '2026-10-14' });
    assert.equal(s.xp, 100); // 6*10 + 40
    assert.equal(s.level, 2); // 50 <= 100 < 150
    assert.equal(s.title, 'Checklist Cadet');
    assert.equal(s.next_level_xp, 150);
    assert.equal(s.completed_today, 1);
    assert.equal(s.planned_today, 2);
  });
});

describe('stats endpoint', () => {
  test('derived from real completed work', async () => {
    const store = new MemoryStore();
    await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    const server = createApp({ store, jwtSecret: 's' }).listen(0);
    const base = `http://localhost:${server.address().port}`;
    const token = (await (await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'boss@example.com' }) })).json()).token;
    const h = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
    const me = await (await fetch(`${base}/api/auth/me`, { headers: h })).json();
    assert.equal((await fetch(`${base}/api/me/stats`)).status, 401);
    for (const [date, status] of [['2026-10-14', 'Completed'], ['2026-10-13', 'Completed'], ['2026-10-14', 'Pending']]) {
      await fetch(`${base}/api/entities/DailyTask`, { method: 'POST', headers: h, body: JSON.stringify({ date, user_id: me.id, task: 't', expected_outcome: 'o', expected_time: 1, task_status: status }) });
    }
    const stats = await (await fetch(`${base}/api/me/stats?today=2026-10-14`, { headers: h })).json();
    assert.equal(stats.xp, 20);
    assert.equal(stats.streak, 2);
    assert.equal(stats.completed_today, 1);
    assert.equal(stats.planned_today, 2);
    server.close();
  });
});
