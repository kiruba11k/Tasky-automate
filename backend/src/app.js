import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { schemas, validate } from './schema.js';
import { Store, sortRecords, matches } from './store.js';
import { invokeLLM } from './llm.js';
import { parseTable } from './extract.js';

const RESERVED_QUERY = new Set(['sort', 'limit', 'skip']);

/** Builds the Express app. `dataDir` holds db.json and uploaded files. */
export function createApp({ dataDir, staticDir } = {}) {
  const store = new Store(dataDir ? path.join(dataDir, 'db.json') : null);
  const uploadDir = dataDir ? path.join(dataDir, 'uploads') : fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'tasky-'));
  fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({ dest: uploadDir, limits: { fileSize: 20 * 1024 * 1024 } });

  if (store.all('User').length === 0) {
    store.insert('User', { full_name: 'Admin', email: 'admin@example.com', role: 'admin', status: 'Active', project_ids: [] });
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use('/uploads', express.static(uploadDir, { setHeaders: (res) => res.setHeader('Content-Disposition', 'attachment') }));

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // ---- auth (header-based identity; no passwords) ----
  const currentUser = (req) => {
    const id = req.get('x-user-id');
    return (id && store.get('User', id)) || store.all('User').find((u) => u.role === 'admin') || store.all('User')[0];
  };

  app.get('/api/auth/me', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'No users exist' });
    res.json(user);
  });

  app.patch('/api/auth/me', (req, res) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'No users exist' });
    const { role: _role, ...allowed } = req.body || {}; // users cannot change their own role
    const { data, errors } = validate(schemas.User, allowed, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    res.json(store.update('User', user.id, data));
  });

  // ---- generic entity CRUD ----
  const entity = (req, res, next) => {
    const schema = schemas[req.params.entity];
    if (!schema) return res.status(404).json({ error: `Unknown entity ${req.params.entity}` });
    req.schema = schema;
    next();
  };

  app.get('/api/entities/:entity', entity, (req, res) => {
    const query = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (RESERVED_QUERY.has(k)) continue;
      try {
        query[k] = JSON.parse(v);
      } catch {
        query[k] = v;
      }
    }
    let rows = store.all(req.params.entity).filter((r) => matches(r, query));
    rows = sortRecords(rows, req.query.sort || '-created_date');
    const skip = parseInt(req.query.skip, 10) || 0;
    const limit = parseInt(req.query.limit, 10);
    rows = rows.slice(skip, Number.isFinite(limit) && limit > 0 ? skip + limit : undefined);
    res.json(rows);
  });

  app.get('/api/entities/:entity/:id', entity, (req, res) => {
    const rec = store.get(req.params.entity, req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json(rec);
  });

  app.post('/api/entities/:entity', entity, (req, res) => {
    const body = { ...(req.body || {}) };
    const me = currentUser(req);
    if (req.schema.properties?.uploaded_by && !body.uploaded_by) body.uploaded_by = me?.id;
    if (req.schema.properties?.timestamp && !body.timestamp) body.timestamp = new Date().toISOString();
    const { data, errors } = validate(req.schema, body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    if (req.params.entity === 'User' && store.all('User').some((u) => u.email.toLowerCase() === String(data.email).toLowerCase())) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    res.status(201).json(store.insert(req.params.entity, data, currentUser(req)?.email));
  });

  app.put('/api/entities/:entity/:id', entity, (req, res) => {
    const { data, errors } = validate(req.schema, req.body || {}, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const rec = store.update(req.params.entity, req.params.id, data);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json(rec);
  });

  app.delete('/api/entities/:entity/:id', entity, (req, res) => {
    if (req.params.entity === 'User') {
      const target = store.get('User', req.params.id);
      if (target?.role === 'admin' && store.all('User').filter((u) => u.role === 'admin').length <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin' });
      }
    }
    if (!store.remove(req.params.entity, req.params.id)) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });

  // ---- integrations ----
  app.post('/api/integrations/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const name = `${req.file.filename}${ext}`;
    fs.renameSync(req.file.path, path.join(uploadDir, name));
    res.json({ file_url: `/uploads/${name}`, file_name: req.file.originalname, file_size: req.file.size });
  });

  app.post('/api/integrations/extract', wrap(async (req, res) => {
    const url = String(req.body?.file_url || '');
    const name = path.basename(url);
    const filePath = path.join(uploadDir, name);
    if (!url.startsWith('/uploads/') || !fs.existsSync(filePath)) {
      return res.status(400).json({ status: 'error', details: 'Uploaded file not found' });
    }
    try {
      const { columns, rows } = await parseTable(filePath, name);
      res.json({ status: 'success', output: { columns, tasks: rows } });
    } catch (e) {
      res.status(422).json({ status: 'error', details: e.message });
    }
  }));

  app.post('/api/integrations/llm', wrap(async (req, res) => {
    if (!req.body?.prompt) return res.status(400).json({ error: 'prompt is required' });
    res.json({ result: await invokeLLM(req.body) });
  }));

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return { app, store };
}
