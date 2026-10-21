import test from 'node:test';
import assert from 'node:assert/strict';
import { fillSources } from './fillSources.js';

const daily = {
  'p|2026-10-14': { plan: [{ id: 'a', start: '10:00', end: '12:00' }, { id: 'lunch', start: '13:00', end: '14:00' }], entries: [{ id: 'r1', projectId: 'x', task: 'l1', estMin: 30 }] },
  'p|2026-10-12': { plan: [], entries: [{ id: 'r2', projectId: 'y', task: 'l2', estMin: 20 }] },
  'p|2026-10-09': { plan: [{ id: 'b', start: '10:00', end: '11:30' }] },
  'q|2026-10-14': { plan: [{ id: 'c', start: '10:00', end: '11:00' }] },
};

test('plan sources are the earlier days with plan blocks, newest first', () => {
  const s = fillSources(daily, 'p', '2026-10-16');
  assert.deepEqual(s.map((x) => x.date), ['2026-10-14', '2026-10-09']);
  assert.equal(s[0].minutes, 120); // lunch is not counted
  assert.equal(s[1].count, 1);
});

test('row sources can be limited to one project, and never include the day itself or later days', () => {
  assert.deepEqual(fillSources(daily, 'p', '2026-10-16', { kind: 'rows', projectId: 'y' }).map((x) => x.date), ['2026-10-12']);
  assert.deepEqual(fillSources(daily, 'p', '2026-10-14', { kind: 'rows' }).map((x) => x.date), ['2026-10-12']);
  assert.deepEqual(fillSources(daily, 'p', '2026-10-08'), []);
});
