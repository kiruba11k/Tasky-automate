import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, bootstrapAdmin } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { eodReviewsProblem } from '../src/tracker.js';

const T0 = '2026-10-21T18:00:00.000Z';
const T1 = '2026-10-21T18:30:00.000Z';
const pending = (reviewerId, sentAt = T0) => ({ status: 'pending', reviewerId, sentAt });

test('eodReviewsProblem checks the shape of end of day approvals', () => {
  assert.equal(eodReviewsProblem({}), null);
  assert.equal(eodReviewsProblem({ eodReviews: { p1: pending('u1') } }), null);
  assert.equal(eodReviewsProblem({ eodReviews: { p1: { status: 'approved', reviewerId: 'u1', sentAt: T0, decidedAt: T1, by: 'u1', for: T0 } } }), null);
  assert.equal(eodReviewsProblem({ eodReviews: { p1: { status: 'changes', reviewerId: 'u1', sentAt: T0, decidedAt: T1, by: 'u1', note: 'Redo the deck' } } }), null);
  assert.match(eodReviewsProblem({ eodReviews: { p1: { status: 'changes', reviewerId: 'u1', sentAt: T0, decidedAt: T1, by: 'u1', note: '  ' } } }), /Feedback cannot be empty/);
  assert.ok(eodReviewsProblem({ eodReviews: 'x' }));
  assert.ok(eodReviewsProblem({ eodReviews: [] }));
  assert.ok(eodReviewsProblem({ eodReviews: { p1: { ...pending('u1'), status: 'maybe' } } }));
  assert.ok(eodReviewsProblem({ eodReviews: { p1: { ...pending('u1'), sentAt: 'yesterday' } } }));
  assert.ok(eodReviewsProblem({ eodReviews: { p1: { ...pending('u1'), extra: 1 } } }));
  assert.ok(eodReviewsProblem({ eodReviews: { p1: { ...pending('u1'), by: 'u1' } } }), 'a pending request carries no decision');
  assert.ok(eodReviewsProblem({ eodReviews: { p1: { status: 'approved', reviewerId: 'u1', sentAt: T0 } } }), 'a decision names who and when');
  assert.ok(eodReviewsProblem({ eodReviews: { p1: { status: 'changes', reviewerId: 'u1', sentAt: T0, decidedAt: T1, by: 'u1', note: 'x'.repeat(1001) } } }));
  assert.ok(eodReviewsProblem({ eodReviews: { p1: pending('') } }));
});

describe('end of day approval goes to the project manager', () => {
  let server, base; const ids = {}; const tok = {};
  const call = async (method, url, token, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    const t = await res.text(); return { status: res.status, body: t ? JSON.parse(t) : null };
  };
  const login = async (email) => (await call('POST', '/api/auth/login', null, { email })).body.token;
  const put = (token, kind, key, data) => call('POST', '/api/tracker/docs/batch', token, { patches: [{ kind, key, patch: data }] }).then((r) => r.body.results[0]);
  const day = (who) => `${ids[who]}|2026-10-21`;
  const read = async (token, key) => (await call('GET', '/api/tracker/docs', token)).body.docs.find((d) => d.kind === 'daily' && d.key === key)?.data;
  const decision = (who, status, extra = {}, sentAt = T0) => ({ eodReviews: { p1: { status, reviewerId: ids.pm, sentAt, decidedAt: T1, by: ids[who], for: sentAt, ...extra } } });
  let admin;

  before(async () => {
    const store = new MemoryStore(); await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's', requirePassword: false }).listen(0);
    base = `http://localhost:${server.address().port}`;
    admin = await login('boss@example.com');
    for (const [n, role] of [['pm', 'team_leader'], ['res', 'team_member'], ['other', 'team_leader'], ['res2', 'team_member']]) {
      ids[n] = (await call('POST', '/api/entities/User', admin, { full_name: n, email: `${n}@x.com`, role })).body.id;
      tok[n] = await login(`${n}@x.com`);
    }
    await put(admin, 'project', 'p1', { id: 'p1', name: 'P1', status: 'active', pmId: ids.pm, teamIds: [ids.pm, ids.res], admins: [] });
    await put(admin, 'project', 'p2', { id: 'p2', name: 'P2', status: 'active', pmId: ids.other, teamIds: [ids.other, ids.res], admins: [] });
    await put(admin, 'project', 'p3', { id: 'p3', name: 'P3', status: 'active', pmId: null, teamIds: [ids.res], admins: [] });
  });
  after(() => server?.close());

  test('the owner sends to the project manager; a wrong reviewer is refused', async () => {
    assert.equal((await put(tok.res, 'daily', day('res'), { eodAt: T0, entries: [] })).ok, true);
    assert.equal((await put(tok.res, 'daily', day('res'), { eodReviews: { p1: pending(ids.other) } })).ok, false, 'another manager is not p1\'s reviewer');
    assert.equal((await put(tok.res, 'daily', day('res'), { eodReviews: { p1: pending(ids.res) } })).ok, false, 'cannot review own work');
    assert.equal((await put(tok.res, 'daily', day('res'), { eodReviews: { p1: { status: 'approved', reviewerId: ids.pm, sentAt: T0, decidedAt: T1, by: ids.res, for: T0 } } })).ok, false, 'cannot approve own work');
    assert.equal((await put(tok.res, 'daily', day('res'), { eodReviews: { nope: pending(ids.pm) } })).ok, false, 'unknown project');
    assert.equal((await put(tok.res, 'daily', day('res'), { eodReviews: { p1: pending(ids.pm), p2: pending(ids.other) } })).ok, true);
    const d = await read(tok.pm, day('res'));
    assert.equal(d.eodReviews.p1.reviewerId, ids.pm);
    assert.equal(d.eodReviews.p2.reviewerId, ids.other);
  });

  test('another person cannot send a request for someone else', async () => {
    assert.equal((await put(tok.res2, 'daily', day('res'), { eodReviews: { p1: pending(ids.pm) } })).ok, false);
    assert.equal((await put(tok.pm, 'daily', day('res'), { eodNote: 'hi' })).ok, false);
  });

  test('the project manager decides, another manager cannot', async () => {
    assert.equal((await put(tok.other, 'daily', day('res'), decision('other', 'approved'))).ok, false, 'p1 belongs to pm');
    assert.equal((await put(tok.res2, 'daily', day('res'), decision('res2', 'approved'))).ok, false);
    assert.equal((await put(tok.pm, 'daily', day('res'), decision('pm', 'approved', {}, '2026-10-21T17:00:00.000Z'))).ok, false, 'must answer the current send');
    assert.equal((await put(tok.pm, 'daily', day('res'), decision('pm', 'approved', { by: ids.res }))).ok, false, 'by must be the decider');
    assert.equal((await put(tok.pm, 'daily', day('res'), decision('pm', 'changes', { note: ' ' }))).ok, false, 'feedback is required');
    assert.equal((await put(tok.pm, 'daily', day('res'), decision('pm', 'approved'))).ok, true);
    assert.equal((await put(tok.other, 'daily', day('res'), decision('other', 'changes', { reviewerId: ids.other, note: 'no', }))).ok, false);
    assert.equal((await put(tok.other, 'daily', day('res'), { eodReviews: { p2: { status: 'changes', reviewerId: ids.other, sentAt: T0, decidedAt: T1, by: ids.other, for: T0, note: 'Redo the leads' } } })).ok, true);
    const d = await read(tok.res, day('res'));
    assert.equal(d.eodReviews.p1.status, 'approved');
    assert.equal(d.eodReviews.p1.by, ids.pm);
    assert.equal(d.eodReviews.p2.status, 'changes');
    assert.equal(d.eodReviews.p2.note, 'Redo the leads');
  });

  test('a manager cannot change anything else on the day, or the request itself', async () => {
    assert.equal((await put(tok.pm, 'daily', day('res'), { ...decision('pm', 'approved'), eodNote: 'sneaky' })).ok, false);
    assert.equal((await put(tok.pm, 'daily', day('res'), { eodAt: null })).ok, false);
    assert.equal((await put(tok.pm, 'daily', day('res'), { eodReviews: { p1: { sentAt: T1 } } })).ok, false, 'cannot move sentAt');
    assert.equal((await put(tok.pm, 'daily', day('res'), { eodReviews: { p1: { reviewerId: ids.res } } })).ok, false, 'cannot change reviewer');
    assert.equal((await put(tok.pm, 'daily', day('res'), { eodReviews: { p1: null } })).ok, false, 'cannot remove');
    assert.equal((await put(tok.pm, 'daily', day('res'), { eodReviews: null })).ok, false);
    assert.equal((await put(tok.pm, 'daily', day('res'), { eodReviews: { p2: decision('pm', 'approved').eodReviews.p1 } })).ok, false, 'p2 is not pm\'s project');
    assert.equal((await put(tok.pm, 'daily', `${ids.res}|2026-10-22`, decision('pm', 'approved'))).ok, false, 'no request on that day');
    assert.equal((await read(tok.res, day('res'))).eodNote, undefined);
  });

  test('the owner can take every request back in one patch', async () => {
    assert.equal((await put(tok.res2, 'daily', day('res2'), { eodAt: T0, eodReviews: { p1: pending(ids.pm) } })).ok, true);
    assert.equal((await put(tok.res2, 'daily', day('res2'), { eodReviews: null })).ok, true);
    assert.equal((await read(tok.pm, day('res2'))).eodReviews, undefined);
  });

  test('leadership may decide on any project', async () => {
    const me = (await call('GET', '/api/tracker/people', admin)).body.find((p) => p.role === 'manager');
    assert.equal((await put(admin, 'daily', day('res'), { eodReviews: { p2: { status: 'approved', reviewerId: ids.other, sentAt: T0, decidedAt: T1, by: me.id, for: T0, note: null } } })).ok, true);
    assert.equal((await read(tok.res, day('res'))).eodReviews.p2.status, 'approved');
  });

  test('sending again resets the request to pending and clears the decision', async () => {
    const r = await put(tok.res, 'daily', day('res'), { eodAt: T1, eodReviews: { p1: { ...pending(ids.pm, T1), decidedAt: null, by: null, for: null, note: null } } });
    assert.equal(r.ok, true);
    const p1 = (await read(tok.pm, day('res'))).eodReviews.p1;
    assert.deepEqual(p1, pending(ids.pm, T1));
    // an answer to the older send no longer fits
    assert.equal((await put(tok.pm, 'daily', day('res'), decision('pm', 'approved', {}, T0))).ok, false);
    assert.equal((await put(tok.pm, 'daily', day('res'), { eodReviews: { p1: { status: 'approved', by: ids.pm, decidedAt: T1, for: T1 } } })).ok, true);
  });

  test('the manager of the project approves their own work at once; a project without a manager is not sent', async () => {
    const own = { status: 'approved', reviewerId: ids.pm, sentAt: T0, decidedAt: T0, by: ids.pm, for: T0, auto: true };
    assert.equal((await put(tok.pm, 'daily', day('pm'), { eodAt: T0, eodReviews: { p1: own } })).ok, true);
    assert.equal((await put(tok.pm, 'daily', day('pm'), { eodReviews: { p2: { ...own, reviewerId: ids.pm } } })).ok, false, 'not their project');
    assert.equal((await put(tok.pm, 'daily', `${ids.pm}|2026-10-22`, { eodReviews: { p1: pending(ids.pm) } })).ok, false);
    assert.equal((await put(tok.res, 'daily', day('res'), { eodReviews: { p3: pending(ids.pm) } })).ok, false, 'p3 has no manager');
  });
});
