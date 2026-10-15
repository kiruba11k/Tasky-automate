import test from 'node:test';
import assert from 'node:assert/strict';
import { isMyProject, mineFirst } from './mine.js';

test('my projects come first, owned ones before the ones I am only on, order otherwise kept', () => {
  const ps = [
    { id: 'a', pmId: 'x', teamIds: ['y'] },
    { id: 'b', pmId: 'x', teamIds: ['me'] },
    { id: 'c', pmId: 'me', teamIds: [] },
    { id: 'd', pmId: 'x', admins: ['me'], teamIds: [] },
    { id: 'e', pmId: 'z', teamIds: [] },
  ];
  assert.deepEqual(mineFirst(ps, 'me').map((p) => p.id), ['c', 'b', 'd', 'a', 'e']);
  assert.equal(isMyProject(ps[0], 'me'), false);
  assert.equal(isMyProject(ps[3], 'me'), true);
});
