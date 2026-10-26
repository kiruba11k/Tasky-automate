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
