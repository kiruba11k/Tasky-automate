import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, bootstrapAdmin } from '../src/app.js';
import { MemoryStore } from '../src/store.js';

describe('group chats: anyone renames, only the creator deletes', () => {
  let server, base, admin;
  const ids = {}; const tok = {};
  const call = async (method, url, token, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
    const t = await res.text(); return { status: res.status, body: t ? JSON.parse(t) : null };
  };
  const login = async (email) => (await call('POST', '/api/auth/login', null, { email })).body.token;
  const put = (token, kind, key, data) => call('POST', '/api/tracker/docs/batch', token, { patches: [{ kind, key, patch: data }] }).then((r) => r.body.results[0]);
  const del = (token, kind, key) => call('POST', '/api/tracker/docs/batch', token, { deletes: [{ kind, key }] }).then((r) => r.body.results[0]);
  const docs = async (token) => (await call('GET', '/api/tracker/docs', token)).body.docs;

  before(async () => {
    const store = new MemoryStore(); await store.init();
    await bootstrapAdmin(store, { email: 'boss@example.com' });
    server = createApp({ store, jwtSecret: 's', requirePassword: false }).listen(0);
    base = `http://localhost:${server.address().port}`;
    admin = await login('boss@example.com');
    for (const n of ['ann', 'bo', 'cy', 'outsider']) {
      ids[n] = (await call('POST', '/api/entities/User', admin, { full_name: n, email: `${n}@x.com`, role: 'team_member' })).body.id;
      tok[n] = await login(`${n}@x.com`);
    }
  });
  after(() => server.close());

  test('the creator is told they created it, others are not (and nobody learns who did)', async () => {
    assert.equal((await put(tok.ann, 'conv', 'g1', { id: 'g1', name: 'Lunch', group: true, anonymous: true, memberIds: [ids.ann, ids.bo, ids.cy] })).ok, true);
    assert.equal((await docs(tok.ann)).find((d) => d.key === 'g1').data.creator, true);
    assert.equal((await docs(tok.bo)).find((d) => d.key === 'g1').data.creator, false);
    assert.equal((await docs(tok.outsider)).some((d) => d.key === 'g1'), false);
  });

  test('any member renames the group, and the creator stays the creator', async () => {
    assert.equal((await put(tok.bo, 'conv', 'g1', { name: 'Lunch gang' })).ok, true);
    assert.equal((await put(tok.cy, 'conv', 'g1', { name: 'Lunch crew' })).ok, true);
    assert.equal((await put(tok.outsider, 'conv', 'g1', { name: 'Hacked' })).ok, false);
    const mine = (await docs(tok.ann)).find((d) => d.key === 'g1').data;
    assert.equal(mine.name, 'Lunch crew'); assert.equal(mine.creator, true);
    assert.equal((await docs(tok.bo)).find((d) => d.key === 'g1').data.creator, false);
  });

  test('the creator flag cannot be written by a client', async () => {
    await put(tok.bo, 'conv', 'g1', { creator: true });
    assert.equal((await docs(tok.bo)).find((d) => d.key === 'g1').data.creator, false);
  });

  test('only the creator deletes the group, and its messages and names go with it', async () => {
    assert.equal((await put(tok.bo, 'msg', 'm1', { id: 'm1', convId: 'g1', alias: 'Calm Otter', text: 'hi', at: new Date().toISOString() })).ok, true);
    assert.equal((await put(tok.bo, 'alias', `${ids.bo}:g1`, { alias: 'Calm Otter', day: 'x', used: ['Calm Otter'] })).ok, true);
    assert.equal((await del(tok.bo, 'conv', 'g1')).ok, false, 'a member who is not the creator cannot delete it');
    assert.equal((await del(tok.cy, 'conv', 'g1')).ok, false);
    assert.equal((await del(tok.ann, 'conv', 'g1')).ok, true);
    for (const t of [tok.ann, tok.bo, tok.cy]) {
      const d = await docs(t);
      assert.ok(!d.some((x) => x.key === 'g1' || x.key === 'm1' || x.key === `${ids.bo}:g1`), 'nothing of the group is served any more');
    }
    const delta = (await call('GET', '/api/tracker/docs?since=2000-01-01T00:00:00Z', tok.bo)).body.docs;
    assert.equal(delta.find((x) => x.key === 'g1').deleted, true, 'members are told it is gone');
    assert.ok(!delta.some((x) => x.key === 'm1' && !x.deleted), 'its messages are not served as live ones');
  });
});
