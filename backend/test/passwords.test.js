import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { hashPassword, verifyPassword, passwordProblem } from '../src/passwords.js';

test('hashing: salted, verifiable, wrong passwords fail', () => {
  const h = hashPassword('correct horse');
  assert.notEqual(h, hashPassword('correct horse'));
  assert.ok(verifyPassword('correct horse', h));
  assert.ok(!verifyPassword('wrong horse', h));
  assert.ok(!verifyPassword('x', 'garbage'));
  assert.match(passwordProblem('short'), /at least 8/);
  assert.equal(passwordProblem('long enough'), null);
});

test('login needs a password: first sign-in sets one, later ones must use it', async () => {
  const store = new MemoryStore(); await store.init();
  await store.insert('User', { full_name: 'Pat', email: 'pat@x.com', role: 'team_member', status: 'Active', project_ids: [] });
  const app = createApp({ store, jwtSecret: 's', ownerEmail: 'boss@x.com', requirePassword: true });
  const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (url, body, token) => { const r = await fetch(base + url, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  try {
    const first = await post('/api/auth/login', { email: 'pat@x.com' });
    assert.equal(first.body.setup, true);
    assert.equal(first.body.token, undefined); // no session without a password
    const me = await fetch(base + '/api/auth/me', { headers: { authorization: `Bearer ${first.body.setupToken}` } });
    assert.equal(me.status, 401); // a setup token is not a session
    assert.equal((await post('/api/auth/set-password', { setupToken: 'nope', password: 'longenough1' })).status, 401);
    assert.equal((await post('/api/auth/set-password', { setupToken: first.body.setupToken, password: 'short' })).status, 400);
    const set = await post('/api/auth/set-password', { setupToken: first.body.setupToken, password: 'longenough1' });
    assert.ok(set.body.token); assert.equal(set.body.user.has_password, true);
    assert.equal((await post('/api/auth/set-password', { setupToken: first.body.setupToken, password: 'another-pass1' })).status, 409); // only once
    assert.equal((await post('/api/auth/login', { email: 'pat@x.com' })).body.needsPassword, true);
    assert.equal((await post('/api/auth/login', { email: 'pat@x.com', password: 'wrong-pass' })).status, 401);
    const ok = await post('/api/auth/login', { email: 'pat@x.com', password: 'longenough1' });
    assert.ok(ok.body.token);
    assert.equal((await post('/api/auth/change-password', { current: 'bad', password: 'brand-new-pass' }, ok.body.token)).status, 401);
    assert.equal((await post('/api/auth/change-password', { current: 'longenough1', password: 'brand-new-pass' }, ok.body.token)).status, 200);
    assert.ok((await post('/api/auth/login', { email: 'pat@x.com', password: 'brand-new-pass' })).body.token);
    assert.equal((await post('/api/users/' + ok.body.user.id + '/reset-password', {}, ok.body.token)).status, 403); // not the main admin
  } finally { server.close(); }
});
