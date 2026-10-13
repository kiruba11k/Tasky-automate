import test from 'node:test';
import assert from 'node:assert/strict';
import { wallClock, minutesLeft, dueAlerts } from '../src/deadlines.js';

const at = (iso) => Date.parse(iso); // instants; India time is UTC+5:30
const task = (over = {}) => ({ id: 't1', title: 'Write report', status: 'todo', date: '2026-10-13', assigneeId: 'u1', assignedById: 'u2', ...over });

test('wall clock follows the time zone', () => {
  assert.deepEqual(wallClock(at('2026-10-13T12:30:00Z'), 'Asia/Kolkata'), { date: '2026-10-13', minutes: 18 * 60 });
  assert.equal(wallClock(at('2026-10-13T19:00:00Z'), 'Asia/Kolkata').date, '2026-10-14');
});

test('minutes left counts to the end of the working day', () => {
  assert.equal(minutesLeft(task(), { date: '2026-10-13', minutes: 18 * 60 }), 60);
  assert.equal(minutesLeft(task(), { date: '2026-10-14', minutes: 9 * 60 }), -14 * 60);
});

test('alerts: an hour before, 15 minutes before, overdue (and the assigner is told), then once a day', () => {
  const sent = {};
  const run = (iso, tasks = [task()]) => { const a = dueAlerts({ tasks, nowMs: at(iso), sent, nameOf: () => 'Udhaya' }); a.forEach((x) => { sent[`${x.taskId}|${x.level}`] = 1; }); return a; };
  assert.equal(run('2026-10-13T06:00:00Z').length, 0); // 11:30, plenty of time
  assert.equal(run('2026-10-13T12:35:00Z')[0].level, 'h1'); // 18:05
  assert.equal(run('2026-10-13T12:36:00Z').length, 0); // not again
  assert.equal(run('2026-10-13T13:20:00Z')[0].level, 'm15'); // 18:50
  const over = run('2026-10-13T13:31:00Z'); // 19:01
  assert.equal(over[0].level, 'over');
  assert.equal(over[0].alsoTell.to, 'u2');
  assert.equal(run('2026-10-14T05:00:00Z', [task()]).length, 0); // 10:30 next morning, but only after a day late: left=-930 -> still 'over' window
  assert.equal(run('2026-10-14T20:00:00Z').length, 0); // 01:30, too early in the day
  assert.match(run('2026-10-15T05:00:00Z')[0].level, /^late-2026-10-15$/); // 10:30, a day and a half late
});

test('done, deleted-less and unassigned tasks never alert', () => {
  assert.equal(dueAlerts({ tasks: [task({ status: 'done' }), task({ status: 'in_review' }), task({ assigneeId: undefined })], nowMs: at('2026-10-13T12:40:00Z') }).length, 0);
});
