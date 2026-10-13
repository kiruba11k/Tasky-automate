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
