import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBatch, settleBatch, docId } from './pendingSync.js';

const id = docId('profile', 'u1');
const docs = (data) => new Map([[id, { kind: 'profile', key: 'u1', data }]]);

test('a second edit made while the first is being saved is not lost', () => {
  const pending = new Set([id]);
  const synced = new Map([[id, { name: 'A' }]]);
  const batch = buildBatch({ pending, synced, current: docs({ name: 'A', theme: 'dark' }) });
  assert.deepEqual(batch.patches[0].patch, { theme: 'dark' });
  // ... the request is on its way and the person edits again:
  const now = docs({ name: 'A', theme: 'dark', lunch: { start: '13:00', end: '14:00' } });
  const rejected = settleBatch({ batch, results: [{ kind: 'profile', key: 'u1', ok: true }], pending, synced, current: now });
  assert.equal(rejected.length, 0);
  assert.ok(pending.has(id), 'still pending, so a refresh will not overwrite it and the next save sends it');
  const second = buildBatch({ pending, synced, current: now });
  assert.deepEqual(second.patches[0].patch, { lunch: { start: '13:00', end: '14:00' } });
  settleBatch({ batch: second, results: [{ kind: 'profile', key: 'u1', ok: true }], pending, synced, current: now });
  assert.equal(pending.size, 0);
});

test('an unchanged document leaves pending once saved; refused ones are reported and stay for the caller', () => {
  const pending = new Set([id]);
  const synced = new Map();
  const cur = docs({ a: 1 });
  const batch = buildBatch({ pending, synced, current: cur });
  assert.equal(settleBatch({ batch, results: [{ kind: 'profile', key: 'u1', ok: true }], pending, synced, current: cur }).length, 0);
  assert.equal(pending.size, 0);
  assert.deepEqual(synced.get(id), { a: 1 });
  pending.add(id);
  synced.set(id, { a: 1 });
  const b2 = buildBatch({ pending, synced, current: docs({ a: 2 }) });
  const rej = settleBatch({ batch: b2, results: [{ kind: 'profile', key: 'u1', ok: false, error: 'Not allowed' }], pending, synced, current: docs({ a: 2 }) });
  assert.equal(rej[0].error, 'Not allowed');
  assert.deepEqual(synced.get(id), { a: 1 });
});

test('a deletion is sent for a known document, and a document made again meanwhile stays pending', () => {
  const pending = new Set([id]);
  const synced = new Map([[id, { a: 1 }]]);
  const batch = buildBatch({ pending, synced, current: new Map() });
  assert.deepEqual(batch.deletes, [{ kind: 'profile', key: 'u1' }]);
  settleBatch({ batch, results: [{ kind: 'profile', key: 'u1', ok: true }], pending, synced, current: docs({ a: 3 }) });
  assert.ok(pending.has(id));
  assert.equal(synced.has(id), false);
});

test('a document that never reached the server and was removed again is simply forgotten', () => {
  const pending = new Set([id]);
  const batch = buildBatch({ pending, synced: new Map(), current: new Map() });
  assert.deepEqual(batch, { patches: [], deletes: [] });
  assert.equal(pending.size, 0);
});
