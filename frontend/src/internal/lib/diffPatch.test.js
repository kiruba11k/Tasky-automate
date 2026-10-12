import test from 'node:test';
import assert from 'node:assert/strict';
import { diffPatch } from './diffPatch.js';

test('equal documents give no patch', () => {
  assert.equal(diffPatch({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } }), undefined);
});

test('only changed fields are sent, nested objects merge, arrays are replaced whole', () => {
  assert.deepEqual(diffPatch({ a: 1, week: { x: 1, y: 2 }, list: [1] }, { a: 1, week: { x: 1, y: 5 }, list: [1, 2] }), { week: { y: 5 }, list: [1, 2] });
});

test('removed keys become null and new documents are sent whole', () => {
  assert.deepEqual(diffPatch({ a: 1, b: 2 }, { a: 1 }), { b: null });
  assert.deepEqual(diffPatch({}, { id: 'x', n: { k: 1 } }), { id: 'x', n: { k: 1 } });
});
