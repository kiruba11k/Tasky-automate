import test from 'node:test';
import assert from 'node:assert/strict';
import { stageConversion, closeDateReport, closedByMonth, outcomeReport } from './reports.js';

const d = (id, stage, o = {}) => ({ id, name: id, stage, amount: 1000, ...o });
const stageAct = (dealId, fromStage, toStage) => ({ id: `${dealId}${toStage}`, type: 'stage', dealId, fromStage, toStage });

test('stage conversion counts deals that reached each stage and went on', () => {
  const deals = [d('a', 'won'), d('b', 'proposal'), d('c', 'lost'), d('e', 'qualified')];
  const acts = [stageAct('c', 'qualified', 'meeting')]; // c was lost after reaching a meeting
  const rows = stageConversion(deals, acts);
  assert.deepEqual(rows.map((r) => r.reached), [4, 3, 2, 1]);
  assert.deepEqual(rows.map((r) => r.advanced), [3, 2, 1, 1]);
  assert.equal(rows[0].rate, 75);
});

test('close date report groups open deals by month and weights them', () => {
  const rows = closeDateReport([d('a', 'proposal', { closeDate: '2026-11-20', nextAction: { title: 'x', due: 'y' } }), d('b', 'negotiation', { closeDate: '2026-11-02' }), d('c', 'qualified'), d('w', 'won', { closeDate: '2026-11-01' })]);
  assert.deepEqual(rows.map((r) => r.month), ['2026-11', 'none']);
  assert.equal(rows[0].count, 2);
  assert.equal(rows[0].weighted, 500 + 750);
});

test('closed deals by month', () => {
  const rows = closedByMonth([d('a', 'won', { closedAt: '2026-10-05T00:00:00Z' }), d('b', 'lost', { closedAt: '2026-10-09T00:00:00Z' }), d('c', 'won', { closedAt: '2026-11-01T00:00:00Z', amount: 5 })]);
  assert.deepEqual(rows, [{ month: '2026-10', won: 1, lost: 1, wonValue: 1000 }, { month: '2026-11', won: 1, lost: 0, wonValue: 5 }]);
});

test('outcome report shows how follow-ups ended', () => {
  const r = outcomeReport([{ outcome: 'connected' }, { outcome: 'no_response' }, { outcome: 'meeting_booked' }, { type: 'note' }]);
  assert.equal(r.total, 3);
  assert.equal(r.positiveRate, 67);
  assert.equal(r.counts.find((c) => c.id === 'no_response').count, 1);
});
