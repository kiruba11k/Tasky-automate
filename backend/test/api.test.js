import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, bootstrapAdmin } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { PgStore } from '../src/pgStore.js';
import { tableName } from '../src/ddl.js';
import { schemas } from '../src/schema.js';

const backends = [['memory', () => new MemoryStore()]];
if (process.env.TEST_DATABASE_URL) backends.push(['postgres', () => new PgStore(process.env.TEST_DATABASE_URL)]);

for (const [name, makeStore] of backends) {
  describe(`API (${name})`, () => {
    let store, server, base;
    const api = async (method, url, { body, token } = {}) => {
      const res = await fetch(base + url, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body && JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    };
    const login = async (email, password) => (await api('POST', '/api/auth/login', { body: { email, password } })).body.token;
    let admin;

    before(async () => {
      store = makeStore();
      await store.init();
      if (name === 'postgres') for (const e of Object.keys(schemas)) await store.pool.query(`TRUNCATE "${tableName(e)}"`);
      await bootstrapAdmin(store, { email: 'Boss@Example.com', password: 'supersecret1' });
      server = createApp({ store, jwtSecret: 'test-secret' }).listen(0);
      base = `http://localhost:${server.address().port}`;
      admin = await login('boss@example.com', 'supersecret1');
    });
    after(async () => {
      server.close();
      await store.close();
    });

    test('everything except login/invite/health requires a session', async () => {
      assert.equal((await api('GET', '/api/health')).status, 200);
      assert.equal((await api('GET', '/api/entities/Project')).status, 401);
      assert.equal((await api('GET', '/api/auth/me')).status, 401);
      assert.equal((await api('GET', '/api/entities/Project', { token: 'garbage' })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'boss@example.com', password: 'wrong' } })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'nobody@example.com', password: 'x' } })).status, 401);
      const me = await api('GET', '/api/auth/me', { token: admin });
      assert.equal(me.body.role, 'admin');
      assert.equal(me.body.password_hash, undefined);
    });

    test('invite-only onboarding', async () => {
      const inv = await api('POST', '/api/entities/User', { token: admin, body: { full_name: 'Lena', email: 'lena@x.com', role: 'team_leader' } });
      assert.equal(inv.status, 201);
      assert.ok(inv.body.invite_token);
      assert.equal(inv.body.invite_pending, true);
      assert.equal(inv.body.password_hash, undefined);
      // cannot log in before accepting
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'lena@x.com', password: 'anything12' } })).status, 401);
      assert.equal((await api('POST', '/api/entities/User', { token: admin, body: { full_name: 'Dup', email: 'LENA@x.com' } })).status, 409);
      assert.equal((await api('GET', '/api/auth/invite/bogus')).status, 404);
      assert.equal((await api('GET', `/api/auth/invite/${inv.body.invite_token}`)).body.email, 'lena@x.com');
      assert.equal((await api('POST', '/api/auth/accept-invite', { body: { token: inv.body.invite_token, password: 'short' } })).status, 400);
      const ok = await api('POST', '/api/auth/accept-invite', { body: { token: inv.body.invite_token, password: 'lenapass123' } });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.user.invite_pending, false);
      // token is single-use
      assert.equal((await api('POST', '/api/auth/accept-invite', { body: { token: inv.body.invite_token, password: 'otherpass123' } })).status, 404);
      assert.ok(await login('lena@x.com', 'lenapass123'));
    });

    test('role rules', async () => {
      const lena = await login('lena@x.com', 'lenapass123');
      const member = await api('POST', '/api/entities/User', { token: lena, body: { full_name: 'Mo', email: 'mo@x.com' } });
      assert.equal(member.status, 201);
      assert.equal(member.body.role, 'team_member');
      assert.equal((await api('POST', '/api/entities/User', { token: lena, body: { full_name: 'X', email: 'x@x.com', role: 'admin' } })).status, 403);
      const accept = await api('POST', '/api/auth/accept-invite', { body: { token: member.body.invite_token, password: 'mopass12345' } });
      const mo = accept.body.token;
      assert.equal((await api('POST', '/api/entities/User', { token: mo, body: { full_name: 'Y', email: 'y@x.com' } })).status, 403);
      const adminRec = (await api('GET', '/api/entities/User', { token: mo })).body.find((u) => u.role === 'admin');
      assert.equal((await api('PUT', `/api/entities/User/${adminRec.id}`, { token: lena, body: { role: 'team_member' } })).status, 403);
      assert.equal((await api('PUT', `/api/entities/User/${adminRec.id}`, { token: admin, body: { role: 'team_member' } })).status, 400); // last admin
      assert.equal((await api('DELETE', `/api/entities/User/${adminRec.id}`, { token: admin })).status, 400);
      // secrets can't be written through the API
      const put = await api('PUT', `/api/entities/User/${member.body.id}`, { token: admin, body: { designation: 'Dev', password_hash: 'x', skills: 'a,b' } });
      assert.equal(put.body.designation, 'Dev');
      assert.ok(await login('mo@x.com', 'mopass12345'));
      // admin reset via re-invite locks the old password
      const re = await api('POST', `/api/users/${member.body.id}/invite`, { token: admin });
      assert.ok(re.body.invite_token);
      assert.equal((await api('GET', '/api/auth/me', { token: mo })).status, 401);
    });

    test('entity CRUD, defaults, validation, filter, sort', async () => {
      const t = admin;
      assert.equal((await api('POST', '/api/entities/Project', { token: t, body: { name: 'x' } })).status, 400);
      const p = await api('POST', '/api/entities/Project', { token: t, body: { name: 'A', team_id: 't', project_manager_id: 'm', assigned_members: ['u1', 'u2'], budget: 12.5, extra_field: 'kept' } });
      assert.equal(p.status, 201);
      assert.equal(p.body.status, 'Planning');
      assert.equal(p.body.budget, 12.5);
      assert.equal(p.body.extra_field, 'kept');
      assert.equal((await api('POST', '/api/entities/Project', { token: t, body: { name: 'B', team_id: 't', project_manager_id: 'm', status: 'Nope' } })).status, 400);
      await api('POST', '/api/entities/Project', { token: t, body: { name: 'B', team_id: 't2', project_manager_id: 'm' } });
      assert.deepEqual((await api('GET', '/api/entities/Project?team_id=t2', { token: t })).body.map((r) => r.name), ['B']);
      assert.deepEqual((await api('GET', '/api/entities/Project?assigned_members=u2', { token: t })).body.map((r) => r.name), ['A']);
      assert.deepEqual((await api('GET', '/api/entities/Project?sort=name&limit=1', { token: t })).body.map((r) => r.name), ['A']);
      assert.deepEqual((await api('GET', '/api/entities/Project?sort=-name', { token: t })).body.map((r) => r.name), ['B', 'A']);
      const u = await api('PUT', `/api/entities/Project/${p.body.id}`, { token: t, body: { status: 'Active', extra_field: 'changed' } });
      assert.equal(u.body.status, 'Active');
      assert.equal(u.body.name, 'A');
      assert.equal(u.body.extra_field, 'changed');
      assert.equal((await api('GET', `/api/entities/Project/${p.body.id}`, { token: t })).body.assigned_members.length, 2);
      assert.equal((await api('DELETE', `/api/entities/Project/${p.body.id}`, { token: t })).status, 200);
      assert.equal((await api('GET', `/api/entities/Project/${p.body.id}`, { token: t })).status, 404);
      assert.equal((await api('GET', '/api/entities/Project/not-a-uuid', { token: t })).status, 404);
      assert.equal((await api('GET', '/api/entities/Nope', { token: t })).status, 404);
    });

    test('upload, extract CSV, serve file, LLM fallback', async () => {
      const form = new FormData();
      form.append('file', new Blob(['Date,Task\n2025-01-01,Write\n']), 'a.csv');
      const upRes = await fetch(`${base}/api/integrations/upload`, { method: 'POST', body: form });
      assert.equal(upRes.status, 401);
      const up = await (await fetch(`${base}/api/integrations/upload`, { method: 'POST', body: form, headers: { authorization: `Bearer ${admin}` } })).json();
      const ex = await api('POST', '/api/integrations/extract', { token: admin, body: { file_url: up.file_url } });
      assert.deepEqual(ex.body.output.columns, ['Date', 'Task']);
      assert.equal(ex.body.output.tasks[0].Task, 'Write');
      assert.equal((await api('POST', '/api/integrations/extract', { token: admin, body: { file_url: '/uploads/../x' } })).status, 400);
      const file = await fetch(base + up.file_url);
      assert.equal(file.status, 200);
      assert.match(file.headers.get('content-disposition'), /attachment/);
      assert.equal((await api('POST', '/api/integrations/llm', { token: admin, body: { prompt: 'hi' } })).status, 200);
    });
  });
}
