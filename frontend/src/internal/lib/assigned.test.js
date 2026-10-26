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
