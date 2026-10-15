import test from 'node:test';
import assert from 'node:assert/strict';
import { targetVsActualRows, dailySnapshot, weeklySnapshot, dayHours, personMetrics, dayLoggedMinutes, timeBreakdown } from './domain.js';
import { loggedKpiExtras } from './entries.js';

const P = 'p1'; const ME = 'me';
const row = (o) => ({ id: 'e' + Math.random(), projectId: P, task: 'l2', desc: '', estMin: 0, ...o });
const task = (o) => ({ id: 't' + Math.random(), assigneeId: ME, projectId: P, typeId: 'l2', qty: 10, doneQty: 0, status: 'todo', date: '2026-10-13', title: 'x', unit: 'messages', targetMinutes: 30, ...o });

test('logged rows join the day rows, and assigned tasks for the same work are not added on top', () => {
  const daily = { [`${ME}|2026-10-13`]: { entries: [row({ qty: 20, doneQty: 15 })] } };
  const only = targetVsActualRows([], ME, '2026-10-13', '2026-10-13', { daily });
  assert.deepEqual(only.map((r) => [r.target, r.actual]), [[20, 15]]);
  const both = targetVsActualRows([task({ qty: 10, doneQty: 10, status: 'done' })], ME, '2026-10-13', '2026-10-13', { daily });
  assert.deepEqual(both.map((r) => [r.target, r.actual]), [[20, 15]]); // the larger of the two, not 30 / 25
  const taskBigger = targetVsActualRows([task({ qty: 40, doneQty: 30, status: 'done' })], ME, '2026-10-13', '2026-10-13', { daily });
  assert.deepEqual(taskBigger.map((r) => [r.target, r.actual]), [[40, 30]]);
});

test('the end-of-day snapshot carries the logged rows', () => {
  const rec = { entries: [row({ task: 'deck', qty: 2, doneQty: 2 })] };
  const snap = dailySnapshot([], ME, '2026-10-13', rec, 'now', { projects: [] });
  assert.equal(Object.values(snap.byType)[0].actual, 2);
});

test('weekly rows give the week its target, and achieved adds up from the days unless typed', () => {
  const daily = { [`${ME}|2026-10-12`]: { entries: [row({ qty: 10, doneQty: 8 })] }, [`${ME}|2026-10-13`]: { entries: [row({ qty: 10, doneQty: 7 })] } };
  const week = { entries: [row({ qty: 40 })] };
  const snap = weeklySnapshot([], ME, '2026-10-12', week, 'now', { daily, projects: [] });
  const r = Object.values(snap.byType)[0];
  assert.deepEqual([r.target, r.actual], [40, 15]);
  const typed = weeklySnapshot([], ME, '2026-10-12', { entries: [row({ qty: 40, doneQty: 30 })] }, 'now', { daily, projects: [] });
  assert.equal(Object.values(typed.byType)[0].actual, 30);
});

test('actual time typed in a project table is the day\'s actual for that project', () => {
  const rec = { plan: [{ id: 'b', start: '10:00', end: '13:00', projectId: P }], eodAt: '2026-10-13T18:00:00Z', entries: [row({ actualMin: 100 })] };
  assert.equal(dayHours(rec).actualMin, 100); // not the planned 180 the sent day would otherwise count
  assert.equal(dayHours({ ...rec, entries: [] }).actualMin, 180);
  assert.equal(dayHours({ plan: rec.plan, entries: [row({ actualMin: 50 })] }).actualMin, 50); // shows before the day is sent
});

test('hours logged: per day and project the larger of task time and table time', () => {
  const daily = { [`${ME}|2026-10-13`]: { entries: [row({ actualMin: 90 })] } };
  const tasks = [task({ status: 'done', doneQty: 10, minutes: 60 })];
  assert.equal(personMetrics(tasks, daily, ME, '2026-10-13', '2026-10-13').hours, 1.5);
  assert.equal(personMetrics([task({ status: 'done', doneQty: 10, minutes: 120 })], daily, ME, '2026-10-13', '2026-10-13').hours, 2);
  assert.equal(personMetrics([], daily, ME, '2026-10-13', '2026-10-13').hours, 1.5);
  assert.equal(dayLoggedMinutes(tasks, daily, ME, '2026-10-13'), 90);
});

test('project numbers count logged work beyond what submitted tasks already count', () => {
  const daily = { [`${ME}|2026-10-13`]: { entries: [row({ task: 'l1', doneQty: 30 }), row({ task: 'deck', doneQty: 1 }), row({ task: 'model', doneQty: 5 })] } };
  assert.deepEqual(loggedKpiExtras(P, [], daily, '2026-10-12', '2026-10-19'), { messages: 30, decks: 1 });
  const tasks = [task({ typeId: 'l1', status: 'done', doneQty: 20 })];
  assert.deepEqual(loggedKpiExtras(P, tasks, daily, '2026-10-12', '2026-10-19'), { messages: 10, decks: 1 });
  assert.deepEqual(loggedKpiExtras(P, [], daily, '2026-10-19', '2026-10-26'), {});
});

test('where the time goes includes table time, without double counting tasks', () => {
  const state = { projects: [{ id: P, name: 'Northwind' }], tasks: [task({ status: 'done', doneQty: 10, minutes: 60 })], daily: { [`${ME}|2026-10-13`]: { entries: [row({ actualMin: 90 })] } } };
  const t = timeBreakdown(state, { personId: ME, from: '2026-10-13', to: '2026-10-13' });
  assert.equal(t.totalMin, 90);
});

import { weekTargetFor, projectWeekStart } from './domain.js';
import { plannedWeekTargets } from './entries.js';

test('Tasks done counts work ticked off in the day tables, without doubling assigned tasks', () => {
  const daily = { [`${ME}|2026-10-13`]: { entries: [row({ task: 'l1', qty: 30, doneQty: 30, estMin: 60, actualMin: 50 }), row({ task: 'deck', qty: 1 }), row({ task: 'l2', qty: 5, doneQty: 5 })] } };
  const m = personMetrics([], daily, ME, '2026-10-13', '2026-10-13');
  assert.equal(m.tasks, 2); // l1 and l2 are done, the deck is only planned
  assert.equal(m.assigned, 3);
  assert.equal(m.onTime, 100); // l1 took 50 min against an estimate of 60
  const covered = personMetrics([task({ typeId: 'l1', status: 'done', doneQty: 30, minutes: 40, targetMinutes: 60 })], daily, ME, '2026-10-13', '2026-10-13');
  assert.equal(covered.tasks, 2); // the l1 task and the l2 row, not the l1 row again
});

test('a project week with no saved plan takes its targets from what the team planned', () => {
  const project = { id: P, startDate: '2026-10-07', weekPlans: {}, weekTarget: {}, metrics: [] };
  const weekly = {
    [`${ME}|2026-10-05`]: { entries: [row({ task: 'l1', qty: 100 }), row({ task: 'deck', qty: 2 })] },
    'other|2026-10-05': { entries: [row({ task: 'l2', qty: 50 })] },
    [`${ME}|2026-10-12`]: { entries: [row({ task: 'l1', qty: 999 })] }, // the next project week
  };
  const start = projectWeekStart(project, '2026-10-08');
  assert.equal(start, '2026-10-07');
  assert.deepEqual(plannedWeekTargets(project, weekly, start), { messages: 150, decks: 2, l2: 50 });
  assert.deepEqual(weekTargetFor(project, '2026-10-08', weekly), { messages: 150, decks: 2, l2: 50 });
  assert.deepEqual(weekTargetFor({ ...project, weekPlans: { '2026-10-07': { messages: 10 } } }, '2026-10-08', weekly), { messages: 10 }); // a saved plan wins
  assert.equal(weekTargetFor(project, '2026-10-08'), project.weekTarget);
});

import { assignedDay, dayRowsWithAssigned, weekAssignedRows } from './assigned.js';
import { weekRows } from './entries.js';

const OPTS = { projects: [], today: '2026-10-13' };
const pair = (rows) => rows.map((r) => [r.qty, r.doneQty]);

test('an assigned task shows as a read-only row of its project, whoever assigned it', () => {
  const t = task({ typeId: 'prospect', qty: 40, targetMinutes: 60, assignedById: 'pm', priority: true });
  const { rows } = assignedDay([t], ME, '2026-10-13', OPTS);
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].assigned, rows[0].projectId, rows[0].task, rows[0].qty, rows[0].doneQty, rows[0].estMin], [true, P, 'prospect', 40, 0, 60]);
  assert.deepEqual([rows[0].assignedBy, rows[0].priority], [['pm'], true]);
  assert.equal(assignedDay([{ ...t, assigneeId: 'other' }], ME, '2026-10-13', OPTS).rows.length, 0); // someone else's task
  assert.equal(assignedDay([{ ...t, assignedById: ME }], ME, '2026-10-13', OPTS).rows.length, 1); // self-assigned
  const done = assignedDay([{ ...t, status: 'in_review', doneQty: 30, minutes: 50 }], ME, '2026-10-13', OPTS).rows[0];
  assert.deepEqual([done.doneQty, done.actualMin], [30, 50]);
});

test('a logged row for the same work covers the assignment: the larger is used, never the sum', () => {
  const t = task({ qty: 40, doneQty: 30, status: 'done', targetMinutes: 60 });
  const logged = (o) => ({ [`${ME}|2026-10-13`]: { entries: [row({ id: 'r1', qty: 25, doneQty: 10, estMin: 30, ...o })] } });
  const daily = logged();
  const { rows, covers } = assignedDay([t], ME, '2026-10-13', { ...OPTS, logged: daily[`${ME}|2026-10-13`].entries });
  assert.deepEqual(pair(rows), [[15, 20]]); // only the rest: 25 + 15 = 40, 10 + 20 = 30
  const all = dayRowsWithAssigned([t], daily, ME, '2026-10-13', OPTS);
  assert.deepEqual([all.reduce((s, r) => s + r.qty, 0), all.reduce((s, r) => s + r.doneQty, 0), all.reduce((s, r) => s + r.estMin, 0)], [40, 30, 60]);
  assert.equal(covers.size, 0);
  const small = assignedDay([task({ qty: 10, doneQty: 0 })], ME, '2026-10-13', { ...OPTS, logged: logged({ qty: 20, estMin: 60 })[`${ME}|2026-10-13`].entries });
  assert.equal(small.rows.length, 0); // fully covered
  assert.equal(small.covers.get('r1').qty, 0);
  const sums = dayRowsWithAssigned([t], daily, ME, '2026-10-13', OPTS);
  const report = targetVsActualRows([t], ME, '2026-10-13', '2026-10-13', { daily });
  assert.deepEqual([sums.reduce((s, r) => s + r.qty, 0), sums.reduce((s, r) => s + r.doneQty, 0)], [report[0].target, report[0].actual]); // agrees with the reports
});

test('time on submitted tasks and typed time do not add up in the hours', () => {
  const t = task({ status: 'done', doneQty: 10, minutes: 60 });
  const day = '2026-10-13';
  const withTyped = { [`${ME}|${day}`]: { entries: [row({ actualMin: 90 })] } };
  const sumMin = (rows) => rows.reduce((s, r) => s + (r.actualMin ?? 0), 0);
  assert.equal(sumMin(dayRowsWithAssigned([t], withTyped, ME, day, OPTS)), 90);
  assert.equal(sumMin(dayRowsWithAssigned([t], {}, ME, day, OPTS)), 60);
  assert.equal(sumMin(dayRowsWithAssigned([task({ status: 'done', doneQty: 10, minutes: 120 })], withTyped, ME, day, OPTS)), 120);
  assert.equal(dayHours({ entries: dayRowsWithAssigned([t], {}, ME, day, OPTS) }).actualMin, dayLoggedMinutes([t], {}, ME, day));
});

test('unfinished tasks of earlier days are carried over to today only', () => {
  const old = task({ date: '2026-10-12', status: 'in_progress', qty: 8 });
  const finished = task({ date: '2026-10-12', status: 'done', doneQty: 8, qty: 8 });
  const today = assignedDay([old, finished], ME, '2026-10-13', OPTS).rows;
  assert.deepEqual(today.map((r) => [r.qty, r.carriedFrom]), [[8, '2026-10-12']]);
  assert.equal(assignedDay([old], ME, '2026-10-12', OPTS).rows[0].carriedFrom, undefined); // on its own day it is just assigned
  assert.equal(assignedDay([old], ME, '2026-10-14', { ...OPTS, today: '2026-10-13' }).rows.length, 0); // not carried to a later day
  assert.equal(assignedDay([old], ME, '2026-10-13', { ...OPTS, carry: false }).rows.length, 0);
});

test('the weekly rows add the days\' assigned tasks up once, without the carried-over copy', () => {
  const mon = '2026-10-12';
  const tasks = [task({ date: '2026-10-12', qty: 10, doneQty: 10, status: 'done' }), task({ date: '2026-10-14', qty: 20, doneQty: 5, status: 'in_review' }), task({ date: '2026-10-12', typeId: 'deck', qty: 1, status: 'todo' })];
  const daily = { [`${ME}|2026-10-13`]: { entries: [row({ qty: 5, doneQty: 5 })] } };
  const assigned = weekAssignedRows(tasks, daily, ME, mon, OPTS);
  const rows = weekRows(ME, mon, daily, [], {}, assigned);
  const l2 = rows.find((r) => r.task === 'l2');
  assert.deepEqual([l2.qty, l2.doneQty, l2.assigned], [35, 20, true]); // 10 + 5 logged + 20
  assert.equal(rows.find((r) => r.task === 'deck').qty, 1);
  const report = targetVsActualRows(tasks, ME, mon, '2026-10-18', { daily });
  assert.equal(report.find((r) => r.key === 'l2').target, l2.qty);
  assert.equal(weekAssignedRows(tasks, daily, ME, '2026-10-19', OPTS).length, 0); // another week
});
