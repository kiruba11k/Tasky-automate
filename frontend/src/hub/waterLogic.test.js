import test from 'node:test';
import assert from 'node:assert/strict';
import { addGlass, countGlasses, undoGlass, withLocalCount, MAX_GLASSES } from './waterLogic.js';

const D = '2026-10-13';

test('glasses are counted per day and undo removes the latest one', () => {
  let w = {};
  w = addGlass(w, D, 'a1'); w = addGlass(w, D, 'a2'); w = addGlass(w, '2026-10-12', 'y1');
  assert.equal(countGlasses(w, D), 2);
  assert.equal(countGlasses(w, '2026-10-12'), 1);
  w = undoGlass(w, D);
  assert.deepEqual(Object.keys(w[D]), ['a1']);
  assert.equal(countGlasses(undoGlass({}, D), D), 0);
});

test('two devices adding a glass at the same time both count', () => {
  const phone = addGlass({ [D]: { a1: true } }, D, 'p1');
  const laptop = addGlass({ [D]: { a1: true } }, D, 'l1');
  const merged = { [D]: { ...phone[D], ...laptop[D] } }; // what the server's per-entry merge produces
  assert.equal(countGlasses(merged, D), 3);
});

test('never more than the daily maximum, and two-week-old days are dropped', () => {
  let w = {};
  for (let i = 0; i < 30; i += 1) w = addGlass(w, D, `g${i}`);
  assert.equal(countGlasses(w, D), MAX_GLASSES);
  const old = addGlass({ '2026-09-01': { x: true } }, D, 'n1');
  assert.equal(old['2026-09-01'], undefined);
});

test('a count kept in one browser is brought in once, and only if it is more than what is saved', () => {
  let w = withLocalCount({}, D, 3);
  assert.equal(countGlasses(w, D), 3);
  assert.deepEqual(withLocalCount(w, D, 3), w);
  w = withLocalCount({ [D]: { t1: true } }, D, 3);
  assert.equal(countGlasses(w, D), 3);
  assert.equal(countGlasses(withLocalCount({ [D]: { a: true, b: true, c: true, d: true } }, D, 2), D), 4);
});
