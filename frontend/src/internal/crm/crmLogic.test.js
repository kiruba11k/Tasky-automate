import test from 'node:test';
import assert from 'node:assert/strict';
import { moveStage, dealProblem, dealRisk, atRiskDeals, pipelineStats, myActions, completeAction } from './crmLogic.js';

const today = '2026-11-04';
const deal = (o = {}) => ({ id: 'd1', name: 'Acme', ownerId: 'u1', stage: 'proposal', amount: 10000, closeDate: '2026-11-30', nextAction: { title: 'Call', due: '2026-11-05' }, createdAt: '2026-11-01T00:00:00Z', ...o });

test('an open deal needs an owner, a next action and a date', () => {
  assert.equal(dealProblem(deal()), null);
  assert.match(dealProblem(deal({ ownerId: '' })), /owner/);
  assert.match(dealProblem(deal({ nextAction: null })), /next action/);
  assert.match(dealProblem(deal({ nextAction: { title: 'Call' } })), /due date/);
  assert.equal(dealProblem(deal({ stage: 'won', nextAction: null })), null);
  assert.match(dealProblem(deal({ status: 'nurture', nextAction: null })), /revisit/);
});

test('risk flags carry a reason and weigh deal size', () => {
  assert.equal(dealRisk(deal(), today).level, 'low');
  const r = dealRisk(deal({ nextAction: null, closeDate: '2026-10-01', closeDateChanges: 3 }), today);
  assert.equal(r.level, 'high');
  assert.ok(r.reasons.length >= 3);
  assert.equal(dealRisk(deal({ nextAction: { title: 'x', due: '2026-11-01' } }), today).level, 'medium');
  assert.equal(dealRisk(deal({ stage: 'won', nextAction: null }), today).level, 'low');
});

test('at-risk deals are sorted by risk then value', () => {
  const list = atRiskDeals([deal({ id: 'a', nextAction: null, amount: 1 }), deal({ id: 'b', nextAction: null, amount: 9 }), deal({ id: 'c' })], today);
  assert.deepEqual(list.map((x) => x.deal.id), ['b', 'a']);
});

test('pipeline and weighted forecast', () => {
  const s = pipelineStats([deal({ amount: 1000, stage: 'proposal' }), deal({ id: 'd2', amount: 1000, stage: 'negotiation' }), deal({ id: 'd3', stage: 'won' }), deal({ id: 'd4', stage: 'lost' })], '2026-11');
  assert.equal(s.pipeline, 2000);
  assert.equal(s.weighted, 1250);
  assert.equal(s.closingThisMonth, 2);
  assert.equal(s.winRate, 50);
});

test('my actions splits overdue, today and upcoming and keeps nurture out of the forecast', () => {
  const q = myActions([
    deal({ id: 'o', nextAction: { title: 'a', due: '2026-11-01' } }),
    deal({ id: 't', nextAction: { title: 'a', due: today } }),
    deal({ id: 'u', nextAction: { title: 'a', due: '2026-11-09' } }),
    deal({ id: 'n', status: 'nurture', revisitOn: '2026-12-01', nextAction: null }),
    deal({ id: 'x', ownerId: 'u2' }),
  ], 'u1', today);
  assert.deepEqual([q.overdue, q.today, q.upcoming, q.nurture].map((l) => l.map((d) => d.id)), [['o'], ['t'], ['u'], ['n']]);
  assert.equal(pipelineStats([deal({ status: 'nurture', revisitOn: '2026-12-01', nextAction: null })], '2026-11').openCount, 0);
});

test('completing an action records the outcome and asks for the next step', () => {
  const ctx = { today, now: '2026-11-04T10:00:00Z', activityId: 'a1', me: 'u1' };
  const r = completeAction(deal(), { outcomeId: 'meeting_booked', note: 'Tue 3pm' }, ctx);
  assert.equal(r.deal.stage, 'meeting');
  assert.equal(r.deal.nextAction.title, 'Prepare for the meeting');
  assert.equal(r.deal.nextAction.due, '2026-11-05');
  assert.equal(r.activity.outcome, 'meeting_booked');
  assert.equal(completeAction(deal(), { outcomeId: 'not_interested' }, ctx).deal.stage, 'lost');
  assert.match(completeAction(deal(), { outcomeId: 'nurture' }, ctx).error, /revisit/);
  const n = completeAction(deal(), { outcomeId: 'nurture', revisitOn: '2026-12-01' }, ctx);
  assert.equal(n.deal.status, 'nurture');
  assert.equal(n.deal.nextAction, null);
  assert.equal(completeAction(deal(), { outcomeId: 'connected', next: { title: 'Send deck', due: '2026-11-07' } }, ctx).deal.nextAction.due, '2026-11-07');
});

test('moving a deal between stages', () => {
  const m = moveStage(deal(), 'negotiation', '2026-11-04T10:00:00Z');
  assert.equal(m.deal.stage, 'negotiation');
  assert.equal(m.deal.lastActivityAt, '2026-11-04T10:00:00Z');
  const won = moveStage(deal(), 'won', '2026-11-04T10:00:00Z').deal;
  assert.equal(won.stage, 'won');
  assert.ok(won.closedAt);
  assert.match(moveStage({ ...won, nextAction: null }, 'proposal', 'x').error, /next action/);
  assert.equal(moveStage(won, 'proposal', 'x').deal.closedAt, undefined);
  assert.ok(moveStage(deal(), 'nope', 'x').error);
});

import { dealContactProblem, lifecycleAfterDeal } from './crmLogic.js';
test('lifecycle: prospects are qualified before a deal; a won deal makes customers', () => {
  assert.match(dealContactProblem([{ name: 'Jane', lifecycle: 'prospect' }]), /Qualify Jane/);
  assert.equal(dealContactProblem([{ name: 'Jane', lifecycle: 'lead' }, undefined]), null);
  assert.equal(lifecycleAfterDeal({ lifecycle: 'lead' }, { stage: 'won' }), 'customer');
  assert.equal(lifecycleAfterDeal({ lifecycle: 'lead' }, { stage: 'proposal' }), 'lead');
});

test('a deal stuck in one stage is flagged with the days it has sat there', () => {
  const stuck = dealRisk(deal({ stageSince: '2026-10-10T00:00:00Z', lastActivityAt: '2026-11-03T00:00:00Z' }), today);
  assert.ok(stuck.reasons.some((r) => /Stalled in Proposal sent for 25 days/.test(r)));
  assert.equal(stuck.level, 'medium');
  assert.equal(dealRisk(deal({ stageSince: '2026-11-01T00:00:00Z' }), today).level, 'low');
});

import { applyConfig, DEFAULT_CONFIG, stageOf as stageLookup } from './crmLogic.js';
test('shared settings change the forecast and the stall limit, and reset to defaults', () => {
  applyConfig({ prob: { proposal: 0.9 }, stall: { proposal: 5 }, quietDays: 3 });
  assert.equal(stageLookup('proposal').prob, 0.9);
  assert.equal(pipelineStats([deal({ amount: 1000 })], '2026-11').weighted, 900);
  assert.ok(dealRisk(deal({ stageSince: '2026-10-25T00:00:00Z', lastActivityAt: '2026-11-03T00:00:00Z' }), today).reasons.some((r) => /Stalled/.test(r)));
  assert.ok(dealRisk(deal({ lastActivityAt: '2026-10-30T00:00:00Z' }), today).reasons.some((r) => /No activity/.test(r)));
  applyConfig(undefined);
  assert.equal(stageLookup('proposal').prob, DEFAULT_CONFIG.prob.proposal);
  assert.equal(dealRisk(deal({ lastActivityAt: '2026-10-30T00:00:00Z' }), today).level, 'low');
});

import { findDuplicate, mergePlan } from './crmLogic.js';
test('duplicates: same email for contacts, same domain or name for companies', () => {
  const contacts = [{ id: 'a', name: 'Jane', email: 'Jane@Acme.com' }];
  assert.equal(findDuplicate('contact', { id: 'new', name: 'J', email: 'jane@acme.com' }, contacts)?.id, 'a');
  assert.equal(findDuplicate('contact', { id: 'a', name: 'Jane', email: 'jane@acme.com' }, contacts), undefined); // itself
  assert.equal(findDuplicate('contact', { id: 'n', name: 'Jane', email: '' }, contacts), undefined);
  const companies = [{ id: 'c', name: 'Acme', domain: 'acme.com' }];
  assert.equal(findDuplicate('company', { id: 'n', name: 'ACME Inc', domain: 'acme.com' }, companies)?.id, 'c');
  assert.equal(findDuplicate('company', { id: 'n', name: ' acme ', domain: '' }, companies)?.id, 'c');
  assert.equal(findDuplicate('company', { id: 'n', name: 'Other', domain: 'other.com' }, companies), undefined);
});

test('merging a duplicate company re-points contacts, deals and activities and keeps the filled fields', () => {
  const keep = { id: 'k', name: 'Acme', domain: '', industry: 'Software' };
  const drop = { id: 'x', name: 'Acme Inc', domain: 'acme.com', industry: 'Other', lists: ['Q4'] };
  const p = mergePlan('company', keep, drop, { contacts: [{ id: 'c1', companyId: 'x' }, { id: 'c2', companyId: 'z' }], deals: [{ id: 'd1', companyId: 'x' }], activities: [{ id: 'a1', companyId: 'x' }] });
  assert.equal(p.keep.domain, 'acme.com');
  assert.equal(p.keep.industry, 'Software');
  assert.equal(p.keep.name, 'Acme');
  assert.deepEqual(p.keep.lists, ['Q4']);
  assert.deepEqual(p.updates.slice(1).map((u) => [u.type, u.rec.id, u.rec.companyId]), [['contact', 'c1', 'k'], ['deal', 'd1', 'k'], ['activity', 'a1', 'k']]);
  assert.deepEqual(p.remove, { type: 'company', id: 'x' });
});

test('merging a duplicate contact re-points deal links without doubling', () => {
  const p = mergePlan('contact', { id: 'k', name: 'Jane' }, { id: 'x', name: 'J', email: 'j@a.com' }, { deals: [{ id: 'd1', contactIds: ['x', 'k'] }], activities: [{ id: 'a1', contactId: 'x' }] });
  assert.deepEqual(p.updates[1].rec.contactIds, ['k']);
  assert.equal(p.updates[2].rec.contactId, 'k');
  assert.equal(p.keep.email, 'j@a.com');
});

import { duplicateGroups } from './crmLogic.js';
test('duplicate groups link records through a shared domain or name, even via a third', () => {
  const list = [{ id: 'a', name: 'Acme' }, { id: 'b', name: 'Acme Inc', domain: 'acme.com' }, { id: 'c', name: 'Acme', domain: 'acme.com' }, { id: 'z', name: 'Other', domain: 'other.com' }];
  const g = duplicateGroups('company', list);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].map((r) => r.id).sort(), ['a', 'b', 'c']);
  assert.deepEqual(duplicateGroups('contact', [{ id: '1', email: 'x@a.com' }, { id: '2', email: 'X@a.com' }, { id: '3', email: '' }, { id: '4', email: '' }]).map((x) => x.length), [2]);
});
