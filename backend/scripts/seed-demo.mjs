// Fills a RUNNING dev backend with the demo organisation: the ten people, their projects, tasks, day and week tables, leaves and
// notices. The demo generators live in the frontend (frontend/src/internal/lib/seed.js); this script creates the people as
// users, swaps the demo person ids for the real user ids and writes the documents through the normal API.
//   node scripts/seed-demo.mjs            (BASE_URL=http://localhost:4000, ADMIN_EMAIL=admin@example.com)
// Needs REQUIRE_PASSWORD=off on the server (sign-in by email only) and the server's ADMIN_EMAIL to be the same address. That
// account is the system owner (its role cannot be changed, so it is not one of the demo people); the script hides it from the team.
// Dates are relative to today, so seed again on a new day for fresh data. Never run it against real data.
import { buildInitialState } from '../../frontend/src/internal/lib/seed.js';
import { DEMO_PEOPLE } from '../../frontend/src/internal/lib/constants.js';

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const ADMIN = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
const emailOf = (p) => `${p.id}@example.com`;

const call = async (method, url, token, body) => {
  const res = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
};
const login = async (email) => {
  const r = await call('POST', '/api/auth/login', null, { email });
  if (!r.token) throw new Error(`Cannot sign in as ${email} (start the server with REQUIRE_PASSWORD=off and ADMIN_EMAIL=${ADMIN})`);
  return r.token;
};

const ROLE = { founder: { role: 'admin', founder: true }, manager: { role: 'admin', approver: true }, pm: { role: 'team_leader' }, resource: { role: 'team_member' } };

// 1. people
const admin = await login(ADMIN);
const existing = await call('GET', '/api/entities/User', admin);
const uid = {};
const owner = existing.find((u) => u.email?.toLowerCase() === ADMIN);
if (owner) await call('PUT', `/api/entities/User/${owner.id}`, admin, { does_tasks: false });
for (const p of DEMO_PEOPLE) {
  const fields = { full_name: p.name, email: emailOf(p), designation: p.title, status: 'Active', does_tasks: false, track_role: p.role, ...ROLE[p.role] };
  const have = existing.find((u) => u.email?.toLowerCase() === fields.email);
  uid[p.id] = have ? (await call('PUT', `/api/entities/User/${have.id}`, admin, fields)).id : (await call('POST', '/api/entities/User', admin, fields)).id;
}

// 2. documents, with the demo ids swapped for user ids
const swap = (v) => {
  if (typeof v === 'string') return uid[v] ?? v;
  if (Array.isArray(v)) return v.map(swap);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [swapKey(k), swap(x)]));
  return v;
};
const swapKey = (k) => { const [a, ...rest] = k.split('|'); return uid[a] ? [uid[a], ...rest].join('|') : k; };
const state = buildInitialState();
const docs = [];
const add = (kind, collection, shape) => (shape === 'list' ? collection.map((d) => ({ kind, key: d.id, patch: swap(d) })) : Object.entries(collection).map(([k, d]) => ({ kind, key: swapKey(k), patch: swap(d) })));
docs.push(...add('project', state.projects, 'list'), ...add('task', state.tasks, 'list'), ...add('daily', state.daily, 'map'), ...add('weekly', state.weekly, 'map'), ...add('profile', state.profiles, 'map'), ...add('notice', state.notices, 'list'));

// Komala (manager, approver) may write every kind of these documents. The anonymous chat is left empty on purpose.
const writer = await login(emailOf(DEMO_PEOPLE.find((p) => p.id === 'komala')));
let ok = 0;
const failed = [];
for (let i = 0; i < docs.length; i += 400) {
  const { results } = await call('POST', '/api/tracker/docs/batch', writer, { patches: docs.slice(i, i + 400) });
  results.forEach((r) => (r.ok ? ok++ : failed.push(`${r.kind} ${r.key}: ${r.error}`)));
}
console.log(`Seeded ${ok} documents for ${DEMO_PEOPLE.length} people.${failed.length ? ` ${failed.length} refused:\n${failed.slice(0, 10).join('\n')}` : ''}`);
console.log('Sign in with an email only: ' + DEMO_PEOPLE.map((p) => `${p.name.split(' ')[0]} = ${emailOf(p)}`).join(', '));
process.exit(failed.length ? 1 : 0);
