// Passwords: salted scrypt hashes kept in a server-only "config" document per person (never returned by any API).
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 200;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [kind, salt, hash] = String(stored).split('$');
    if (kind !== 'scrypt') return false;
    const want = Buffer.from(hash, 'base64');
    const got = crypto.scryptSync(String(password), Buffer.from(salt, 'base64'), want.length);
    return crypto.timingSafeEqual(want, got);
  } catch { return false; }
}

export const passwordProblem = (p) => (typeof p !== 'string' || p.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters` : p.length > MAX_PASSWORD ? 'That password is too long' : p.trim().length < MIN_PASSWORD ? 'Use at least 8 characters that are not spaces' : null);

// A setup token proves "this person just gave a valid, added email" for the next 15 minutes, and only lets them choose a first password.
// It is signed with a different key from sessions, so it can never be used as a session.
const setupKey = (secret) => `${secret}|password-setup`;
export const signSetupToken = (secret, userId) => jwt.sign({ sub: userId, purpose: 'setup' }, setupKey(secret), { expiresIn: '15m' });
export function verifySetupToken(secret, token) {
  try { const p = jwt.verify(String(token), setupKey(secret)); return p.purpose === 'setup' ? p.sub : null; } catch { return null; }
}

export function passwordStore(store, clock = Date.now) {
  const doc = async (userId) => (await store.list('TrackerDoc', { query: { kind: 'config', key: `pw:${userId}` }, limit: 1 }))[0];
  return {
    has: async (userId) => Boolean((await doc(userId))?.data?.hash),
    verify: async (userId, password) => { const d = await doc(userId); return Boolean(d?.data?.hash) && verifyPassword(password, d.data.hash); },
    set: async (userId, password) => {
      const d = await doc(userId);
      const data = { hash: hashPassword(password), at: new Date(clock()).toISOString() };
      if (d) await store.update('TrackerDoc', d.id, { data });
      else await store.insert('TrackerDoc', { kind: 'config', key: `pw:${userId}`, data, owner_id: 'system', deleted: false, born: clock() }, 'system');
    },
    clear: async (userId) => { const d = await doc(userId); if (d) await store.update('TrackerDoc', d.id, { data: {} }); },
  };
}
