import test from 'node:test';
import assert from 'node:assert/strict';
import { weekRows, isWeekTarget } from './entries.js';

const monday = '2026-11-09';
const ms = (id, text, min, extra = {}) => ({ id, projectId: 'gtm', task: 'learn', kind: 'milestone', targetText: text, status: 'Completed', estMin: min, actualMin: min, ...extra });

test('by task shows the same work as by day: different things done under one task are separate rows', () => {
  const d = {
    'u1|2026-11-11': { entries: [ms('a', 'Research and watch videos of module 1', 420)] },
    'u1|2026-11-12': { entries: [ms('b', 'Compare each service of clay', 420)] },
  };
  const rows = weekRows('u1', monday, d, []);
  assert.deepEqual(rows.map((r) => [r.targetText, r.time]), [['Research and watch videos of module 1', 420], ['Compare each service of clay', 420]]);
});

test('the same thing done on two days still adds up into one row', () => {
  const d = {
    'u1|2026-11-09': { entries: [ms('a', 'Daily catchup', 30)] },
    'u1|2026-11-10': { entries: [ms('b', ' daily catchup ', 30)] },
  };
  const rows = weekRows('u1', monday, d, []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].time, 60);
});

test('weekly targets (with a time, or marked) are planned work and stay out of the Weekly update rows and hours', () => {
  const d = { 'u1|2026-11-10': { entries: [ms('a', 'Fix bug', 180)] } };
  const targets = [
    ms('t1', 'Understand the GTM workflow', 480, { status: undefined }), // an older target row: it carries a time
    { id: 't2', projectId: 'gtm', task: 'learn', kind: 'milestone', targetText: 'Marked target', target: true, estMin: 0 },
  ];
  const added = { id: 'w', projectId: 'gtm', task: 'learn', kind: 'milestone', targetText: 'Added to the week', status: 'Completed', estMin: 0 }; // done work added to the week: no time of its own
  const rows = weekRows('u1', monday, d, [...targets, added]);
  assert.deepEqual(rows.map((r) => r.targetText), ['Fix bug', 'Added to the week']);
  assert.equal(rows.reduce((t, r) => t + r.time, 0), 180);
  assert.deepEqual([isWeekTarget(targets[0]), isWeekTarget(targets[1]), isWeekTarget(added)], [true, true, false]);
});
