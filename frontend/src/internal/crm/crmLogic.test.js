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
