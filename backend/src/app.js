import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { schemas, validate } from './schema.js';
import { invokeLLM } from './llm.js';
import { parseTable } from './extract.js';
import { createLimiter, signToken, verifyToken } from './auth.js';

const RESERVED_QUERY = new Set(['sort', 'limit', 'skip']);
const SERVED_MIME = /^(image\/(png|jpeg|gif|webp)|application\/pdf|text\/(csv|plain))$/;
const normEmail = (e) => String(e || '').trim().toLowerCase();
const isManager = (u) => u.role === 'admin' || u.role === 'team_leader';
// Fields clients may never write on a user.
const USER_PROTECTED = ['id', 'created_date', 'updated_date', 'created_by'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const strip = (body, keys) => Object.fromEntries(Object.entries(body || {}).filter(([k]) => !keys.includes(k)));

/** Creates the first admin from ADMIN_EMAIL when no admin exists yet. */
export async function bootstrapAdmin(store, { email, name = 'Admin' } = {}) {
  if (!email) return false;
  if ((await store.list('User', { query: { role: 'admin' } })).length) return false;
  await store.insert('User', { full_name: name, email: normEmail(email), role: 'admin', status: 'Active', project_ids: [] });
  return true;
}

/** Builds the Express app around an initialised store. */
export function createApp({ store, jwtSecret, staticDir } = {}) {
  if (!store || !jwtSecret) throw new Error('createApp requires { store, jwtSecret }');
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  const loginLimit = createLimiter({ max: 20 });

  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: false })); // same-origin only; the SPA is served by this app
  app.use(express.json({ limit: '2mb' }));

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // ---- login: email only. There is no sign-up; only emails an admin/team leader added to the users table can sign in. ----
  const findByEmail = async (email) => (await store.list('User')).find((u) => normEmail(u.email) === normEmail(email));

  app.post('/api/auth/login', wrap(async (req, res) => {
    const email = normEmail(req.body?.email);
    if (!loginLimit(`${req.ip}|${email}`)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    const user = email ? await findByEmail(email) : null;
    if (!user || user.status === 'Inactive') return res.status(401).json({ error: 'This email has not been added. Ask an admin to add you.' });
    res.json({ token: signToken(jwtSecret, user.id), user });
  }));

  // ---- uploaded files: ids are random UUIDs; served as attachments with a restricted content type ----
  app.get('/uploads/:id', wrap(async (req, res) => {
    const file = await store.getFile(req.params.id);
    if (!file) return res.status(404).json({ error: 'Not found' });
    res.set({
      'Content-Type': SERVED_MIME.test(file.mime || '') ? file.mime : 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    });
    res.send(file.buffer);
  }));

  // ---- everything below requires a valid session ----
  const requireAuth = wrap(async (req, res, next) => {
    const header = req.get('authorization') || '';
    const userId = header.startsWith('Bearer ') ? verifyToken(jwtSecret, header.slice(7)) : null;
    const user = userId ? await store.get('User', userId) : null;
    if (!user || user.status === 'Inactive') return res.status(401).json({ error: 'Authentication required' });
    req.user = user;
    next();
  });
  app.use('/api', requireAuth);

  app.get('/api/auth/me', (req, res) => res.json(req.user));

  app.patch('/api/auth/me', wrap(async (req, res) => {
    // Self-service profile edits only: no role/email/status changes.
    const allowed = ['full_name', 'google_sheet_id', 'contact', 'designation', 'skills'];
    const body = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    const { data, errors } = validate(schemas.User, body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    res.json(await store.update('User', req.user.id, data));
  }));

  // ---- users: managed by admins (any role) and team leaders (team members only) ----
  const canManageUser = (actor, target, newRole) => {
    if (actor.role === 'admin') return true;
    if (actor.role !== 'team_leader') return false;
    return target?.role !== 'admin' && target?.role !== 'team_leader' && (newRole === undefined || newRole === 'team_member');
  };

  app.get('/api/entities/User', wrap(async (req, res) => {
    const rows = await store.list('User', { sort: req.query.sort || '-created_date', limit: parseInt(req.query.limit, 10) || undefined, skip: parseInt(req.query.skip, 10) || 0 });
    res.json(rows);
  }));

  app.get('/api/entities/User/:id', wrap(async (req, res) => {
    const u = await store.get('User', req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(u);
  }));

  app.post('/api/entities/User', wrap(async (req, res) => {
    const body = strip(req.body, USER_PROTECTED);
    body.email = normEmail(body.email);
    const { data, errors } = validate(schemas.User, body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    if (!isManager(req.user) || !canManageUser(req.user, null, data.role)) return res.status(403).json({ error: 'You cannot add users with this role' });
    if (await findByEmail(data.email)) return res.status(409).json({ error: 'A user with this email already exists' });
    res.status(201).json(await store.insert('User', data, req.user.email));
  }));

  app.put('/api/entities/User/:id', wrap(async (req, res) => {
    const target = await store.get('User', req.params.id);
    if (!target) return res.status(404).json({ error: 'Not found' });
    const body = strip(req.body, USER_PROTECTED);
    if (body.email !== undefined) body.email = normEmail(body.email);
    const { data, errors } = validate(schemas.User, body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    if (!canManageUser(req.user, target, data.role)) return res.status(403).json({ error: 'Not allowed' });
    if (data.email && data.email !== normEmail(target.email)) {
      const other = await findByEmail(data.email);
      if (other && other.id !== target.id) return res.status(409).json({ error: 'A user with this email already exists' });
    }
    const losesAdmin = target.role === 'admin' && ((data.role && data.role !== 'admin') || data.status === 'Inactive');
    if (losesAdmin && (await store.list('User', { query: { role: 'admin' } })).filter((a) => a.status !== 'Inactive').length <= 1) {
      return res.status(400).json({ error: 'Cannot demote or deactivate the last admin' });
    }
    res.json(await store.update('User', target.id, data));
  }));

  app.delete('/api/entities/User/:id', wrap(async (req, res) => {
    const target = await store.get('User', req.params.id);
    if (!target) return res.status(404).json({ error: 'Not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
    if (!canManageUser(req.user, target)) return res.status(403).json({ error: 'Not allowed' });
    if (target.role === 'admin' && (await store.list('User', { query: { role: 'admin' } })).length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin' });
    }
    await store.remove('User', target.id);
    res.json({ success: true });
  }));

  // ---- generic entity CRUD (all authenticated users) ----
  const entity = (req, res, next) => {
    const schema = schemas[req.params.entity];
    if (!schema) return res.status(404).json({ error: `Unknown entity ${req.params.entity}` });
    req.schema = schema;
    next();
  };

  app.get('/api/entities/:entity', entity, wrap(async (req, res) => {
    const query = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (RESERVED_QUERY.has(k)) continue;
      try {
        query[k] = JSON.parse(v);
      } catch {
        query[k] = v;
      }
    }
    res.json(await store.list(req.params.entity, {
      query, sort: req.query.sort || '-created_date', skip: parseInt(req.query.skip, 10) || 0, limit: parseInt(req.query.limit, 10) || undefined,
    }));
  }));

  app.get('/api/entities/:entity/:id', entity, wrap(async (req, res) => {
    const rec = await store.get(req.params.entity, req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json(rec);
  }));

  app.post('/api/entities/:entity', entity, wrap(async (req, res) => {
    const body = { ...(req.body || {}) };
    if (req.schema.properties?.uploaded_by && !body.uploaded_by) body.uploaded_by = req.user.id;
    if (req.schema.properties?.timestamp && !body.timestamp) body.timestamp = new Date().toISOString();
    const { data, errors } = validate(req.schema, body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    res.status(201).json(await store.insert(req.params.entity, data, req.user.email));
  }));

  app.put('/api/entities/:entity/:id', entity, wrap(async (req, res) => {
    const { data, errors } = validate(req.schema, req.body || {}, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const rec = await store.update(req.params.entity, req.params.id, data);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json(rec);
  }));

  app.delete('/api/entities/:entity/:id', entity, wrap(async (req, res) => {
    if (!(await store.remove(req.params.entity, req.params.id))) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  }));

  // ---- integrations ----
  app.post('/api/integrations/upload', upload.single('file'), wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const name = path.basename(req.file.originalname);
    const id = await store.putFile({ name, mime: req.file.mimetype, buffer: req.file.buffer });
    res.json({ file_url: `/uploads/${id}`, file_name: name, file_size: req.file.size });
  }));

  app.post('/api/integrations/extract', wrap(async (req, res) => {
    const m = String(req.body?.file_url || '').match(/^\/uploads\/([0-9a-f-]{36})$/i);
    const file = m && (await store.getFile(m[1]));
    if (!file) return res.status(400).json({ status: 'error', details: 'Uploaded file not found' });
    try {
      const { columns, rows } = await parseTable(file.buffer, file.name);
      res.json({ status: 'success', output: { columns, tasks: rows } });
    } catch (e) {
      res.status(422).json({ status: 'error', details: e.message });
    }
  }));

  app.post('/api/integrations/llm', wrap(async (req, res) => {
    if (!req.body?.prompt) return res.status(400).json({ error: 'prompt is required' });
    res.json({ result: await invokeLLM(req.body) });
  }));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.code === '23505') return res.status(409).json({ error: 'Duplicate value' });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 10 MB)' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
