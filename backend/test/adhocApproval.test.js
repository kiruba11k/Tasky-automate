import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, bootstrapAdmin } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { entriesProblem, asgProblem, taskLinksProblem, lunchProblem, dailyProblem } from '../src/tracker.js';

test('links and task rows are checked', () => {
  assert.equal(taskLinksProblem({}), null);
  assert.equal(taskLinksProblem({ links: ['https://docs.google.com/x'] }), null);
  assert.match(taskLinksProblem({ links: ['javascript:alert(1)'] }), /web addresses/);
  assert.match(taskLinksProblem({ links: 'https://a.com' }), /web addresses/);
  assert.match(taskLinksProblem({ links: Array(11).fill('https://a.com') }), /at most 10/);
  const row = { id: 'e1', projectId: 'p', task: 'model', estMin: 30, qty: 4 };
  assert.equal(entriesProblem({}), null);
  assert.equal(entriesProblem({ entries: [row] }), null);
  assert.ok(entriesProblem({ entries: 'x' }));
  assert.ok(entriesProblem({ entries: [{ ...row, qty: -1 }] }));
  assert.ok(entriesProblem({ entries: [{ ...row, task: 5 }] }));
  assert.ok(entriesProblem({ entries: Array(301).fill(row) }));
  assert.equal(entriesProblem({ entries: [{ ...row, estManual: true }] }), null);
  assert.ok(entriesProblem({ entries: [{ ...row, estManual: 'yes' }] }));
});

test('the time a plan was locked (planAt) is an ISO time or absent', () => {
  assert.equal(dailyProblem({}), null);
  assert.equal(dailyProblem({ planAt: '2026-10-21T09:30:00.000Z' }), null);
  assert.equal(dailyProblem({ planAt: null }), null);
  assert.ok(dailyProblem({ planAt: 'yesterday' }));
  assert.ok(dailyProblem({ planAt: 5 }));
});

test('a day\'s lunch break is a valid time range', () => {
  assert.equal(lunchProblem({}), null);
  assert.equal(lunchProblem({ lunch: { start: '12:30', end: '13:30' } }), null);
  assert.ok(lunchProblem({ lunch: { start: '14:00', end: '13:00' } }));
  assert.ok(lunchProblem({ lunch: { start: '09:00', end: '10:00' } }));
  assert.ok(lunchProblem({ lunch: 'noon' }));
});

describe('send for approval: anyone sends their own unassigned work to a reviewer', () => {
  let server, base; const ids = {}; const tok = {};
  const call = async (method, url, token, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    const t = await res.text(); return { status: res.status, body: t ? JSON.parse(t) : null };
  };
  const login = async (email) => (await call('POST', '/api/auth/login', null, { email })).body.token;
  const put = (token, kind, key, data) => call('POST', '/api/tracker/docs/batch', token, { patches: [{ kind, key, patch: data }] }).then((r) => r.body.results[0]);
  const adhoc = (who, extra = {}) => ({ id: 'a1', adhoc: true, status: 'in_review', title: 'Pitch deck', assigneeId: ids[who], assignedById: ids[who], reviewerId: ids.pm, projectId: 'p1', links: ['https://docs.google.com/d/1'], ...extra });

  before(async () => {
    const store = new MemoryStore(); await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's', requirePassword: false }).listen(0);
    base = `http://localhost:${server.address().port}`;
    const admin = await login('boss@example.com');
    for (const [n, role] of [['pm', 'team_leader'], ['res', 'team_member'], ['out', 'team_member'], ['other', 'team_leader']]) {
      ids[n] = (await call('POST', '/api/entities/User', admin, { full_name: n, email: `${n}@x.com`, role })).body.id;
      tok[n] = await login(`${n}@x.com`);
    }
    await put(admin, 'project', 'p1', { id: 'p1', name: 'P', status: 'active', pmId: ids.pm, teamIds: [ids.pm, ids.res], admins: [] });
  });
  after(() => server.close());

  test('only the project owner, its admins and the main admins edit a project', async () => {
    const admin = await login('boss@example.com');
    assert.equal((await put(tok.pm, 'project', 'p1', { description: 'by owner' })).ok, true);
    assert.equal((await put(tok.other, 'project', 'p1', { description: 'by another project manager' })).ok, false);
    assert.equal((await put(tok.res, 'project', 'p1', { description: 'by a team member' })).ok, false);
    assert.equal((await put(admin, 'project', 'p1', { description: 'by a main admin' })).ok, true);
    assert.equal((await put(tok.pm, 'project', 'p1', { admins: [ids.other] })).ok, true);
    assert.equal((await put(tok.other, 'project', 'p1', { description: 'by a project admin' })).ok, true);
    assert.equal((await put(tok.pm, 'project', 'p1', { admins: [] })).ok, true);
  });

  test('a team member sends their own work to the project manager', async () => {
    assert.equal((await put(tok.res, 'task', 'a1', adhoc('res'))).ok, true);
  });
  test('a resource cannot choose another reviewer, nor send work for someone else, nor on a project they are not on', async () => {
    assert.equal((await put(tok.res, 'task', 'a2', adhoc('res', { id: 'a2', reviewerId: ids.other }))).ok, false);
    assert.equal((await put(tok.res, 'task', 'a3', adhoc('res', { id: 'a3', assigneeId: ids.pm }))).ok, false);
    assert.equal((await put(tok.out, 'task', 'a4', adhoc('out', { id: 'a4' }))).ok, false);
  });
  test('it must start in review, stay an ad-hoc task, and carry real links', async () => {
    assert.equal((await put(tok.res, 'task', 'a5', adhoc('res', { id: 'a5', status: 'done' }))).ok, false);
    assert.equal((await put(tok.res, 'task', 'a6', adhoc('res', { id: 'a6', adhoc: false }))).ok, false);
    assert.equal((await put(tok.res, 'task', 'a7', adhoc('res', { id: 'a7', links: ['javascript:alert(1)'] }))).ok, false);
  });
  test('only the reviewer approves it', async () => {
    assert.equal((await put(tok.res, 'task', 'a1', { status: 'done' })).ok, false);
    assert.equal((await put(tok.other, 'task', 'a1', { status: 'done' })).ok, false);
    assert.equal((await put(tok.pm, 'task', 'a1', { status: 'done' })).ok, true);
  });
  test('a resource hands a task to anyone on a project they are on, but not on others or in other states', async () => {
    const give = (who, extra = {}) => ({ id: 'g1', status: 'todo', title: 'Pull list', assigneeId: ids.other, assignedById: ids[who], projectId: 'p1', ...extra });
    assert.equal((await put(tok.res, 'task', 'g1', give('res'))).ok, true);
    assert.equal((await put(tok.res, 'task', 'g2', give('res', { id: 'g2', assignedById: ids.pm }))).ok, false); // in someone else's name
    assert.equal((await put(tok.res, 'task', 'g3', give('res', { id: 'g3', status: 'done' }))).ok, false);
    assert.equal((await put(tok.res, 'task', 'g4', give('res', { id: 'g4', reviewerId: ids.res }))).ok, false);
    assert.equal((await put(tok.res, 'task', 'g5', give('res', { id: 'g5', assigneeId: 'nobody' }))).ok, false);
    assert.equal((await put(tok.out, 'task', 'g6', give('out', { id: 'g6' }))).ok, false); // not on the project
    assert.equal((await put(tok.res, 'task', 'g1', { title: 'Pull list v2' })).ok, true); // the assigner can still edit it
  });
  test('work ticked off in the day tables counts for the fun layer once, and not on top of a submitted task', async () => {
    const admin = await login('boss@example.com');
    const mirrors = async () => (await call('GET', '/api/entities/DailyTask', admin)).body.filter((r) => String(r.tracker_key || '').startsWith('entry:'));
    const day = `${ids.res}|2026-10-14`;
    const l1 = { id: 'r1', projectId: 'p1', task: 'l1', qty: 30, doneQty: 30, estMin: 60, actualMin: 50 };
    const deck = { id: 'r2', projectId: 'p1', task: 'deck', qty: 1 };
    assert.equal((await put(tok.res, 'daily', day, { entries: [l1, deck] })).ok, true);
    let m = await mirrors(); assert.equal(m.length, 1); assert.equal(m[0].task_status, 'Completed'); assert.equal(m[0].user_id, ids.res);
    assert.equal((await put(tok.res, 'daily', day, { entries: [l1, { ...deck, doneQty: 1 }] })).ok, true);
    assert.equal((await mirrors()).length, 2);
    assert.equal((await put(tok.res, 'daily', day, { entries: [{ ...l1, doneQty: undefined }, { ...deck, doneQty: 1 }] })).ok, true); // unticked
    assert.equal((await mirrors()).length, 1);
    // a submitted task for the same project and kind of work covers it
    assert.equal((await put(tok.res, 'task', 'cover', { id: 'cover', status: 'todo', title: 'Decks', typeId: 'deck', date: '2026-10-14', assigneeId: ids.res, assignedById: ids.res, projectId: 'p1' })).ok, true);
    assert.equal((await put(tok.res, 'task', 'cover', { status: 'in_review', reviewerId: ids.pm })).ok, true);
    assert.equal((await mirrors()).length, 0);
  });
  test('task rows of a day are saved by their owner only, and must be valid', async () => {
    const day = `${ids.res}|2026-10-13`;
    const row = { id: 'e1', projectId: 'p1', task: 'model', desc: '', qty: 4, estMin: 30 };
    assert.equal((await put(tok.res, 'daily', day, { entries: [row], entriesAt: new Date().toISOString() })).ok, true);
    assert.equal((await put(tok.res, 'daily', day, { entries: [{ ...row, qty: -5 }] })).ok, false);
    assert.equal((await put(tok.out, 'daily', day, { entries: [row] })).ok, false);
  });
});

test('time and notes typed on assigned rows of a day are checked', () => {
  const ok = { 'asg|u|2026-10-16|p|l1': { projectId: 'p', task: 'l1', actualMin: 45, remarks: 'done early' } };
  assert.equal(asgProblem({}), null);
  assert.equal(asgProblem({ asg: ok }), null);
  assert.ok(asgProblem({ asg: 'x' }));
  assert.ok(asgProblem({ asg: [] }));
  assert.ok(asgProblem({ asg: { a: { projectId: 'p', actualMin: -1 } } }));
  assert.ok(asgProblem({ asg: { a: { actualMin: 5 } } }));
  assert.ok(asgProblem({ asg: { a: { projectId: 'p', remarks: 'x'.repeat(1001) } } }));
});
