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

import { eodRows, toTsv, EOD_HEADER } from './eodExport.js';

test('the end of day exports as the sheet format, without doubling work', () => {
  const projects = [{ id: P, name: 'Northwind SaaS - US' }];
  const tasks = [task({ typeId: 'l2', title: '10 2nd level messages', qty: 10, doneQty: 10, status: 'done', minutes: 45, unit: 'messages' }), task({ typeId: 'deck', title: 'QBR deck', qty: 1, status: 'in_progress', unit: 'docs', targetMinutes: 75 })];
  const daily = { [`${ME}|2026-10-13`]: { entries: [row({ task: 'l2', qty: 10, doneQty: 10 }), row({ task: 'l1', qty: 30, doneQty: 30, estMin: 60, actualMin: 50, desc: 'CFO list' }), row({ task: 'email', qty: 5 })] } };
  const rows = eodRows({ tasks, daily, projects, personId: ME, date: '2026-10-13' });
  assert.deepEqual(rows[0], ['2026-10-13', 'Northwind SaaS - US', '10 2nd level messages', '10 messages', '45m', 'Completed', 10]);
  assert.deepEqual(rows[1], ['2026-10-13', 'Northwind SaaS - US', 'QBR deck', '1 docs', '1h 15m', 'In Progress', 0]);
  assert.equal(rows.length, 4); // the l2 row duplicates the l2 task, so it is left out
  assert.deepEqual(rows[2].slice(2), ['1st level messages (CFO list)', '30 messages', '50m', 'Completed', 30]);
  assert.equal(rows[3][5], 'Pending');
  const tsv = toTsv(rows).split('\n');
  assert.equal(tsv[0], EOD_HEADER.join('\t'));
  assert.equal(tsv.length, 5); assert.equal(tsv[1].split('\t').length, 7);
});
