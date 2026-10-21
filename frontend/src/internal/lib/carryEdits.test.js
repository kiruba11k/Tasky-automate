import test from 'node:test';
import assert from 'node:assert/strict';
import { assignedDay, dayRowsWithAssigned, weekAssignedRows, dayCarryEdits } from './assigned.js';
import { assignedMinutesByProject } from './autoPlan.js';

const ME = 'me';
const TODAY = '2026-10-13';
const YDAY = '2026-10-12';
const OPTS = { projects: [], today: TODAY };
const old = { id: 'old1', assigneeId: ME, projectId: 'p1', typeId: 'l2', qty: 10, doneQty: 0, status: 'in_progress', date: YDAY, title: 'Leads batch', unit: 'messages', targetMinutes: 60 };
const rowId = (d, tasks = [old]) => assignedDay(tasks, ME, d, OPTS).rows[0].id;

test('editing a carried row changes only today: qty, estimate and description', () => {
  const rid = rowId(TODAY);
  const edits = { [rid]: { qty: 4, estMin: 25, desc: 'Half batch' } };
  const snapshot = JSON.stringify(old);
  const today = assignedDay([old], ME, TODAY, { ...OPTS, carryEdits: edits }).rows[0];
  assert.deepEqual([today.qty, today.estMin, today.titles, today.edited, today.carriedFrom], [4, 25, ['Half batch'], true, YDAY]);
  const yday = assignedDay([old], ME, YDAY, { ...OPTS, carryEdits: edits }).rows[0]; // same edits object, earlier day: ignored
  assert.deepEqual([yday.qty, yday.estMin, yday.titles], [10, 60, ['Leads batch']]);
  assert.equal(JSON.stringify(old), snapshot); // the task itself is untouched
  const plain = assignedDay([old], ME, TODAY, OPTS).rows[0];
  assert.deepEqual([plain.qty, plain.estMin], [10, 60]);
});

test('an edit of a row is read from the day record, and an edit for the wrong day does nothing', () => {
  const rid = rowId(TODAY);
  const daily = { [`${ME}|${TODAY}`]: { carryEdits: { [rid]: { qty: 3 } } } };
  assert.deepEqual(dayCarryEdits(daily, ME, TODAY), { [rid]: { qty: 3 } });
  assert.equal(dayRowsWithAssigned([old], daily, ME, TODAY, OPTS)[0].qty, 3);
  assert.equal(dayRowsWithAssigned([old], daily, ME, YDAY, OPTS)[0].qty, 10);
  assert.equal(weekAssignedRows([old], daily, ME, YDAY, { ...OPTS, today: TODAY })[0].qty, 10); // the week keeps the task on its own day
});

test('a hidden carried task is not a row, not counted and not planned; restoring brings it back', () => {
  const rid = rowId(TODAY);
  const hide = { [rid]: { hidden: true } };
  const res = assignedDay([old], ME, TODAY, { ...OPTS, carryEdits: hide });
  assert.equal(res.rows.length, 0);
  assert.deepEqual(res.hidden.map((h) => [h.id, h.qty, h.estMin]), [[rid, 10, 60]]);
  assert.deepEqual(assignedMinutesByProject([old], ME, TODAY, { ...OPTS, carryEdits: hide }), {});
  assert.deepEqual(assignedMinutesByProject([old], ME, TODAY, { ...OPTS, carryEdits: { [rid]: { estMin: 20 } } }), { p1: 20 }); // an edited estimate plans the edited minutes
  assert.deepEqual(assignedMinutesByProject([old], ME, TODAY, OPTS), { p1: 60 });
  assert.equal(assignedDay([old], ME, YDAY, { ...OPTS, carryEdits: hide }).rows.length, 1); // still on its own date
  const restored = assignedDay([old], ME, TODAY, { ...OPTS, carryEdits: {} });
  assert.equal(restored.rows.length, 1);
  assert.equal(restored.hidden.length, 0);
});

test('only the carried part of a row changes when a task of today shares the row', () => {
  const todays = { ...old, id: 'new1', date: TODAY, qty: 5, targetMinutes: 30, title: 'Fresh' };
  const rid = rowId(TODAY, [old, todays]);
  const r = assignedDay([old, todays], ME, TODAY, { ...OPTS, carryEdits: { [rid]: { qty: 2, estMin: 10 } } }).rows[0];
  assert.deepEqual([r.qty, r.estMin], [7, 40]); // 5 + edited 2, 30 + edited 10
  const gone = assignedDay([old, todays], ME, TODAY, { ...OPTS, carryEdits: { [rid]: { hidden: true } } }).rows[0];
  assert.deepEqual([gone.qty, gone.estMin, gone.titles], [5, 30, ['Fresh']]);
});
