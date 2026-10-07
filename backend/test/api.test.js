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
    const login = async (email) => (await api('POST', '/api/auth/login', { body: { email } })).body.token;
    let admin;

    before(async () => {
      store = makeStore();
      await store.init();
      if (name === 'postgres') for (const e of Object.keys(schemas)) await store.pool.query(`TRUNCATE "${tableName(e)}"`);
      await bootstrapAdmin(store, { email: 'Boss@Example.com' });
      server = createApp({ store, jwtSecret: 'test-secret' }).listen(0);
      base = `http://localhost:${server.address().port}`;
      admin = await login(' BOSS@example.com ');
    });
    after(async () => {
      server.close();
      await store.close();
    });

    test('everything except login/health requires a session', async () => {
      assert.equal((await api('GET', '/api/health')).status, 200);
      assert.equal((await api('GET', '/api/entities/Project')).status, 401);
      assert.equal((await api('GET', '/api/auth/me')).status, 401);
      assert.equal((await api('GET', '/api/entities/Project', { token: 'garbage' })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'nobody@example.com' } })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', { body: {} })).status, 401);
      const me = await api('GET', '/api/auth/me', { token: admin });
      assert.equal(me.body.role, 'admin');
      assert.equal(me.body.email, 'boss@example.com');
    });

    test('only emails added by an admin can sign in', async () => {
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'lena@x.com' } })).status, 401);
      const add = await api('POST', '/api/entities/User', { token: admin, body: { full_name: 'Lena', email: 'Lena@X.com', role: 'team_leader' } });
      assert.equal(add.status, 201);
      assert.equal(add.body.email, 'lena@x.com');
      assert.equal((await api('POST', '/api/entities/User', { token: admin, body: { full_name: 'Dup', email: 'LENA@x.com' } })).status, 409);
      assert.ok(await login('lena@x.com'));
      // deactivated users are locked out, including existing sessions
      const t = await login('lena@x.com');
      await api('PUT', `/api/entities/User/${add.body.id}`, { token: admin, body: { status: 'Inactive' } });
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'lena@x.com' } })).status, 401);
      assert.equal((await api('GET', '/api/auth/me', { token: t })).status, 401);
      await api('PUT', `/api/entities/User/${add.body.id}`, { token: admin, body: { status: 'Active' } });
      // removing the user revokes access
      const tmp = await api('POST', '/api/entities/User', { token: admin, body: { full_name: 'Tmp', email: 'tmp@x.com' } });
      const tmpToken = await login('tmp@x.com');
      await api('DELETE', `/api/entities/User/${tmp.body.id}`, { token: admin });
      assert.equal((await api('GET', '/api/auth/me', { token: tmpToken })).status, 401);
      assert.equal((await api('POST', '/api/auth/login', { body: { email: 'tmp@x.com' } })).status, 401);
    });

    test('role rules', async () => {
      const lena = await login('lena@x.com');
      const member = await api('POST', '/api/entities/User', { token: lena, body: { full_name: 'Mo', email: 'mo@x.com' } });
      assert.equal(member.status, 201);
      assert.equal(member.body.role, 'team_member');
      assert.equal((await api('POST', '/api/entities/User', { token: lena, body: { full_name: 'X', email: 'x@x.com', role: 'admin' } })).status, 403);
      const mo = await login('mo@x.com');
      assert.equal((await api('POST', '/api/entities/User', { token: mo, body: { full_name: 'Y', email: 'y@x.com' } })).status, 403);
      const adminRec = (await api('GET', '/api/entities/User', { token: mo })).body.find((u) => u.role === 'admin');
      assert.equal((await api('PUT', `/api/entities/User/${adminRec.id}`, { token: lena, body: { role: 'team_member' } })).status, 403);
      assert.equal((await api('PUT', `/api/entities/User/${adminRec.id}`, { token: admin, body: { role: 'team_member' } })).status, 400); // last admin
      assert.equal((await api('DELETE', `/api/entities/User/${adminRec.id}`, { token: admin })).status, 400);
      assert.equal((await api('DELETE', `/api/entities/User/${adminRec.id}`, { token: admin })).status, 400);
      const put = await api('PUT', `/api/entities/User/${member.body.id}`, { token: admin, body: { designation: 'Dev', skills: 'a,b' } });
      assert.equal(put.body.designation, 'Dev');
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
