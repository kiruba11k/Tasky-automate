import test from 'node:test';
import assert from 'node:assert/strict';
import { completionPct, personStat, pickStar, pickStars, projectProgress, pickProject } from './spotlightPick.js';

test('completion comes from all counted work and is not shown when nothing was assigned', () => {
  assert.equal(completionPct({ tasks: 5, assigned: 10 }), 50);
  assert.equal(completionPct({ tasks: 12, assigned: 10 }), 100);
  assert.equal(completionPct({ tasks: 0, assigned: 0 }), null);
  assert.equal(personStat({ onTime: 100, tasks: 0, assigned: 0 }), '100% on time');
  assert.equal(personStat({ onTime: 88, tasks: 51, assigned: 100 }), '88% on time · 51% of assigned work done');
});

test('star needs enough timed work', () => {
  const rows = [
    { personId: 'a', onTime: 100, tasks: 1, assigned: 1, timed: 1 },
    { personId: 'b', onTime: 80, tasks: 8, assigned: 10, timed: 8 },
  ];
  assert.equal(pickStar(rows, 3).personId, 'b');
  assert.equal(pickStar([rows[0]], 3), undefined);
});

test('project of the month is picked by progress to targets, never by default', () => {
  const m = [{ id: 'x' }, { id: 'y' }];
  const zero = { id: 'z', status: 'active', metrics: m, month: {}, monthTarget: { x: 10 } };
  const half = { id: 'h', status: 'active', metrics: m, month: { x: 5, y: 0 }, monthTarget: { x: 10, y: 10 } };
  const most = { id: 'm', status: 'active', metrics: m, month: { x: 9 }, monthTarget: { x: 10 } };
  assert.equal(projectProgress(zero), null);
  assert.equal(projectProgress(half), 25);
  assert.equal(pickProject([zero, half, most], () => true).p.id, 'm');
  assert.equal(pickProject([zero], () => true), undefined);
});

test('equal scores go to more hours worked (big tasks vs many small ones), then to more tasks', () => {
  const big = { personId: 'a', onTime: 100, tasks: 4, assigned: 4, timed: 4, hours: 30 };
  const small = { personId: 'b', onTime: 100, tasks: 9, assigned: 9, timed: 9, hours: 20 };
  assert.equal(pickStar([big, small], 3).personId, 'a');
  assert.equal(pickStar([small, { ...small, personId: 'c', tasks: 12 }], 3).personId, 'c');
});

test('a full tie shares the title; when everyone or too many tie, no one stands out', () => {
  const r = (id, over = {}) => ({ personId: id, onTime: 90, tasks: 5, assigned: 5, timed: 5, hours: 10, ...over });
  assert.deepEqual(pickStars([r('a'), r('b'), r('c', { hours: 5 })], 3).rows.map((x) => x.personId), ['a', 'b']);
  assert.deepEqual(pickStars([r('a'), r('b')], 3).rows.length, 2);
  assert.equal(pickStars([r('a'), r('b'), r('c')], 3).team, true);
  assert.equal(pickStars([r('a'), r('b'), r('c'), r('d'), r('e', { hours: 1 })], 3).team, true);
  assert.equal(pickStars([r('a', { timed: 1 })], 3), undefined);
});
