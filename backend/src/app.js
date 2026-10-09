import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { schemas, validate } from './schema.js';
import { invokeLLM } from './llm.js';
import { parseTable } from './extract.js';
import { createLimiter, signToken, verifyToken } from './auth.js';
import { createNotifier } from './notify.js';
import { validateThemePrefs } from './theme.js';
import { registerBirds } from './birds.js';
import { buddyStatus, hatchEgg, parade, validateBuddyPrefs } from './buddies.js';
import { registerWeekly } from './weekly.js';
import { parseVoice } from './voice.js';
import { openDailyDrop, syncProgress, teamPulse, trophies } from './gamify.js';

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
export function createApp({ store, jwtSecret, staticDir, llm, random = Math.random, clock = Date.now } = {}) {
  // AI parsing needs ANTHROPIC_API_KEY (or an injected function in tests); otherwise voice falls back to simple rules.
  const voiceLlm = llm || (process.env.ANTHROPIC_API_KEY ? invokeLLM : null);
  const voiceLimit = createLimiter({ max: 60, windowMs: 60 * 60 * 1000 });
  const notifier = createNotifier(store);
  // Notification side-effects must never fail the request that caused them.
  const afterWrite = (args) => notifier.afterWrite(args).catch((e) => console.error('notify failed:', e));
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
    const allowed = ['full_name', 'google_sheet_id', 'contact', 'designation', 'skills', 'theme', 'theme_auto', 'theme_custom', 'theme_at', 'buddy', 'equipped', 'birds_muted'];
    const body = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    const themeError = validateThemePrefs(body);
    if (themeError) return res.status(400).json({ error: themeError });
    if (body.theme_custom === '') body.theme_custom = null; // clearing a custom theme
    if (body.buddy !== undefined || body.equipped !== undefined) {
      const buddyError = validateBuddyPrefs(body, await buddyStatus(store, req.user));
      if (buddyError) return res.status(400).json({ error: buddyError });
    }
    const { data, errors } = validate(schemas.User, body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    res.json(await store.update('User', req.user.id, data));
  }));

  // ---- notifications (own only) ----
  app.get('/api/notifications', wrap(async (req, res) => {
    const query = { user_id: req.user.id };
    if (req.query.unread === 'true') query.read = false;
    res.json(await store.list('Notification', { query, sort: '-created_date', limit: Math.min(parseInt(req.query.limit, 10) || 50, 200) }));
  }));

  app.post('/api/notifications/read', wrap(async (req, res) => {
    const mine = await store.list('Notification', { query: { user_id: req.user.id, read: false } });
    const ids = req.body?.all ? null : new Set(Array.isArray(req.body?.ids) ? req.body.ids : []);
    for (const n of mine) if (!ids || ids.has(n.id)) await store.update('Notification', n.id, { read: true });
    res.json({ success: true });
  }));

  app.get('/api/notifications/stream', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write(': connected\n\n');
    const unsubscribe = notifier.subscribe(req.user.id, res);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  registerWeekly(app, { store, notifier, wrap });
  registerBirds(app, { store, notifier, wrap, clock });

  // Weekly plans and notifications are written only through the endpoints above.
  const READ_ONLY_ENTITIES = new Set(['WeeklyTask', 'WeeklyAssignment', 'Achievement', 'Kudos']);
  app.use('/api/entities/:entity', (req, res, next) => {
    const { entity: name } = req.params;
    if (name === 'BirdMessage') return res.status(404).json({ error: 'Unknown entity BirdMessage' }); // private: only the bird endpoints may touch it
    if (name === 'Notification' || (READ_ONLY_ENTITIES.has(name) && req.method !== 'GET')) {
      return res.status(403).json({ error: `${name} cannot be changed directly` });
    }
    next();
  });

  // ---- voice: dictated text -> structured weekly / daily tasks (nothing is saved here; the UI reviews first) ----
  app.post('/api/voice/parse', wrap(async (req, res) => {
    const { transcript, mode, week_start: weekStart } = req.body || {};
    if (!['weekly', 'daily'].includes(mode)) return res.status(400).json({ error: 'mode must be weekly or daily' });
    if (typeof transcript !== 'string' || transcript.trim().length < 3) return res.status(400).json({ error: 'Nothing to parse — dictate or type a task first' });
    if (mode === 'weekly' && req.user.role !== 'admin' && req.user.role !== 'team_leader') return res.status(403).json({ error: 'Only team leaders can plan the week' });
    if (mode === 'weekly' && !/^\d{4}-\d{2}-\d{2}$/.test(weekStart || '')) return res.status(400).json({ error: 'week_start is required' });
    if (!voiceLimit(req.user.id)) return res.status(429).json({ error: 'Too many voice requests. Try again later.' });
    const [users, projects] = await Promise.all([store.list('User'), store.list('Project')]);
    await store.list('Achievement', { query: { user_id: req.user.id, key: 'flag:voice' } }).then((r) => (r.length ? null : store.insert('Achievement', { user_id: req.user.id, key: 'flag:voice' }))).catch(() => {});
    const today = new Date().toISOString().slice(0, 10);
    res.json(await parseVoice({ transcript, mode, users, projects, me: req.user, today: req.body.today && /^\d{4}-\d{2}-\d{2}$/.test(req.body.today) ? req.body.today : today, weekStart: mode === 'weekly' ? weekStart : null, llm: voiceLlm }));
  }));

  // ---- playful progress: derived from real work. Rewards come from finished tasks, never from merely opening the app. ----
  const todayParam = (req) => (/^\d{4}-\d{2}-\d{2}$/.test(req.query.today || req.body?.today || '') ? (req.query.today || req.body.today) : new Date().toISOString().slice(0, 10));
  const EMOJIS = ['🙌', '🔥', '🌟', '💪', '🎯', '❤️', '👏', '🚀'];

  // Evaluates quests/badges for the signed-in user, records anything newly earned (once) and returns the progress.
  app.post('/api/me/sync', wrap(async (req, res) => res.json(await syncProgress(store, req.user, todayParam(req)))));
  app.get('/api/me/trophies', wrap(async (req, res) => res.json(await trophies(store, req.user, todayParam(req)))));

  app.post('/api/me/daily-drop', wrap(async (req, res) => {
    const r = await openDailyDrop(store, req.user, todayParam(req), random);
    if (r.error) return res.status(r.status).json({ error: r.error });
    res.json(r);
  }));

  app.get('/api/me/buddies', wrap(async (req, res) => res.json(await buddyStatus(store, req.user))));
  app.post('/api/me/hatch', wrap(async (req, res) => {
    const r = await hatchEgg(store, req.user, random, todayParam(req));
    if (r.error) return res.status(r.status).json({ error: r.error });
    res.json(r);
  }));
  app.get('/api/team/parade', wrap(async (req, res) => {
    const ws = /^\d{4}-\d{2}-\d{2}$/.test(req.query.week_start || '') ? req.query.week_start : null;
    if (!ws) return res.status(400).json({ error: 'week_start is required' });
    res.json(await parade(store, todayParam(req), ws));
  }));

  app.get('/api/team/pulse', wrap(async (req, res) => {
    const today = todayParam(req);
    const ws = /^\d{4}-\d{2}-\d{2}$/.test(req.query.week_start || '') ? req.query.week_start : null;
    if (!ws) return res.status(400).json({ error: 'week_start is required' });
    res.json(await teamPulse(store, today, ws, await store.list('User')));
  }));

  app.post('/api/kudos', wrap(async (req, res) => {
    const { to_user_id: toId, emoji, message } = req.body || {};
    const target = toId && (await store.get('User', toId));
    if (!target || target.status === 'Inactive') return res.status(404).json({ error: 'Teammate not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Save the high-fives for your teammates 😄' });
    if (!EMOJIS.includes(emoji)) return res.status(400).json({ error: 'Pick one of the high-five emojis' });
    const today = new Date().toISOString().slice(0, 10);
    const sentToday = (await store.list('Kudos', { query: { from_user_id: req.user.id } })).filter((k) => String(k.created_date).slice(0, 10) === today).length;
    if (sentToday >= 20) return res.status(429).json({ error: 'That is plenty of high-fives for today!' });
    const rec = await store.insert('Kudos', { from_user_id: req.user.id, to_user_id: target.id, emoji, message: String(message || '').trim().slice(0, 140) || undefined }, req.user.email);
    const by = req.user.full_name || req.user.email;
    await notifier.notify(target.id, { type: 'kudos', title: `${by} sent you a ${emoji}`, message: rec.message || 'Keep up the great work!', actor_name: by, link: '/' }).catch((e) => console.error('kudos notify failed:', e));
    res.status(201).json(rec);
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
    const created = await store.insert(req.params.entity, data, req.user.email);
    await afterWrite({ entity: req.params.entity, action: 'create', rec: created, actor: req.user });
    res.status(201).json(created);
  }));

  app.put('/api/entities/:entity/:id', entity, wrap(async (req, res) => {
    const { data, errors } = validate(req.schema, req.body || {}, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const prev = await store.get(req.params.entity, req.params.id);
    const rec = prev && (await store.update(req.params.entity, req.params.id, data));
    if (!rec) return res.status(404).json({ error: 'Not found' });
    await afterWrite({ entity: req.params.entity, action: 'update', rec, prev, actor: req.user });
    res.json(rec);
  }));

  app.delete('/api/entities/:entity/:id', entity, wrap(async (req, res) => {
    const prev = await store.get(req.params.entity, req.params.id);
    if (!prev || !(await store.remove(req.params.entity, req.params.id))) return res.status(404).json({ error: 'Not found' });
    await afterWrite({ entity: req.params.entity, action: 'delete', rec: null, prev, actor: req.user });
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
