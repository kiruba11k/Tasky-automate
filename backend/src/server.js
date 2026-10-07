import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, bootstrapAdmin } from './app.js';
import { MemoryStore } from './store.js';
import { PgStore } from './pgStore.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const isProd = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) throw new Error('JWT_SECRET must be set in production');
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET not set: using a random secret (sessions reset on restart).');
}

let store;
if (process.env.DATABASE_URL) {
  store = new PgStore(process.env.DATABASE_URL);
} else {
  const dataDir = process.env.DATA_DIR || path.join(root, 'data');
  console.warn(`DATABASE_URL not set: using local JSON store in ${dataDir}`);
  store = new MemoryStore({ file: path.join(dataDir, 'db.json'), uploadDir: path.join(dataDir, 'uploads') });
}
await store.init();

const port = Number(process.env.PORT) || 4000;
const baseUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
await bootstrapAdmin(store, { email: process.env.ADMIN_EMAIL, name: process.env.ADMIN_NAME || 'Admin' });
if ((await store.list('User', { query: { role: 'admin' } })).length === 0) {
  console.warn('No admin exists, so nobody can sign in. Set ADMIN_EMAIL to create the first admin.');
}

const app = createApp({ store, jwtSecret, staticDir: path.join(root, '..', 'frontend', 'dist') });
app.listen(port, () => console.log(`Tasky backend listening on ${baseUrl}`));
