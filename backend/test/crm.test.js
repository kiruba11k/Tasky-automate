import test from 'node:test';
import assert from 'node:assert/strict';
import { crmProblem, KINDS } from '../src/tracker.js';

test('CRM records are a team-shared kind with their own rules', () => {
  ['crmCompany', 'crmContact', 'crmDeal', 'crmActivity'].forEach((k) => assert.ok(KINDS.includes(k)));
  assert.equal(crmProblem('crmCompany', { name: 'Acme' }), null);
  assert.ok(crmProblem('crmContact', { name: ' ' }));
  assert.equal(crmProblem('crmActivity', { subject: 'Call', type: 'call' }), null);
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
