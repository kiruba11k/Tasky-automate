import test from 'node:test';
import assert from 'node:assert/strict';
import { taskTransitionProblem } from '../src/tracker.js';

const task = (status, extra = {}) => ({ status, reviewerId: 'pm', ...extra });

test('normal steps are allowed', () => {
  assert.equal(taskTransitionProblem(task('todo'), task('in_progress'), 'u'), null);
  assert.equal(taskTransitionProblem(task('in_progress'), task('in_review'), 'u'), null);
  assert.equal(taskTransitionProblem(task('changes'), task('in_review'), 'u'), null); // resubmit
  assert.equal(taskTransitionProblem(task('in_review'), task('done'), 'pm'), null);
  assert.equal(taskTransitionProblem(task('in_review'), task('changes'), 'pm'), null);
  assert.equal(taskTransitionProblem(task('in_review'), task('in_review', { reviewerId: 'other' }), 'pm'), null); // forwarded
});

test('a stale approval cannot overwrite a send-back, and a finished task stays finished', () => {
  assert.match(taskTransitionProblem(task('changes'), task('done'), 'pm'), /no longer changes/);
  assert.match(taskTransitionProblem(task('done'), task('changes'), 'pm'), /already approved/);
  assert.match(taskTransitionProblem(task('done'), task('in_progress'), 'u'), /already approved/);
});

test('only the reviewer approves or sends back', () => {
  assert.match(taskTransitionProblem(task('in_review'), task('done'), 'someone'), /Only the task's reviewer/);
  assert.match(taskTransitionProblem(task('in_review'), task('changes'), 'someone'), /Only the task's reviewer/);
});

test('a change that keeps the status, or a brand-new task, is not judged here', () => {
  assert.equal(taskTransitionProblem(task('todo'), task('todo'), 'u'), null);
  assert.equal(taskTransitionProblem(undefined, task('todo'), 'u'), null);
});
