import test from 'node:test';
import assert from 'node:assert/strict';
import { createPush } from '../src/push.js';
import { MemoryStore } from '../src/store.js';

const sub = (n) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: 'p', auth: 'a' } });
const make = async (send) => { const store = new MemoryStore(); await store.init(); return { store, push: createPush({ store, env: {}, send }) }; };

test('keys are made once and kept', async () => {
  const { push } = await make();
  const a = await push.publicKey();
  assert.ok(a.length > 40);
  assert.equal(await push.publicKey(), a);
});

test('only valid https subscriptions are stored, per person, newest first, de-duplicated', async () => {
  const { push, store } = await make(async () => {});
  await assert.rejects(push.subscribe('u1', { endpoint: 'http://x', keys: {} }), /valid push subscription/);
  await push.subscribe('u1', sub(1)); await push.subscribe('u1', sub(2)); await push.subscribe('u1', sub(1));
  const d = (await store.list('TrackerDoc', { query: { kind: 'config', key: 'push:u1' } }))[0];
  assert.deepEqual(d.data.subs.map((s) => s.endpoint), ['https://push.example/1', 'https://push.example/2']);
});

test('sendTo reaches every device, drops expired ones and never throws', async () => {
  const calls = [];
  const { push, store } = await make(async (s, body) => { calls.push([s.endpoint, JSON.parse(body).title]); if (s.endpoint.endsWith('/2')) throw Object.assign(new Error('gone'), { statusCode: 410 }); });
  await push.subscribe('u1', sub(1)); await push.subscribe('u1', sub(2));
  assert.equal(await push.sendTo('u1', { title: 'Hi' }), 1);
  assert.equal(calls.length, 2);
  const d = (await store.list('TrackerDoc', { query: { kind: 'config', key: 'push:u1' } }))[0];
  assert.equal(d.data.subs.length, 1);
  assert.equal(await push.sendTo('nobody', { title: 'x' }), 0);
});
