import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFilters, sortRows, toCsv, loadViews, saveViews, withView } from './tableLogic.js';

const rows = [
  { id: 1, name: 'Acme', ownerId: 'a', amount: 100, stage: 'proposal', closeDate: '2026-11-10' },
  { id: 2, name: 'Beta', ownerId: 'b', amount: 5000, stage: 'meeting', closeDate: '2026-12-01' },
  { id: 3, name: 'Gamma, Inc', ownerId: 'a', amount: undefined, stage: 'proposal', closeDate: undefined },
];
const filters = [
  { key: 'stage', kind: 'select', get: (r) => r.stage },
  { key: 'amount', kind: 'number', get: (r) => r.amount },
  { key: 'close', kind: 'date', get: (r) => r.closeDate },
];
const text = (r) => r.name;
const ids = (list) => list.map((r) => r.id);

test('filters combine: owner, search, select, number range, date range', () => {
  assert.deepEqual(ids(applyFilters(rows, { owner: 'a' }, filters, text)), [1, 3]);
  assert.deepEqual(ids(applyFilters(rows, { q: 'bet' }, filters, text)), [2]);
  assert.deepEqual(ids(applyFilters(rows, { active: { stage: 'proposal' } }, filters, text)), [1, 3]);
  assert.deepEqual(ids(applyFilters(rows, { active: { amount: { min: '1000', max: '' } } }, filters, text)), [2]);
  assert.deepEqual(ids(applyFilters(rows, { active: { close: { from: '2026-11-15', to: '' } } }, filters, text)), [2]);
  assert.deepEqual(ids(applyFilters(rows, { active: { amount: { min: '', max: '' } } }, filters, text)), [1, 2, 3]);
});

test('sorting keeps empty values last in both directions, numbers numerically', () => {
  const col = { get: (r) => r.amount };
  assert.deepEqual(ids(sortRows(rows, col, 1)), [1, 2, 3]);
  assert.deepEqual(ids(sortRows(rows, col, -1)), [2, 1, 3]);
});

test('csv quotes commas and quotes', () => {
  const csv = toCsv(rows, [{ label: 'Name', get: (r) => r.name }, { label: 'Amount', get: (r) => r.amount }]);
  assert.equal(csv.split('\n')[3], '"Gamma, Inc",');
});

test('saved views round-trip and replace by name', () => {
  const mem = { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; } };
  assert.deepEqual(loadViews('deal', mem), []);
  saveViews('deal', withView(withView([], 'Big', { q: 'a' }), 'Big', { q: 'b' }), mem);
  assert.deepEqual(loadViews('deal', mem), [{ name: 'Big', state: { q: 'b' } }]);
});
