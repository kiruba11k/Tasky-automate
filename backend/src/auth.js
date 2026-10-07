import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const MIN_PASSWORD = 8;
export const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, SCRYPT);
  return crypto.timingSafeEqual(actual, expected);
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Returns { token, fields } where fields are the DB columns to store (only the hash is persisted). */
export function newInvite() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, fields: { invite_token_hash: sha256(token), invite_expires: new Date(Date.now() + INVITE_TTL_MS).toISOString() } };
}

export const inviteHash = sha256;

export const inviteValid = (user) => !!user && !!user.invite_token_hash && new Date(user.invite_expires) > new Date();

export function signToken(secret, userId) {
  return jwt.sign({ sub: userId }, secret, { expiresIn: '7d' });
}

export function verifyToken(secret, token) {
  try {
    return jwt.verify(token, secret).sub;
  } catch {
    return null;
  }
}

/** Removes secrets and adds the derived invite_pending flag. */
export function publicUser(user) {
  if (!user) return user;
  const { password_hash, invite_token_hash, invite_expires, ...rest } = user;
  return { ...rest, invite_pending: !password_hash };
}

/** Tiny in-memory sliding-window limiter for login attempts. */
export function createLimiter({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    return recent.length <= max;
  };
}
