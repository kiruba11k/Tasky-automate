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
