import test from 'node:test';
import assert from 'node:assert/strict';
import { crmProblem, KINDS } from '../src/tracker.js';

test('CRM records are a team-shared kind with their own rules', () => {
  ['crmCompany', 'crmContact', 'crmDeal', 'crmActivity'].forEach((k) => assert.ok(KINDS.includes(k)));
  assert.equal(crmProblem('crmCompany', { name: 'Acme' }), null);
  assert.ok(crmProblem('crmContact', { name: ' ' }));
  assert.equal(crmProblem('crmActivity', { subject: 'Call', type: 'call' }), null);
});

test('goals need a month, a known measure, a target and an owner', () => {
  const goal = { period: '2026-11', metric: 'won_value', target: 100000, ownerId: 'u1' };
  assert.equal(crmProblem('crmGoal', goal), null);
  assert.ok(crmProblem('crmGoal', { ...goal, metric: 'vibes' }));
  assert.ok(crmProblem('crmGoal', { ...goal, period: 'November' }));
  assert.ok(crmProblem('crmGoal', { ...goal, target: -1 }));
  assert.ok(crmProblem('crmGoal', { ...goal, ownerId: '' }));
});

test('settings keep probabilities between 1% and 99% and limits in days', () => {
  const cfg = { prob: { qualified: 0.1, meeting: 0.25, proposal: 0.5, negotiation: 0.75 }, stall: { qualified: 21, meeting: 14, proposal: 14, negotiation: 21 }, quietDays: 14 };
  assert.equal(crmProblem('crmConfig', cfg), null);
  assert.ok(crmProblem('crmConfig', { ...cfg, prob: { ...cfg.prob, meeting: 1.5 } }));
  assert.ok(crmProblem('crmConfig', { ...cfg, stall: { ...cfg.stall, proposal: 0 } }));
  assert.ok(crmProblem('crmConfig', { ...cfg, quietDays: 'x' }));
  assert.ok(crmProblem('crmConfig', {}));
});

test('an open deal needs an owner and a next action; closed and nurture deals do not', () => {
  const deal = { name: 'Acme', ownerId: 'u1', stage: 'proposal', amount: 100, nextAction: { title: 'Call', due: '2026-11-05' } };
  assert.equal(crmProblem('crmDeal', deal), null);
  assert.ok(crmProblem('crmDeal', { ...deal, nextAction: null }));
  assert.ok(crmProblem('crmDeal', { ...deal, ownerId: '' }));
  assert.ok(crmProblem('crmDeal', { ...deal, amount: -5 }));
  assert.equal(crmProblem('crmDeal', { ...deal, stage: 'won', nextAction: null }), null);
  assert.equal(crmProblem('crmDeal', { ...deal, status: 'nurture', nextAction: null }), null);
});

import { describe, before, after } from 'node:test';
import { createApp, bootstrapAdmin } from '../src/app.js';
import { MemoryStore } from '../src/store.js';

describe('CRM over the API', () => {
  let server, base, admin, user;
  const call = async (token, kind, key, data) => {
    const res = await fetch(`${base}/api/tracker/docs/batch`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ patches: [{ kind, key, patch: data }] }) });
    return (await res.json()).results[0];
  };
  const login = async (email) => (await (await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })).json()).token;
  const deal = { id: 'd1', name: 'Acme', ownerId: 'x', stage: 'qualified', contactIds: ['c1'], nextAction: { title: 'Call', due: '2026-11-05' } };

  before(async () => {
    const store = new MemoryStore(); await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's', requirePassword: false }).listen(0);
    base = `http://localhost:${server.address().port}`;
    admin = await login('boss@example.com');
    await fetch(`${base}/api/entities/User`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${admin}` }, body: JSON.stringify({ full_name: 'res', email: 'res@x.com', role: 'team_member' }) });
    user = await login('res@x.com');
  });
  after(() => server.close());

  test('a deal cannot be opened for a prospect, only for a qualified lead', async () => {
    assert.equal((await call(user, 'crmContact', 'c1', { id: 'c1', name: 'Jane', lifecycle: 'prospect' })).ok, true);
    assert.equal((await call(user, 'crmDeal', 'd1', deal)).ok, false);
    assert.equal((await call(user, 'crmContact', 'c1', { lifecycle: 'lead' })).ok, true);
    assert.equal((await call(user, 'crmDeal', 'd1', deal)).ok, true);
  });

  test('settings are written by leads only, and a resource cannot set another person\'s goal', async () => {
    const cfg = { id: 'main', prob: { qualified: 0.1, meeting: 0.2, proposal: 0.5, negotiation: 0.8 }, stall: { qualified: 20, meeting: 10, proposal: 10, negotiation: 20 }, quietDays: 10 };
    assert.equal((await call(user, 'crmConfig', 'main', cfg)).ok, false);
    assert.equal((await call(admin, 'crmConfig', 'main', cfg)).ok, true);
    const goal = { id: 'g1', ownerId: 'someone-else', period: '2026-11', metric: 'won_value', target: 1000 };
    assert.equal((await call(user, 'crmGoal', 'g1', goal)).ok, false);
    assert.equal((await call(admin, 'crmGoal', 'g1', goal)).ok, true);
  });
});
