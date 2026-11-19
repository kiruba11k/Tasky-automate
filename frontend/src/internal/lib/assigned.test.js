import test from 'node:test';
import assert from 'node:assert/strict';
import { assignedDay, dayRowsWithAssigned } from './assigned.js';

const ME = 'u1';
const D = '2026-10-13';
const task = (o) => ({ id: 't1', assigneeId: ME, projectId: 'p', typeId: 'l2', qty: 10, doneQty: 0, status: 'todo', date: D, title: 'x', unit: 'messages', targetMinutes: 45, ...o });

test('time taken starts at the estimate once the day is sent, and typed time wins', () => {
  const opts = { projects: [], today: D };
  assert.equal(assignedDay([task()], ME, D, opts).rows[0].actualMin, undefined); // while working, the estimate is only a hint
  const sent = assignedDay([task()], ME, D, { ...opts, defaultTaken: true }).rows[0];
  assert.deepEqual([sent.actualMin, sent.defaultTime], [45, true]);
  const typed = assignedDay([task()], ME, D, { ...opts, defaultTaken: true, asg: { [`asg|${ME}|${D}|p|l2`]: { projectId: 'p', actualMin: 20 } } }).rows[0];
  assert.deepEqual([typed.actualMin, typed.defaultTime], [20, false]);
});

test('a sent day record turns the default on for its rows', () => {
  const daily = { [`${ME}|${D}`]: { eodAt: '2026-10-13T17:00:00Z' } };
  assert.equal(dayRowsWithAssigned([task()], daily, ME, D, { projects: [], today: D })[0].actualMin, 45);
  assert.equal(dayRowsWithAssigned([task()], {}, ME, D, { projects: [], today: D })[0].actualMin, undefined);
});

test('a done number typed on an assigned row shows, and the approved number wins when larger', () => {
  const opts = { projects: [], today: D, asg: { [`asg|${ME}|${D}|p|l2`]: { projectId: 'p', doneQty: 6 } } };
  const row = assignedDay([task()], ME, D, opts).rows[0];
  assert.deepEqual([row.doneQty, row.typedDone, row.approved], [6, 6, false]);
  const done = task({ status: 'done', doneQty: 9, minutes: 30, date: D });
  assert.equal(assignedDay([done], ME, D, { ...opts, today: D }).rows[0].doneQty, 9);
});

test('a task assigned earlier and sent in today shows as sent in today, not as carried over', () => {
  const sent = task({ date: '2026-10-12', status: 'in_review', doneQty: 10, minutes: 30, submittedAt: `${D}T09:00:00.000Z` });
  const row = assignedDay([sent], ME, D, { projects: [], today: D }).rows[0];
  assert.deepEqual([row.sentFrom, row.carriedFrom, row.actualMin], ['2026-10-12', undefined, 30]);
  assert.equal(assignedDay([task({ date: '2026-10-12', status: 'todo' })], ME, D, { projects: [], today: D }).rows.length, 0);
});

test('a row removed from the day (even one that is not carried over) leaves the table and can be restored', () => {
  const t = task();
  const id = assignedDay([t], ME, D, { projects: [], today: D }).rows[0].id;
  const hidden = assignedDay([t], ME, D, { projects: [], today: D, carryEdits: { [id]: { hidden: true } } });
  assert.equal(hidden.rows.length, 0);
  assert.deepEqual(hidden.hidden.map((h) => [h.id, h.qty]), [[id, 10]]);
  assert.equal(assignedDay([t], ME, D, { projects: [], today: D, carryEdits: {} }).rows.length, 1);
});

test('a time typed on an assigned row stays as typed, whatever time the submitted tasks carry', () => {
  const sent = task({ status: 'in_review', doneQty: 10, minutes: 204, submittedAt: `${D}T09:00:00.000Z` });
  const rowId = `asg|${ME}|${D}|p|l2`;
  const open = assignedDay([sent], ME, D, { projects: [], today: D }).rows[0];
  assert.equal(open.actualMin, 204); // nothing typed: the tasks' time shows
  const typed = assignedDay([sent], ME, D, { projects: [], today: D, asg: { [rowId]: { projectId: 'p', actualMin: 60 } } }).rows[0];
  assert.deepEqual([typed.actualMin, typed.typedMin], [60, 60]);
});

test('a task given as text is a row with a text target that is done or not, never a quantity', () => {
  const text = task({ typeId: 'custom', customName: 'Prepare the GTM goal with Komala', textTask: true, qty: 1, unit: 'task', title: 'Prepare the GTM goal with Komala' });
  const opts = { projects: [], today: D };
  const open = assignedDay([text], ME, D, opts).rows[0];
  assert.deepEqual([open.kind, open.targetText, open.status, open.doneQty], ['milestone', 'Prepare the GTM goal with Komala', 'Not started', 0]);
  // the person marks it done: the row reads Completed and counts as 1 of 1
  const asg = { [`asg|${ME}|${D}|${open.id.split('|').slice(3).join('|')}`]: { projectId: 'p', doneQty: 1 } };
  const marked = assignedDay([text], ME, D, { ...opts, asg }).rows[0];
  assert.deepEqual([marked.status, marked.typedDone, marked.doneQty], ['Completed', 1, 1]);
  // two different texts stay two rows; a text task and a quantity task never merge
  const other = task({ id: 't2', typeId: 'custom', customName: 'Discuss the pipeline', textTask: true, qty: 1, unit: 'task', title: 'Discuss the pipeline' });
  const counted = task({ id: 't3', typeId: 'custom', customName: 'Discuss the pipeline', qty: 5, unit: 'items', title: '5 Discuss the pipeline' });
  assert.equal(assignedDay([text, other], ME, D, opts).rows.length, 2);
  assert.deepEqual(assignedDay([other, counted], ME, D, opts).rows.map((r) => r.kind).sort(), ['milestone', 'number']);
});
