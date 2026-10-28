import test from 'node:test';
import assert from 'node:assert/strict';
import { planSubmissions, reviewerFor } from './autoSubmit.js';

const projects = [{ id: 'p', pmId: 'pm' }, { id: 'q', pmId: 'me' }];
const task = (id, o = {}) => ({ id, assigneeId: 'me', assignedById: 'boss', projectId: 'p', qty: 10, targetMinutes: 30, status: 'todo', ...o });

test('a done number on a row sends its open task for approval to the project manager', () => {
  const tasks = [task('a')];
  const rows = [{ typedDone: 8, actualMin: 25, taskIds: ['a'] }];
  assert.deepEqual(planSubmissions({ rows, tasks, projects, me: 'me' }), [{ taskId: 'a', doneQty: 8, minutes: 25, reviewerId: 'pm' }]);
});

test('the number and the time are shared over the row\'s tasks, extra to the last, sent tasks left alone', () => {
  const tasks = [task('a'), task('b', { qty: 20 }), task('c', { status: 'in_review' })];
  const rows = [{ typedDone: 25, actualMin: 90, taskIds: ['a', 'b', 'c'] }];
  const plan = planSubmissions({ rows, tasks, projects, me: 'me' });
  assert.deepEqual(plan.map((p) => [p.taskId, p.doneQty, p.minutes]), [['a', 10, 36], ['b', 15, 54]]);
});

test('nothing typed, nothing sent; the reviewer is never the person', () => {
  assert.deepEqual(planSubmissions({ rows: [{ taskIds: ['a'], actualMin: 30 }], tasks: [task('a')], projects, me: 'me' }), []);
  assert.equal(reviewerFor(task('a', { projectId: 'q' }), projects[1], 'me'), 'boss');
  assert.equal(reviewerFor(task('a', { assignedById: 'me' }), projects[1], 'me'), null);
});

test('what tasks already sent in account for is not sent again', () => {
  const tasks = [task('a', { status: 'done', doneQty: 10 }), task('b', { qty: 20 })];
  const rows = [{ typedDone: 30, actualMin: 60, taskIds: ['a', 'b'] }];
  assert.deepEqual(planSubmissions({ rows, tasks, projects, me: 'me' }).map((p) => [p.taskId, p.doneQty]), [['b', 20]]);
  assert.equal(planSubmissions({ rows, tasks, projects, me: 'me' })[0].minutes, 40); // 20 of the 30 done, so 40 of the row's 60 minutes
  assert.deepEqual(planSubmissions({ rows: [{ typedDone: 10, taskIds: ['a', 'b'] }], tasks, projects, me: 'me' }), []);
});
