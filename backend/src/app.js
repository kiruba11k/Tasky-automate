import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { schemas, validate } from './schema.js';
import { invokeLLM } from './llm.js';
import { parseTable } from './extract.js';
import {
  MIN_PASSWORD, createLimiter, hashPassword, inviteHash, inviteValid, newInvite, publicUser, signToken, verifyPassword, verifyToken,
} from './auth.js';

const RESERVED_QUERY = new Set(['sort', 'limit', 'skip']);
const SERVED_MIME = /^(image\/(png|jpeg|gif|webp)|application\/pdf|text\/(csv|plain))$/;
const normEmail = (e) => String(e || '').trim().toLowerCase();
const isManager = (u) => u.role === 'admin' || u.role === 'team_leader';
// Fields clients may never write on a user.
const USER_PROTECTED = ['id', 'created_date', 'updated_date', 'created_by', 'password_hash', 'invite_token_hash', 'invite_expires', 'invite_pending', 'invite_token'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const strip = (body, keys) => Object.fromEntries(Object.entries(body || {}).filter(([k]) => !keys.includes(k)));

/** Creates the first admin from env (ADMIN_EMAIL [+ ADMIN_PASSWORD]) when no admin exists. Returns an invite token if one was issued. */
export async function bootstrapAdmin(store, { email, password, name = 'Admin' } = {}) {
  if (!email) return null;
  const admins = await store.list('User', { query: { role: 'admin' } });
  if (admins.length) return null;
  const fields = { full_name: name, email: normEmail(email), role: 'admin', status: 'Active', project_ids: [] };
  if (password) {
    if (password.length < MIN_PASSWORD) throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD} characters`);
    await store.insert('User', { ...fields, password_hash: hashPassword(password) });
    return null;
  }
  const invite = newInvite();
  await store.insert('User', { ...fields, ...invite.fields });
  return invite.token;
}

/** Builds the Express app around an initialised store. */
export function createApp({ store, jwtSecret, staticDir } = {}) {
  if (!store || !jwtSecret) throw new Error('createApp requires { store, jwtSecret }');
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  const loginLimit = createLimiter({ max: 10 });

  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: false })); // same-origin only; the SPA is served by this app
  app.use(express.json({ limit: '2mb' }));

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const sessionFor = (user) => ({ token: signToken(jwtSecret, user.id), user: publicUser(user) });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // ---- public auth endpoints (no self sign-up exists: accounts are created by invitation only) ----
  const findByEmail = async (email) => (await store.list('User')).find((u) => normEmail(u.email) === normEmail(email));

  app.post('/api/auth/login', wrap(async (req, res) => {
    const email = normEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!loginLimit(`${req.ip}|${email}`)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    const user = email ? await findByEmail(email) : null;
    // Always run a hash comparison so response time doesn't reveal whether the email exists.
    const ok = verifyPassword(password, user?.password_hash || 'scrypt$00$00');
    if (!user || !ok || user.status === 'Inactive') return res.status(401).json({ error: 'Invalid email or password' });
    res.json(sessionFor(user));
  }));

  const userByInvite = async (token) => {
    const hash = inviteHash(String(token || ''));
    const user = (await store.list('User', { query: {} })).find((u) => u.invite_token_hash === hash);
    return inviteValid(user) ? user : null;
  };

  app.get('/api/auth/invite/:token', wrap(async (req, res) => {
    const user = await userByInvite(req.params.token);
    if (!user) return res.status(404).json({ error: 'This invitation is invalid or has expired' });
    res.json({ email: user.email, full_name: user.full_name });
  }));

  app.post('/api/auth/accept-invite', wrap(async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
    }
    const user = await userByInvite(token);
    if (!user) return res.status(404).json({ error: 'This invitation is invalid or has expired' });
    const updated = await store.update('User', user.id, { password_hash: hashPassword(password), invite_token_hash: null, invite_expires: null, status: 'Active' });
    res.json(sessionFor(updated));
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
    if (!user || !user.password_hash || user.status === 'Inactive') return res.status(401).json({ error: 'Authentication required' });
    req.user = user;
    next();
  });
  app.use('/api', requireAuth);

  app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));

  app.patch('/api/auth/me', wrap(async (req, res) => {
    // Self-service profile edits only: no role/email/status changes.
    const allowed = ['full_name', 'google_sheet_id', 'contact', 'designation', 'skills'];
    const body = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    const { data, errors } = validate(schemas.User, body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    res.json(publicUser(await store.update('User', req.user.id, data)));
  }));

  app.post('/api/auth/change-password', wrap(async (req, res) => {
    const { current_password, new_password } = req.body || {};
    if (!verifyPassword(String(current_password || ''), req.user.password_hash)) return res.status(400).json({ error: 'Current password is incorrect' });
    if (typeof new_password !== 'string' || new_password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
    }
    await store.update('User', req.user.id, { password_hash: hashPassword(new_password) });
    res.json({ success: true });
  }));

  // ---- users: managed by admins (any role) and team leaders (team members only) ----
  const canManageUser = (actor, target, newRole) => {
    if (actor.role === 'admin') return true;
    if (actor.role !== 'team_leader') return false;
    return target?.role !== 'admin' && target?.role !== 'team_leader' && (newRole === undefined || newRole === 'team_member');
  };

  app.get('/api/entities/User', wrap(async (req, res) => {
    const rows = await store.list('User', { sort: req.query.sort || '-created_date', limit: parseInt(req.query.limit, 10) || undefined, skip: parseInt(req.query.skip, 10) || 0 });
    res.json(rows.map(publicUser));
  }));

  app.get('/api/entities/User/:id', wrap(async (req, res) => {
    const u = await store.get('User', req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(publicUser(u));
  }));

  app.post('/api/entities/User', wrap(async (req, res) => {
    const body = strip(req.body, USER_PROTECTED);
    body.email = normEmail(body.email);
    const { data, errors } = validate(schemas.User, body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    if (!isManager(req.user) || !canManageUser(req.user, null, data.role)) return res.status(403).json({ error: 'You cannot invite users with this role' });
    if (await findByEmail(data.email)) return res.status(409).json({ error: 'A user with this email already exists' });
    const invite = newInvite();
    const created = await store.insert('User', { ...data, ...invite.fields }, req.user.email);
    res.status(201).json({ ...publicUser(created), invite_token: invite.token });
  }));

  app.post('/api/users/:id/invite', wrap(async (req, res) => {
    const target = await store.get('User', req.params.id);
    if (!target) return res.status(404).json({ error: 'Not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot re-invite yourself' });
    if (!canManageUser(req.user, target)) return res.status(403).json({ error: 'Not allowed' });
    const invite = newInvite();
    // Re-inviting an active user also invalidates their password until they accept (admin-driven reset).
    await store.update('User', target.id, { ...invite.fields, password_hash: null });
    res.json({ invite_token: invite.token });
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
    res.json(publicUser(await store.update('User', target.id, data)));
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
