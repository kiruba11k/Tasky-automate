import test from 'node:test';
import assert from 'node:assert/strict';
import { matchedTargetWork, withDerivedTarget, loggedMetricExtras } from './entries.js';

const project = { id: 'p', customStandards: [{ id: 'w', name: 'Build workflow', unit: 'workflows', metric: 'workflows' }], metrics: [{ id: 'workflows', label: 'Workflows built' }] };
const day = (entries, asg) => ({ entries, asg });
const daily = {
  'u1|2026-10-27': day([
    { id: 'a', projectId: 'p', task: 'std:w', kind: 'number', qty: 3, doneQty: 2 },
    { id: 'b', projectId: 'p', task: '__custom', custom: 'Case study', kind: 'milestone', status: 'In progress' },
    { id: 'c', projectId: 'p', task: '__custom', custom: 'Launch note', kind: 'text', actualText: 'Draft sent' },
  ]),
  'u1|2026-10-28': day([{ id: 'd', projectId: 'p', task: 'std:w', kind: 'number', qty: 2, doneQty: 3 }, { id: 'e', projectId: 'p', task: '__custom', custom: 'Case study', kind: 'milestone', status: 'Completed' }]),
};

test('period targets are matched by name to the daily rows of the period', () => {
  const m = matchedTargetWork(project, [], daily, '2026-10-26', '2026-11-02');
  assert.equal(m.get('build workflow').done, 5);
  assert.equal(m.get('case study').status, 'Completed');
  assert.equal(m.get('launch note').text, 'Draft sent');
  assert.equal(matchedTargetWork(project, [], daily, '2026-10-26', '2026-10-28').get('case study').status, 'In progress');
});

test('a target row takes the daily work unless its owner typed a value', () => {
  const m = matchedTargetWork(project, [], daily, '2026-10-26', '2026-11-02');
  assert.equal(withDerivedTarget({ label: 'Build workflow', kind: 'number', targetNum: 8 }, m).actualNum, 5);
  assert.equal(withDerivedTarget({ label: 'Build workflow', kind: 'number', targetNum: 8, actualNum: 2 }, m).actualNum, 2);
  assert.equal(withDerivedTarget({ label: 'Case study', kind: 'milestone', status: 'Not started' }, m).status, 'Completed');
  assert.equal(withDerivedTarget({ label: 'Launch note', kind: 'text' }, m).actual, 'Draft sent');
  assert.equal(withDerivedTarget({ label: 'Other', kind: 'number' }, m).actualNum, undefined);
});

test('a done number typed on an assigned row counts toward the project number', () => {
  const d = { 'u1|2026-10-27': { entries: [], asg: { x: { projectId: 'p', task: 'std:w', doneQty: 4 } } } };
  assert.deepEqual(loggedMetricExtras(project, [], d, '2026-10-26', '2026-11-02'), { workflows: 4 });
});

import { weekRows, rowKey } from './entries.js';
import { weeklySnapshot } from './domain.js';

test('the week table takes typed estimated and taken time, and rows removed from the week leave it', () => {
  const row = { id: 'r', projectId: 'p', task: 'l2', kind: 'number', qty: 10, doneQty: 8, estMin: 60, actualMin: 50 };
  const d = { 'u1|2026-10-27': { entries: [row] } };
  const key = rowKey(row);
  const typed = weekRows('u1', '2026-10-26', d, [], { [key]: { estMin: 90, actualMin: 75 } })[0];
  assert.deepEqual([typed.estMin, typed.actualMin], [90, 75]);
  assert.equal(weekRows('u1', '2026-10-26', d, [], { [key]: { hidden: true } }).length, 0);
  const all = weekRows('u1', '2026-10-26', d, [], { [key]: { hidden: true } }, [], true);
  assert.deepEqual([all.length, all[0].hidden], [1, true]);
  assert.equal(weekRows('u1', '2026-10-26', d, [], { [key]: { hidden: false } }).length, 1);
  const snap = weeklySnapshot([], 'u1', '2026-10-26', { entries: [], overrides: { [key]: { hidden: true } } }, 'now', { daily: d, projects: [] });
  const r = Object.values(snap.byType)[0];
  assert.deepEqual([r?.target ?? 0, r?.actual ?? 0], [0, 0]);
});

import { personMetrics } from './domain.js';
import { todayKey, addDays } from './dates.js';

test('assigned work only counts once it is due: future tasks and today\'s open ones do not lower completion', () => {
  const today = todayKey(0);
  const t = (id, date, o = {}) => ({ id, assigneeId: 'u1', projectId: 'p', typeId: 'l2', qty: 10, targetMinutes: 30, date, status: 'todo', ...o });
  const tasks = [
    t('a', addDays(today, -2), { status: 'done', doneQty: 10, minutes: 30, submittedAt: `${addDays(today, -2)}T10:00:00Z` }),
    t('b', today), // today's, still being worked on
    t('c', addDays(today, 3)), // planned for later
  ];
  const m = personMetrics(tasks, {}, 'u1', addDays(today, -7), addDays(today, 10));
  assert.equal(m.assigned, 1);
  assert.equal(m.tasks, 1);
  const late = personMetrics([...tasks, t('d', addDays(today, -1))], {}, 'u1', addDays(today, -7), addDays(today, 10)); // yesterday's, not done: counts
  assert.equal(late.assigned, 2);
});

import { otherTimeRows, spreadPlanTime } from './weekTime.js';
test('time on the plan that no task row carries is listed so the week table adds up to the hours', () => {
  const rows = [{ projectId: 'a', actualMin: 60 }, { projectId: 'a', actualMin: 30 }, { projectId: 'b', actualMin: 120 }];
  const byProject = new Map([['a', { planned: 0, actual: 200, extra: 10 }], ['b', { planned: 0, actual: 120, extra: 0 }], ['c', { planned: 0, actual: 45, extra: 0 }]]);
  const extra = otherTimeRows(rows, byProject);
  assert.deepEqual(extra.map((r) => [r.projectId, r.actualMin]), [['a', 120], ['c', 45]]);
});

test('plan time on no task row is shared over the project\'s rows by estimate, so the rows keep their names', () => {
  const rows = [{ id: '1', projectId: 'a', actualMin: 60, estMin: 60 }, { id: '2', projectId: 'a', actualMin: 0, estMin: 180 }, { id: '3', projectId: 'b', actualMin: 30, estMin: 0 }];
  const byProject = new Map([['a', { planned: 0, actual: 300, extra: 0 }], ['b', { planned: 0, actual: 30, extra: 0 }], ['c', { planned: 0, actual: 50, extra: 0 }]]);
  const out = spreadPlanTime(rows, byProject);
  assert.deepEqual(out.filter((r) => r.projectId === 'a').map((r) => r.actualMin), [120, 180]); // 240 left: 60 and 180 by estimate
  assert.equal(out.find((r) => r.id === '3').actualMin, 30);
  assert.deepEqual(out.filter((r) => r.synthetic).map((r) => [r.projectId, r.actualMin]), [['c', 50]]);
});
