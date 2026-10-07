import jwt from 'jsonwebtoken';

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

/** Tiny in-memory sliding-window limiter for login attempts. */
export function createLimiter({ max = 20, windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    return recent.length <= max;
  };
}
