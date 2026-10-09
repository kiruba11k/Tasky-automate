import test from 'node:test';
import assert from 'node:assert/strict';
import { spreadDays } from './spread.js';

const week = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];
const row = (key, extra = {}) => ({ key, priority: 'Medium', estimated_hours: '', assign: { ann: { days: null } }, ...extra });

test('8 targets for one person spread over the five days (2,2,2,1,1)', () => {
  const rows = Array.from({ length: 8 }, (_, i) => row(`t${i}`));
  const out = spreadDays(rows, week);
  const count = Object.fromEntries(week.map((d) => [d, 0]));
  for (const k of Object.keys(out)) for (const d of out[k].ann) count[d] += 1;
  assert.deepEqual(Object.values(count).sort(), [1, 1, 2, 2, 2]);
  assert.ok(Object.values(out).every((o) => o.ann.length === 1));
});

test('long tasks take several days, short ones one', () => {
  const out = spreadDays([row('big', { estimated_hours: '12' }), row('small', { estimated_hours: '1' })], week);
  assert.equal(out.big.ann.length, 3);
  assert.equal(out.small.ann.length, 1);
});

test('hand-picked days are kept out of the way and left alone', () => {
  const rows = [row('fixed', { assign: { ann: { days: [week[0]] } }, estimated_hours: '6' }), row('auto')];
  const out = spreadDays(rows, week);
  assert.equal(out.fixed, undefined);
  assert.notEqual(out.auto.ann[0], week[0]);
});

test('each person is balanced independently', () => {
  const out = spreadDays([row('a', { assign: { ann: { days: null }, bo: { days: null } } }), row('b', { assign: { ann: { days: null } } })], week);
  assert.equal(out.a.ann.length, 1);
  assert.equal(out.a.bo.length, 1);
  assert.notEqual(out.a.ann[0], out.b.ann[0]);
});
