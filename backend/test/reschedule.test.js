import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, bootstrapAdmin } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { leavesProblem, taskDateProblem } from '../src/tracker.js';

test('leavesProblem accepts full, half and holiday days', () => {
  assert.equal(leavesProblem({ leaves: [{ date: '2026-10-21', kind: 'full' }, { date: '2026-10-22', kind: 'half', note: 'x' }, { date: '2026-10-24', kind: 'holiday', note: 'Diwali' }] }), null);
  assert.ok(leavesProblem({ leaves: [{ date: '2026-10-21', kind: 'party' }] }));
  assert.ok(leavesProblem({ leaves: [{ date: 'tomorrow', kind: 'holiday' }] }));
  assert.equal(leavesProblem({}), null);
});

test('taskDateProblem needs a real YYYY-MM-DD day', () => {
  assert.equal(taskDateProblem({ date: '2026-10-24' }), null);
  assert.equal(taskDateProblem({}), null);
  assert.ok(taskDateProblem({ date: '2026-13-40' }));
  assert.ok(taskDateProblem({ date: '24/10/2026' }));
});

describe('rescheduling a task and moving day rows', () => {
  let server, base; const ids = {}; const tok = {};
  const call = async (method, url, token, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    const t = await res.text(); return { status: res.status, body: t ? JSON.parse(t) : null };
  };
  const login = async (email) => (await call('POST', '/api/auth/login', null, { email })).body.token;
  const put = (token, kind, key, data) => call('POST', '/api/tracker/docs/batch', token, { patches: [{ kind, key, patch: data }] }).then((r) => r.body.results[0]);
  const read = async (token, kind, key) => (await call('GET', '/api/tracker/docs', token)).body.docs.find((d) => d.kind === kind && d.key === key)?.data;
  let admin;
  before(async () => {
    const store = new MemoryStore(); await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's', requirePassword: false }).listen(0);
    base = `http://localhost:${server.address().port}`;
    admin = await login('boss@example.com');
    for (const [n, role] of [['pm', 'team_leader'], ['res', 'team_member'], ['other', 'team_member']]) {
      ids[n] = (await call('POST', '/api/entities/User', admin, { full_name: n, email: `${n}@x.com`, role })).body.id;
      tok[n] = await login(`${n}@x.com`);
    }
    await put(admin, 'project', 'p1', { id: 'p1', name: 'P1', status: 'active', pmId: ids.pm, teamIds: [ids.pm, ids.res], admins: [] });
    await put(tok.pm, 'task', 't1', { id: 't1', title: 'Calls', projectId: 'p1', typeId: 'l1', assigneeId: ids.res, assignedById: ids.pm, reviewerId: ids.pm, date: '2026-10-23', qty: 10, targetMinutes: 60, status: 'todo', history: [] });
  });
  after(() => server?.close());

  test('the assignee and the assigner can change the day of a task; status and numbers stay', async () => {
    assert.equal((await put(tok.res, 'task', 't1', { date: '2026-10-26', history: [{ at: 'x', by: ids.res, action: 'rescheduled', note: '2026-10-23 to 2026-10-26' }] })).ok, true);
    let t = await read(tok.pm, 'task', 't1');
    assert.equal(t.date, '2026-10-26'); assert.equal(t.status, 'todo'); assert.equal(t.qty, 10);
    assert.equal((await put(tok.pm, 'task', 't1', { date: '2026-10-27' })).ok, true);
    t = await read(tok.res, 'task', 't1');
    assert.equal(t.date, '2026-10-27');
  });

  test('someone else cannot reschedule it, and the day must be real', async () => {
    assert.equal((await put(tok.other, 'task', 't1', { date: '2026-10-28' })).ok, false);
    assert.equal((await put(tok.res, 'task', 't1', { date: 'next week' })).ok, false);
    assert.equal((await read(tok.pm, 'task', 't1')).date, '2026-10-27');
  });

  test('moving a row between days is two plain owner writes; nobody can write another person\'s day', async () => {
    const row = { id: 'r1', projectId: 'p1', task: 'l1', qty: 5, estMin: 30, remarks: '' };
    assert.equal((await put(tok.res, 'daily', `${ids.res}|2026-10-24`, { entries: [row] })).ok, true);
    assert.equal((await put(tok.res, 'daily', `${ids.res}|2026-10-26`, { entries: [{ ...row, id: 'r2' }] })).ok, true);
    assert.equal((await put(tok.res, 'daily', `${ids.res}|2026-10-24`, { entries: [] })).ok, true);
    assert.equal((await put(tok.other, 'daily', `${ids.res}|2026-10-26`, { entries: [] })).ok, false);
    assert.equal((await read(tok.res, 'daily', `${ids.res}|2026-10-26`)).entries[0].id, 'r2');
  });

  test('a holiday is saved on the profile like leave', async () => {
    assert.equal((await put(tok.res, 'profile', ids.res, { leaves: [{ date: '2026-10-24', kind: 'holiday', note: 'Diwali' }] })).ok, true);
    assert.equal((await put(tok.res, 'profile', ids.res, { leaves: [{ date: '2026-10-24', kind: 'bogus' }] })).ok, false);
    assert.equal((await put(tok.other, 'profile', ids.res, { leaves: [] })).ok, false);
  });
});
