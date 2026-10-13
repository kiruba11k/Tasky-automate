import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, bootstrapAdmin } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { entriesProblem, taskLinksProblem } from '../src/tracker.js';

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
  test('task rows of a day are saved by their owner only, and must be valid', async () => {
    const day = `${ids.res}|2026-10-13`;
    const row = { id: 'e1', projectId: 'p1', task: 'model', desc: '', qty: 4, estMin: 30 };
    assert.equal((await put(tok.res, 'daily', day, { entries: [row], entriesAt: new Date().toISOString() })).ok, true);
    assert.equal((await put(tok.res, 'daily', day, { entries: [{ ...row, qty: -5 }] })).ok, false);
    assert.equal((await put(tok.out, 'daily', day, { entries: [row] })).ok, false);
  });
});
