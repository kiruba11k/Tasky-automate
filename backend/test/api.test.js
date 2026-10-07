import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

async function start() {
  const { app } = createApp({});
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  return { call, base, close: () => server.close() };
}

test('entity CRUD, defaults, validation, filter and sort', async () => {
  const { call, close } = await start();
  try {
    assert.equal((await call('POST', '/api/entities/Project', { name: 'x' })).status, 400);
    const p = await call('POST', '/api/entities/Project', { name: 'A', team_id: 't', project_manager_id: 'm' });
    assert.equal(p.status, 201);
    assert.equal(p.body.status, 'Planning');
    assert.equal((await call('POST', '/api/entities/Project', { name: 'B', team_id: 't', project_manager_id: 'm', status: 'Nope' })).status, 400);
    await call('POST', '/api/entities/Project', { name: 'B', team_id: 't2', project_manager_id: 'm' });
    assert.deepEqual((await call('GET', '/api/entities/Project?team_id=t2')).body.map((r) => r.name), ['B']);
    assert.deepEqual((await call('GET', '/api/entities/Project?sort=name&limit=1')).body.map((r) => r.name), ['A']);
    const u = await call('PUT', `/api/entities/Project/${p.body.id}`, { status: 'Active' });
    assert.equal(u.body.status, 'Active');
    assert.equal(u.body.name, 'A');
    assert.equal((await call('DELETE', `/api/entities/Project/${p.body.id}`)).status, 200);
    assert.equal((await call('GET', `/api/entities/Project/${p.body.id}`)).status, 404);
    assert.equal((await call('GET', '/api/entities/Nope')).status, 404);
  } finally {
    close();
  }
});

test('auth/me, users, last admin protected', async () => {
  const { call, close } = await start();
  try {
    const me = await call('GET', '/api/auth/me');
    assert.equal(me.body.role, 'admin');
    assert.equal((await call('DELETE', `/api/entities/User/${me.body.id}`)).status, 400);
    assert.equal((await call('POST', '/api/entities/User', { full_name: 'A', email: 'admin@example.com' })).status, 409);
    const patched = await call('PATCH', '/api/auth/me', { google_sheet_id: 'abc', role: 'team_member' });
    assert.equal(patched.body.google_sheet_id, 'abc');
    assert.equal(patched.body.role, 'admin');
  } finally {
    close();
  }
});

test('upload + extract CSV, and LLM fallback', async () => {
  const { call, base, close } = await start();
  try {
    const form = new FormData();
    form.append('file', new Blob(['Date,Task\n2025-01-01,Write\n']), 'a.csv');
    const up = await (await fetch(`${base}/api/integrations/upload`, { method: 'POST', body: form })).json();
    const ex = await call('POST', '/api/integrations/extract', { file_url: up.file_url });
    assert.deepEqual(ex.body.output.columns, ['Date', 'Task']);
    assert.equal(ex.body.output.tasks[0].Task, 'Write');
    assert.equal((await call('POST', '/api/integrations/extract', { file_url: '/uploads/../x' })).status, 400);
    const llm = await call('POST', '/api/integrations/llm', { prompt: 'hi' });
    assert.equal(llm.status, 200);
  } finally {
    close();
  }
});
