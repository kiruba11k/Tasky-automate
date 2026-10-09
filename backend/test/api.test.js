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

import { computeStats, levelForXp, xpForLevel, streakInfo, questsFor, badgeStatus, pickSticker, STICKERS } from '../src/stats.js';

describe('progress maths', () => {
  test('levels line up with their XP thresholds', () => {
    for (let l = 1; l <= 12; l += 1) {
      assert.equal(levelForXp(xpForLevel(l)), l);
      assert.equal(levelForXp(xpForLevel(l + 1) - 1), l);
    }
    assert.equal(levelForXp(0), 1);
  });

  test('streaks count working days, ignore weekends and forgive a miss once a shield is earned', () => {
    // 2026-10-12 is a Monday
    assert.deepEqual(streakInfo([], '2026-10-14'), { streak: 0, shields: 0, shield_used: false, at_risk: false });
    const s1 = streakInfo(['2026-10-12', '2026-10-13'], '2026-10-14');
    assert.equal(s1.streak, 2);
    assert.equal(s1.at_risk, true); // today still open: finish a task to keep it
    assert.equal(streakInfo(['2026-10-12', '2026-10-13', '2026-10-14'], '2026-10-14').at_risk, false);
    // Friday + Monday: the weekend neither counts nor breaks
    assert.equal(streakInfo(['2026-10-09', '2026-10-12'], '2026-10-12').streak, 2);
    // a missed workday with no shield resets the streak
    assert.equal(streakInfo(['2026-10-12', '2026-10-14'], '2026-10-14').streak, 1);
    // 5 days earn a shield, which silently covers one missed day
    const week = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']; // Mon-Fri
    const covered = streakInfo([...week, '2026-10-12', '2026-10-14'], '2026-10-14'); // Tue 13 missed
    assert.equal(covered.streak, 7);
    assert.equal(covered.shield_used, true);
    assert.equal(covered.shields, 0);
    // a long gap eventually resets it, with no punishment beyond that
    assert.equal(streakInfo(week, '2026-10-30').streak, 0);
    // weekend-only completions are not needed and do not crash
    assert.equal(streakInfo(['2026-10-10'], '2026-10-12').streak, 0);
  });

  test('quests are derived from real work and members/leaders differ', () => {
    const done = [{ date: '2026-10-14', actual_time_taken: 1 }, { date: '2026-10-14' }];
    const m = questsFor({ role: 'member', today: '2026-10-14', done, plannedToday: 5, kudosGivenToday: 0, approvalsToday: 0 });
    assert.deepEqual(m.map((q) => [q.id, q.progress, q.target, q.done]), [['finish', 2, 3, false], ['track', 1, 1, true], ['kudos', 0, 1, false]]);
    const l = questsFor({ role: 'leader', today: '2026-10-14', done: [], plannedToday: 0, kudosGivenToday: 1, approvalsToday: 0 });
    assert.deepEqual(l.map((q) => q.id), ['finish', 'review', 'kudos']);
    assert.equal(l[0].target, 1); // nothing planned yet: one finished task is enough
  });

  test('badges need real work', () => {
    const base = { done: [], plannedToday: 0, doneToday: 0, streak: 0, approved: 0, kudosGiven: 0, kudosReceived: 0, questsClaimed: 0, stickers: 0, reviews: 0, plans: 0, voiceUsed: false };
    assert.equal(badgeStatus(base).filter((b) => b.earned).length, 0);
    const three = { ...base, done: [1, 2, 3].map(() => ({ date: '2026-10-14', expected_time: 2, actual_time_taken: 1 })), plannedToday: 3, doneToday: 3 };
    const earned = badgeStatus(three).filter((b) => b.earned).map((b) => b.id).sort();
    assert.deepEqual(earned, ['first_win', 'hat_trick', 'perfect_day']);
  });

  test('sticker odds and computeStats', () => {
    assert.equal(pickSticker(() => 0.1).rarity, 'common');
    assert.equal(pickSticker(() => 0.8).rarity, 'rare');
    assert.equal(pickSticker(() => 0.99).rarity, 'epic');
    assert.equal(new Set(STICKERS.map((s) => s.id)).size, STICKERS.length);
    const s = computeStats({ done: Array.from({ length: 6 }, () => ({ date: '2026-10-14' })), approved: [{}], planned: [{ task_status: 'Completed' }, { task_status: 'Pending' }], today: '2026-10-14', claims: ['quest:a', 'badge:b'], dropNew: 1, dropDupes: 2 });
    assert.equal(s.xp, 60 + 40 + 15 + 25 + 10 + 10);
    assert.equal(s.completed_today, 1);
    assert.equal(s.planned_today, 2);
  });
});

describe('engagement endpoints', () => {
  let store, server, base, boss, lena, alok;
  const api = async (method, url, { body, token } = {}) => {
    const res = await fetch(base + url, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const login = async (email) => (await api('POST', '/api/auth/login', { body: { email } })).body.token;
  const T = '2026-10-14';
  const task = (uid, extra = {}) => ({ date: T, user_id: uid, task: 'Write post', expected_outcome: 'o', expected_time: 2, task_status: 'Pending', ...extra });

  before(async () => {
    store = new MemoryStore();
    await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's', random: () => 0.1 }).listen(0);
    base = `http://localhost:${server.address().port}`;
    boss = await login('boss@example.com');
    await api('POST', '/api/entities/User', { token: boss, body: { full_name: 'Lena Lead', email: 'lena@x.com', role: 'team_leader' } });
    await api('POST', '/api/entities/User', { token: boss, body: { full_name: 'Alok Kumar', email: 'alok@x.com' } });
    lena = await login('lena@x.com');
    alok = await login('alok@x.com');
  });
  after(() => server.close());

  const me = async (t) => (await api('GET', '/api/auth/me', { token: t })).body;

  test('sync needs auth; quests and badges are claimed exactly once', async () => {
    assert.equal((await api('POST', '/api/me/sync', { body: { today: T } })).status, 401);
    const a = await me(alok);
    let s = (await api('POST', '/api/me/sync', { token: alok, body: { today: T } })).body;
    assert.equal(s.xp, 0);
    assert.equal(s.new_badges.length, 0);
    assert.equal(s.drop_available, false);
    assert.deepEqual(s.quests.map((q) => q.id), ['finish', 'track', 'kudos']);
    const made = [];
    for (let i = 0; i < 3; i += 1) made.push((await api('POST', '/api/entities/DailyTask', { token: alok, body: task(a.id) })).body);
    for (const t of made) await api('PUT', `/api/entities/DailyTask/${t.id}`, { token: alok, body: { task_status: 'Completed', actual_time_taken: 1 } });
    s = (await api('POST', '/api/me/sync', { token: alok, body: { today: T } })).body;
    assert.deepEqual(s.new_quests.sort(), ['finish', 'track']);
    assert.deepEqual(s.new_badges.map((b) => b.id).sort(), ['first_win', 'hat_trick', 'perfect_day']);
    assert.equal(s.xp, 3 * 10 + 2 * 15 + 3 * 25);
    assert.equal(s.drop_available, true);
    assert.equal(s.quests_done, 2);
    const again = (await api('POST', '/api/me/sync', { token: alok, body: { today: T } })).body;
    assert.equal(again.new_quests.length, 0); // nothing is celebrated twice
    assert.equal(again.new_badges.length, 0);
    assert.equal(again.xp, s.xp);
  });

  test('daily chest: only after finishing work, once a day, stickers are collected', async () => {
    assert.equal((await api('POST', '/api/me/daily-drop', { token: lena, body: { today: T } })).status, 409); // lena has done nothing
    const open = await api('POST', '/api/me/daily-drop', { token: alok, body: { today: T } });
    assert.equal(open.status, 200);
    assert.equal(open.body.is_new, true);
    assert.equal(open.body.sticker.rarity, 'common');
    assert.equal((await api('POST', '/api/me/daily-drop', { token: alok, body: { today: T } })).status, 409);
    const tr = (await api('GET', `/api/me/trophies?today=${T}`, { token: alok })).body;
    assert.equal(tr.stickers.filter((x) => x.owned).length, 1);
    assert.equal(tr.badges.find((b) => b.id === 'first_win').earned, true);
    assert.equal(tr.badges.find((b) => b.id === 'century').progress, 3);
    assert.equal(tr.drop_available, false);
    // the next day's chest unlocks after the next finished task; the same sticker is a duplicate (+5 XP)
    const a = await me(alok);
    const t2 = (await api('POST', '/api/entities/DailyTask', { token: alok, body: task(a.id, { date: '2026-10-15', task_status: 'Completed' }) })).body;
    assert.ok(t2.id);
    const dupe = await api('POST', '/api/me/daily-drop', { token: alok, body: { today: '2026-10-15' } });
    assert.equal(dupe.body.is_new, false);
    assert.equal(dupe.body.xp, 5);
    assert.equal((await api('POST', '/api/me/daily-drop', { token: alok, body: { today: '2026-10-15', rng: 0.99 } })).status, 409); // clients cannot steer the roll
  });

  test('mystery eggs: earned by finished work, hatch once each on the server, unlock buddies and accessories', async () => {
    assert.equal((await api('POST', '/api/me/hatch', { token: lena, body: { today: T } })).status, 409); // no work, no egg
    const st = (await api('GET', '/api/me/buddies', { token: alok })).body;
    assert.equal(st.eggs.available, st.eggs.earned);
    assert.ok(st.eggs.available >= 1);
    assert.deepEqual(st.owned_buddies.sort(), ['bunny', 'cat', 'mouse', 'robot']);
    assert.equal((await api('PATCH', '/api/auth/me', { token: alok, body: { buddy: 'dino' } })).status, 400); // not unlocked
    const hatch = await api('POST', '/api/me/hatch', { token: alok, body: { today: T, rng: 0 } });
    assert.equal(hatch.status, 200);
    assert.ok(['buddy', 'accessory'].includes(hatch.body.kind));
    assert.equal(hatch.body.is_new, true);
    const after = (await api('GET', '/api/me/buddies', { token: alok })).body;
    assert.equal(after.eggs.available, st.eggs.available - 1);
    if (hatch.body.kind === 'accessory') {
      const slot = hatch.body.slot;
      assert.equal((await api('PATCH', '/api/auth/me', { token: alok, body: { equipped: { [slot]: hatch.body.id } } })).status, 200);
      assert.equal((await api('PATCH', '/api/auth/me', { token: alok, body: { equipped: { hat: 'nonsense' } } })).status, 400);
    } else {
      assert.equal((await api('PATCH', '/api/auth/me', { token: alok, body: { buddy: hatch.body.id } })).status, 200);
    }
    const board = (await api('GET', `/api/team/parade?today=${T}&week_start=2026-10-12`, { token: alok })).body;
    assert.ok(board.find((m) => m.name));
  });

  test('achievements and kudos cannot be written directly', async () => {
    assert.equal((await api('POST', '/api/entities/Achievement', { token: alok, body: { user_id: 'x', key: 'badge:century' } })).status, 403);
    assert.equal((await api('POST', '/api/entities/Kudos', { token: alok, body: { from_user_id: 'a', to_user_id: 'b', emoji: '🙌' } })).status, 403);
  });

  test('high-fives: validated, notify the receiver, finish the kudos quest, show in the feed', async () => {
    const l = await me(lena);
    const a = await me(alok);
    assert.equal((await api('POST', '/api/kudos', { body: { to_user_id: l.id, emoji: '🙌' } })).status, 401);
    assert.equal((await api('POST', '/api/kudos', { token: alok, body: { to_user_id: a.id, emoji: '🙌' } })).status, 400); // self
    assert.equal((await api('POST', '/api/kudos', { token: alok, body: { to_user_id: l.id, emoji: '💩' } })).status, 400);
    assert.equal((await api('POST', '/api/kudos', { token: alok, body: { to_user_id: 'nope', emoji: '🙌' } })).status, 404);
    const ok = await api('POST', '/api/kudos', { token: alok, body: { to_user_id: l.id, emoji: '🙌', message: 'Great plan!' } });
    assert.equal(ok.status, 201);
    const notes = (await api('GET', '/api/notifications', { token: lena })).body;
    assert.ok(notes.some((n) => n.type === 'kudos' && /🙌/.test(n.title) && /Great plan/.test(n.message)));
    const s = (await api('POST', '/api/me/sync', { token: alok, body: { today: new Date().toISOString().slice(0, 10) } })).body;
    assert.equal(s.quests.find((q) => q.id === 'kudos').done, true);
    const pulse = (await api('GET', `/api/team/pulse?today=${T}&week_start=2026-10-12`, { token: alok })).body;
    assert.ok(pulse.wins.some((w) => w.type === 'kudos' && /Great plan/.test(w.text)));
    assert.ok(pulse.wins.some((w) => w.type === 'done'));
    assert.ok(pulse.wins.some((w) => w.type === 'badge'));
  });

  test('team pulse: weekly goal progress', async () => {
    assert.equal((await api('GET', `/api/team/pulse?today=${T}`, { token: alok })).status, 400);
    const p = (await api('GET', `/api/team/pulse?today=${T}&week_start=2026-10-12`, { token: alok })).body;
    assert.equal(p.week.planned, 4); // 3 on the 14th + 1 on the 15th
    assert.equal(p.week.done, 4);
    assert.equal(p.week.pct, 100);
    assert.equal(p.today.active_members, 1);
    assert.equal(p.today.members, 3);
    const empty = (await api('GET', `/api/team/pulse?today=${T}&week_start=2026-11-02`, { token: alok })).body;
    assert.equal(empty.week.pct, 0);
  });
});

describe('theme preferences', () => {
  let server, base, token;
  const api = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const good = { name: 'Grape Soda', mode: 'dark', neutral: { hue: 280, sat: 40 }, primary: '#8b5cf6', secondary: '#f59e0b' };

  before(async () => {
    const store = new MemoryStore();
    await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's' }).listen(0);
    base = `http://localhost:${server.address().port}`;
    token = (await api('POST', '/api/auth/login', { email: 'boss@example.com' })).body.token;
  });
  after(() => server.close());

  test('a built-in theme choice is saved on the account and comes back with /me', async () => {
    const r = await api('PATCH', '/api/auth/me', { theme: 'bubblegum-pop', theme_auto: false, theme_at: 1700000000000 });
    assert.equal(r.status, 200);
    const me = (await api('GET', '/api/auth/me')).body;
    assert.equal(me.theme, 'bubblegum-pop');
    assert.equal(me.theme_auto, false);
    assert.equal(me.theme_at, 1700000000000);
    assert.equal((await api('PATCH', '/api/auth/me', { theme_at: 'now' })).status, 400);
  });

  test('custom themes are validated strictly', async () => {
    assert.equal((await api('PATCH', '/api/auth/me', { theme: 'custom', theme_custom: JSON.stringify(good) })).status, 200);
    assert.equal(JSON.parse((await api('GET', '/api/auth/me')).body.theme_custom).name, 'Grape Soda');
    for (const bad of [
      { ...good, primary: 'red' }, { ...good, primary: 'url(javascript:alert(1))' }, { ...good, mode: 'neon' }, { ...good, name: '' },
      { ...good, name: 'x'.repeat(31) }, { ...good, neutral: { hue: 999, sat: 10 } }, { ...good, neutral: undefined },
    ]) assert.equal((await api('PATCH', '/api/auth/me', { theme_custom: JSON.stringify(bad) })).status, 400, JSON.stringify(bad));
    assert.equal((await api('PATCH', '/api/auth/me', { theme_custom: 'not json' })).status, 400);
    assert.equal((await api('PATCH', '/api/auth/me', { theme_custom: JSON.stringify({ ...good, evil: '<script>' }).padEnd(700, ' ') })).status, 400);
    assert.equal((await api('PATCH', '/api/auth/me', { theme: '../../etc' })).status, 400);
    assert.equal((await api('PATCH', '/api/auth/me', { theme: 'x'.repeat(41) })).status, 400);
    assert.equal((await api('PATCH', '/api/auth/me', { theme_auto: 'yes' })).status, 400);
  });

  test('clearing a custom theme', async () => {
    assert.equal((await api('PATCH', '/api/auth/me', { theme_custom: '' })).status, 200);
    assert.equal((await api('GET', '/api/auth/me')).body.theme_custom, undefined);
  });
});

describe('playful features are available to every role', () => {
  let server, base;
  const api = async (method, url, token, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: body && JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const login = async (email) => (await (await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })).json()).token;

  before(async () => {
    const store = new MemoryStore();
    await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's' }).listen(0);
    base = `http://localhost:${server.address().port}`;
    const admin = await login('boss@example.com');
    await api('POST', '/api/entities/User', admin, { full_name: 'Lena Lead', email: 'lena@example.com', role: 'team_leader' });
    await api('POST', '/api/entities/User', admin, { full_name: 'Mo Member', email: 'mo@example.com', role: 'team_member' });
  });
  after(() => server.close());

  for (const [role, email] of [['admin', 'boss@example.com'], ['team leader', 'lena@example.com'], ['team member', 'mo@example.com']]) {
    test(`${role}: progress, notifications, themes, buddies, eggs and the team views all work`, async () => {
      const t = await login(email);
      const T = '2026-10-14';
      assert.equal((await api('POST', '/api/me/sync', t, { today: T })).status, 200);
      assert.equal((await api('GET', `/api/me/trophies?today=${T}`, t)).status, 200);
      assert.equal((await api('GET', '/api/me/buddies', t)).status, 200);
      assert.equal((await api('GET', `/api/team/parade?today=${T}&week_start=2026-10-12`, t)).status, 200);
      assert.equal((await api('GET', `/api/team/pulse?today=${T}&week_start=2026-10-12`, t)).status, 200);
      assert.equal((await api('GET', '/api/notifications', t)).status, 200);
      assert.equal((await api('POST', '/api/notifications/read', t, {})).status, 200);
      assert.equal((await api('PATCH', '/api/auth/me', t, { theme: 'bubblegum-pop', theme_auto: false, theme_at: 1700000000000, buddy: 'robot', equipped: {} })).status, 200);
      assert.equal((await api('POST', '/api/me/hatch', t, { today: T })).status, 409); // allowed to try; just no egg yet
    });
  }

  test('anyone can send a high-five to anyone on the team', async () => {
    const mo = await login('mo@example.com');
    const lena = (await api('GET', '/api/team/parade?week_start=2026-10-12', mo)).body.find((m) => m.name === 'Lena Lead');
    assert.equal((await api('POST', '/api/kudos', mo, { to_user_id: lena.id, emoji: '🙌' })).status, 201);
    const lenaTok = await login('lena@example.com');
    const mine = (await api('GET', '/api/notifications', lenaTok)).body;
    assert.ok(JSON.stringify(mine).includes('kudos'));
  });
});

describe('anonymous bird post', () => {
  let server, base, now, store;
  const call = async (method, url, token, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : null };
  };
  const login = async (email) => (await (await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })).json()).token;
  let admin, ann, bo, cy, ids;

  before(async () => {
    now = 1_000_000;
    store = new MemoryStore();
    await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's', clock: () => now }).listen(0);
    base = `http://localhost:${server.address().port}`;
    admin = await login('boss@example.com');
    for (const [n, e, r] of [['Ann Sender', 'ann@example.com', 'team_member'], ['Bo Receiver', 'bo@example.com', 'team_member'], ['Cy Receiver', 'cy@example.com', 'team_leader']]) await call('POST', '/api/entities/User', admin, { full_name: n, email: e, role: r });
    [ann, bo, cy] = [await login('ann@example.com'), await login('bo@example.com'), await login('cy@example.com')];
    const list = (await call('GET', '/api/birds/recipients', ann)).body;
    ids = Object.fromEntries(list.map((u) => [u.name, u.id]));
  });
  after(() => server.close());

  test('a bird can be sent to one person, several people, or everyone, and the sender is never revealed', async () => {
    assert.equal((await call('POST', '/api/birds', ann, { to: [ids['Bo Receiver']], text: 'You are doing great!' })).status, 201);
    assert.equal((await call('POST', '/api/birds', ann, { to: 'all', text: 'Coffee at 4?' })).status, 201);
    const inbox = await call('GET', '/api/birds/inbox', bo);
    assert.equal(inbox.body.length, 2);
    for (const forbidden of ['Ann Sender', 'ann@example.com', 'from_user_id']) assert.ok(!inbox.text.includes(forbidden), `inbox leaks ${forbidden}`);
    assert.ok(inbox.body.every((b) => b.opened === false && b.text === undefined)); // sealed until opened
    const bird = inbox.body[0];
    assert.ok(['robin', 'bluebird', 'parrot', 'canary', 'pigeon', 'toucan', 'rosie', 'parakeet', 'plum', 'hummingbird', 'puffin', 'cockatiel'].includes(bird.bird));
    assert.equal((await call('GET', '/api/birds/inbox', ann)).body.length, 0); // the sender gets nothing back, and everyone-excludes-self
    assert.equal((await call('GET', '/api/birds/inbox', cy)).body.length, 1);
  });

  test('the generic entity API cannot read or write birds', async () => {
    assert.equal((await call('GET', '/api/entities/BirdMessage', admin)).status, 404);
    assert.equal((await call('POST', '/api/entities/BirdMessage', ann, { to_user_id: 'x', from_user_id: 'y', text: 'hi' })).status, 404);
  });

  test('opening reveals the text and the bird flies away five minutes later', async () => {
    const id = (await call('GET', '/api/birds/inbox', bo)).body[0].id;
    assert.equal((await call('POST', `/api/birds/${id}/open`, cy)).status, 404); // not yours
    const opened = (await call('POST', `/api/birds/${id}/open`, bo)).body;
    assert.ok(opened.text);
    assert.equal(opened.expires_at - opened.opened_at, 5 * 60 * 1000);
    now += 4 * 60 * 1000;
    assert.equal((await call('POST', `/api/birds/${id}/open`, bo)).body.expires_at, opened.expires_at); // reopening does not extend it
    now += 61 * 1000;
    const after = (await call('GET', '/api/birds/inbox', bo)).body;
    assert.ok(!after.some((b) => b.id === id)); // gone
    assert.equal((await call('POST', `/api/birds/${id}/open`, bo)).status, 404);
    assert.equal(after.length, 1); // the unopened one is still waiting
  });

  test('muted people silently receive nothing, and the sender cannot tell', async () => {
    assert.equal((await call('PATCH', '/api/auth/me', cy, { birds_muted: true })).status, 200);
    const r = await call('POST', '/api/birds', ann, { to: [ids['Cy Receiver']], text: 'Hello?' });
    assert.equal(r.status, 201);
    assert.equal(r.body.sent, 1);
    assert.equal((await call('GET', '/api/birds/inbox', cy)).body.filter((b) => b.opened === false).length, 1); // only the earlier one
    await call('PATCH', '/api/auth/me', cy, { birds_muted: false });
  });

  test('validation, limits and unopened-pile protection', async () => {
    assert.equal((await call('POST', '/api/birds', ann, { to: 'all', text: '   ' })).status, 400);
    assert.equal((await call('POST', '/api/birds', ann, { to: 'all', text: 'x'.repeat(281) })).status, 400);
    assert.equal((await call('POST', '/api/birds', ann, { to: ['nobody'], text: 'hi' })).status, 400);
    assert.equal((await call('POST', '/api/birds', ann, { text: 'hi' })).status, 400);
    for (let i = 0; i < 5; i += 1) await call('POST', '/api/birds', bo, { to: [ids['Ann Sender']], text: `flood ${i}` });
    assert.ok((await call('GET', '/api/birds/inbox', ann)).body.length <= 3); // at most 3 unopened birds from one sender
    let last;
    for (let i = 0; i < 70; i += 1) last = await call('POST', '/api/birds', cy, { to: 'all', text: `bulk ${i}` });
    assert.equal(last.status, 429); // hourly limit
  });
});

describe('team spirit features', () => {
  let server, base, admin, u = {};
  const TODAY = new Date().toISOString().slice(0, 10);
  const call = async (method, url, token, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : null };
  };
  const login = async (email) => (await (await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })).json()).token;
  const monday = (iso) => { const d = new Date(`${iso}T00:00:00Z`); const k = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - k); return d.toISOString().slice(0, 10); };

  before(async () => {
    const store = new MemoryStore();
    await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's' }).listen(0);
    base = `http://localhost:${server.address().port}`;
    admin = await login('boss@example.com');
    for (const n of ['ann', 'bo', 'cy', 'di']) await call('POST', '/api/entities/User', admin, { full_name: `${n[0].toUpperCase()}${n.slice(1)} Person`, email: `${n}@example.com`, role: 'team_member' });
    for (const n of ['ann', 'bo', 'cy', 'di']) u[n] = { token: await login(`${n}@example.com`) };
    const list = (await call('GET', '/api/birds/recipients', u.ann.token)).body;
    for (const n of ['ann', 'bo', 'cy', 'di']) u[n].id = list.find((x) => x.name.toLowerCase().startsWith(n))?.id;
    u.ann.id = (await call('GET', '/api/auth/me', u.ann.token)).body.id;
  });
  after(() => server.close());

  test('founder: an admin who can only be created by admins and always has the admin role', async () => {
    const made = await call('POST', '/api/entities/User', admin, { full_name: 'Fay Founder', email: 'fay@example.com', role: 'team_member', founder: true });
    assert.equal(made.status, 201);
    assert.equal(made.body.role, 'admin');
    assert.equal(made.body.founder, true);
    const fay = await login('fay@example.com');
    assert.equal((await call('GET', '/api/auth/me', fay)).body.founder, true);
    assert.equal((await call('POST', '/api/entities/User', fay, { full_name: 'Gus', email: 'gus@example.com', role: 'team_member' })).status, 201, 'founder has admin rights');
    assert.equal((await call('PUT', `/api/entities/User/${u.ann.id}`, u.ann.token, { founder: true })).status, 403);
    const down = await call('PUT', `/api/entities/User/${made.body.id}`, admin, { role: 'team_member' });
    assert.equal(down.body.founder, false);
  });

  test('private data cannot be read through the generic entity API', async () => {
    for (const e of ['Mood', 'ShoutOut', 'CoffeeEntry', 'WordGame', 'Standup', 'RetroNote', 'Idea']) assert.equal((await call('GET', `/api/entities/${e}`, admin)).status, 404, e);
  });

  test('boss battle: finished tasks hurt the boss and the reward can be claimed once', async () => {
    const ws = monday(TODAY);
    let b = (await call('GET', `/api/team/boss?today=${TODAY}&week_start=${ws}`, u.ann.token)).body;
    assert.equal(b.defeated, false);
    assert.equal((await call('POST', '/api/me/boss-claim', u.ann.token, { today: TODAY })).status, 409);
    for (let i = 0; i < 5; i += 1) await call('POST', '/api/entities/DailyTask', u.ann.token, { date: TODAY, user_id: u.ann.id, task: `t${i}`, expected_outcome: 'x', expected_time: 1, task_status: 'Completed', actual_time_taken: 1 });
    b = (await call('GET', `/api/team/boss?today=${TODAY}&week_start=${ws}`, u.ann.token)).body;
    assert.equal(b.defeated, true);
    assert.ok(b.boss.name);
    assert.equal((await call('POST', '/api/me/boss-claim', u.ann.token, { today: TODAY })).status, 200);
    assert.equal((await call('POST', '/api/me/boss-claim', u.ann.token, { today: TODAY })).status, 409);
    const eggs = (await call('GET', '/api/me/buddies', u.ann.token)).body.eggs;
    assert.ok(eggs.earned >= 1);
  });

  test('celebrations: birthdays and anniversaries appear on the day', async () => {
    const md = TODAY.slice(5);
    assert.equal((await call('PATCH', '/api/auth/me', u.bo.token, { birthday: `1990-${md}` })).status, 200);
    assert.equal((await call('PATCH', '/api/auth/me', u.bo.token, { birthday: 'nope' })).status, 400);
    const users = (await call('GET', '/api/entities/User', admin)).body;
    await call('PUT', `/api/entities/User/${users.find((x) => x.email === 'cy@example.com').id}`, admin, { hire_date: `${Number(TODAY.slice(0, 4)) - 3}-${md}` });
    const c = (await call('GET', `/api/team/celebrations?today=${TODAY}`, u.ann.token)).body;
    assert.ok(c.find((x) => x.kind === 'birthday' && x.name.startsWith('Bo') && x.days_until === 0));
    assert.ok(c.find((x) => x.kind === 'anniversary' && x.years === 3));
  });

  test('mood weather only shows once three people have answered, and never who said what', async () => {
    assert.equal((await call('POST', '/api/mood', u.ann.token, { mood: 'sunny' })).status, 201);
    assert.equal((await call('POST', '/api/mood', u.ann.token, { mood: 'bogus' })).status, 400);
    let m = (await call('GET', `/api/team/mood?today=${TODAY}`, u.ann.token)).body;
    assert.equal(m.today.visible, false); assert.equal(m.today.counts, null); assert.equal(m.mine, 'sunny');
    await call('POST', '/api/mood', u.bo.token, { mood: 'rainy' }); await call('POST', '/api/mood', u.cy.token, { mood: 'sunny' });
    const r = await call('GET', `/api/team/mood?today=${TODAY}`, u.bo.token);
    assert.equal(r.body.today.visible, true); assert.equal(r.body.today.counts.sunny, 2);
    assert.ok(!r.text.includes('user_id'));
  });

  test('shout-outs are public, notify the receiver, and cannot be self-directed', async () => {
    assert.equal((await call('POST', '/api/shoutouts', u.ann.token, { to_user_id: u.ann.id, text: 'me' })).status, 400);
    assert.equal((await call('POST', '/api/shoutouts', u.ann.token, { to_user_id: u.bo.id, text: 'Thanks for covering my review!' })).status, 201);
    const wall = (await call('GET', '/api/shoutouts', u.cy.token)).body;
    assert.equal(wall.items[0].to, 'Bo Person'); assert.equal(wall.items[0].from, 'Ann Person'); assert.equal(wall.week_count, 1);
    assert.ok(JSON.stringify((await call('GET', '/api/notifications', u.bo.token)).body).includes('shout-out'));
  });

  test('coffee roulette pairs up everyone who joined', async () => {
    const ws = monday(TODAY);
    for (const n of ['ann', 'bo', 'cy']) await call('POST', '/api/coffee', u[n].token, { week_start: ws });
    const a = (await call('GET', `/api/coffee?week_start=${ws}`, u.ann.token)).body;
    assert.equal(a.joined, true); assert.equal(a.pool, 3);
    assert.ok(a.match.length >= 1);
    assert.equal((await call('GET', `/api/coffee?week_start=${ws}`, u.di.token)).body.match, null);
  });

  test('daily word: six tries, the answer stays hidden until you finish', async () => {
    let s = (await call('GET', `/api/word/today?today=${TODAY}`, u.di.token)).body;
    assert.equal(s.answer, undefined);
    assert.equal((await call('POST', '/api/word/guess', u.di.token, { word: 'ab' })).status, 400);
    for (const w of ['zzzzz', 'qqqqq', 'xxxxx', 'jjjjj', 'vvvvv', 'kkkkk']) s = (await call('POST', '/api/word/guess', u.di.token, { word: w, today: TODAY })).body;
    assert.equal(s.done, true); assert.match(s.answer, /^[a-z]{5}$/);
    assert.equal((await call('POST', '/api/word/guess', u.di.token, { word: s.answer, today: TODAY })).status, 409);
    assert.equal((await call('GET', `/api/word/today?today=${TODAY}`, u.ann.token)).body.answer, undefined);
  });

  test('guess the colleague: a signed token checks the answer without leaking it', async () => {
    assert.equal((await call('GET', '/api/guess/round', u.ann.token)).body.available, false); // nobody shared a fact yet
    await call('PATCH', '/api/auth/me', u.bo.token, { fun_fact: 'I once cycled across Kerala' });
    const r = (await call('GET', '/api/guess/round', u.ann.token)).body;
    assert.equal(r.available, true); assert.ok(r.token && r.fact);
    assert.ok(!JSON.stringify(r).includes('correct'));
    const ok = await call('POST', '/api/guess/answer', u.ann.token, { token: r.token, choice: u.bo.id, options: r.options.map((o) => o.id) });
    assert.equal(ok.body.correct, true); assert.equal(ok.body.answer, 'Bo Person');
    const wrong = await call('POST', '/api/guess/answer', u.ann.token, { token: r.token, choice: u.cy.id, options: r.options.map((o) => o.id) });
    assert.equal(wrong.body.correct, false);
  });

  test('trivia can be answered once a day', async () => {
    const q = (await call('GET', `/api/trivia/today?today=${TODAY}`, u.ann.token)).body;
    assert.equal(q.answered, false); assert.equal(q.correct_index, undefined);
    const a = await call('POST', '/api/trivia/answer', u.ann.token, { choice: 0, today: TODAY });
    assert.equal(a.status, 200); assert.ok(Number.isInteger(a.body.correct_index));
    assert.equal((await call('POST', '/api/trivia/answer', u.ann.token, { choice: 1, today: TODAY })).status, 409);
  });

  test('wrapped recap and the daily wheel', async () => {
    const w = (await call('GET', `/api/me/wrapped?today=${TODAY}`, u.ann.token)).body;
    assert.equal(w.done, 5); assert.ok(w.title);
    assert.equal((await call('GET', `/api/me/wheel?today=${TODAY}`, u.ann.token)).body.available, true);
    assert.equal((await call('POST', '/api/me/wheel', u.di.token, { today: TODAY })).status, 409); // nothing finished today
    const spin = await call('POST', '/api/me/wheel', u.ann.token, { today: TODAY });
    assert.equal(spin.status, 200); assert.ok(['sticker', 'rare', 'epic', 'egg', 'confetti'].includes(spin.body.kind));
    assert.equal((await call('POST', '/api/me/wheel', u.ann.token, { today: TODAY })).status, 409);
  });

  test('standups reach the team; retro notes and ideas hide their authors and allow one vote each', async () => {
    assert.equal((await call('POST', '/api/standups', u.ann.token, { yesterday: 'Shipped the tracker', today: 'Polish', blockers: '' })).status, 201);
    assert.equal((await call('GET', `/api/standups?today=${TODAY}`, u.bo.token)).body[0].name, 'Ann Person');
    const note = (await call('POST', '/api/retro', u.ann.token, { column: 'well', text: 'The new board is great' })).body;
    assert.equal((await call('POST', `/api/retro/${note.id}/vote`, u.bo.token)).body.votes, 1);
    assert.equal((await call('POST', `/api/retro/${note.id}/vote`, u.bo.token)).body.votes, 0); // toggles
    const board = await call('GET', '/api/retro', u.cy.token);
    assert.equal(board.body.columns.well[0].mine, false); assert.ok(!board.text.includes('user_id'));
    assert.equal((await call('DELETE', `/api/retro/${note.id}`, u.bo.token)).status, 404); // only the author
    const idea = (await call('POST', '/api/ideas', u.ann.token, { title: 'Friday demos', text: 'Show what we built', anonymous: true })).body;
    await call('POST', `/api/ideas/${idea.id}/boost`, u.bo.token);
    const ideas = (await call('GET', '/api/ideas', u.cy.token)).body;
    assert.equal(ideas[0].votes, 2); assert.equal(ideas[0].author, null);
  });
});
