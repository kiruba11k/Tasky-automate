import test from 'node:test';
import assert from 'node:assert/strict';
import { orderItems, moveKey } from './weekTargetOrder.js';

const it = (key, projectName, range = 'w1') => ({ key, projectName, range });

test('rows of one project sit together, in the order the projects first appear', () => {
  const items = [it('a', 'Website'), it('b', 'Meetings'), it('c', 'Website'), it('d', 'Website'), it('e', 'Meetings')];
  assert.deepEqual(orderItems(items).map((x) => x.key), ['a', 'c', 'd', 'b', 'e']);
});

test('a saved order wins, new rows follow it, and date ranges stay together', () => {
  const items = [it('a', 'Website'), it('b', 'Meetings'), it('c', 'Website'), it('n', 'Website')];
  assert.deepEqual(orderItems(items, ['c', 'b', 'a']).map((x) => x.key), ['c', 'b', 'a', 'n']);
  const ranged = [it('a', 'P', 'w2'), it('b', 'P', 'w1'), it('c', 'P', 'w2')];
  assert.deepEqual(orderItems(ranged, ['a', 'b', 'c']).map((x) => x.key), ['a', 'c', 'b']);
});

test('moving a row up or down swaps it with its neighbour and stops at the ends', () => {
  assert.deepEqual(moveKey(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
  assert.deepEqual(moveKey(['a', 'b', 'c'], 'b', 1), ['a', 'c', 'b']);
  assert.deepEqual(moveKey(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c']);
  assert.deepEqual(moveKey(['a', 'b', 'c'], 'c', 1), ['a', 'b', 'c']);
});
