// Web Push: desktop and phone notifications that arrive even when the tracker is closed.
// Keys: set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, or leave them out and the server makes a pair once and keeps it in the store.
import webpush from 'web-push';

const MAX_SUBS = 10; // devices per person

export function createPush({ store, clock = Date.now, env = process.env, send = (sub, body) => webpush.sendNotification(sub, body, { TTL: 86400 }) }) {
  let keys = null;
  const doc = async (key) => (await store.list('TrackerDoc', { query: { kind: 'config', key }, limit: 1 }))[0];

  async function ensureKeys() {
    if (keys) return keys;
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) keys = { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
    else {
      const d = await doc('vapid');
      if (d) keys = d.data;
      else {
        keys = webpush.generateVAPIDKeys();
        await store.insert('TrackerDoc', { kind: 'config', key: 'vapid', data: keys, owner_id: 'system', deleted: false, born: clock() }, 'system');
      }
    }
    webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:admin@leadstrategus.com', keys.publicKey, keys.privateKey);
    return keys;
  }

  const valid = (s) => s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 && s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string';

  async function subscribe(userId, sub) {
    if (!valid(sub)) throw Object.assign(new Error('Not a valid push subscription'), { status: 400 });
    await ensureKeys();
    const key = `push:${userId}`;
    const d = await doc(key);
    const subs = [{ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, ...((d?.data?.subs || []).filter((x) => x.endpoint !== sub.endpoint))].slice(0, MAX_SUBS);
    if (d) await store.update('TrackerDoc', d.id, { data: { subs } });
    else await store.insert('TrackerDoc', { kind: 'config', key, data: { subs }, owner_id: userId, deleted: false, born: clock() }, 'system');
  }
  async function unsubscribe(userId, endpoint) {
    const d = await doc(`push:${userId}`);
    if (d) await store.update('TrackerDoc', d.id, { data: { subs: (d.data.subs || []).filter((x) => x.endpoint !== endpoint) } });
  }
  /** Sends to every device the person registered. Never throws: a notification is a courtesy, not a reason to fail a save. */
  async function sendTo(userId, payload) {
    try {
      if (!userId) return 0;
      const d = await doc(`push:${userId}`);
      if (!d?.data?.subs?.length) return 0;
      await ensureKeys();
      const body = JSON.stringify(payload);
      const dead = [];
      let sent = 0;
      for (const sub of d.data.subs) {
        try { await send(sub, body); sent += 1; } catch (e) { if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(sub.endpoint); }
      }
      if (dead.length) await store.update('TrackerDoc', d.id, { data: { subs: d.data.subs.filter((x) => !dead.includes(x.endpoint)) } });
      return sent;
    } catch (e) { console.error('push failed:', e.message); return 0; }
  }
  return { ensureKeys, subscribe, unsubscribe, sendTo, publicKey: async () => (await ensureKeys()).publicKey };
}

export function registerPush(app, { store, wrap, clock = Date.now }) {
  const push = createPush({ store, clock });
  app.get('/api/push/key', wrap(async (_req, res) => res.json({ key: await push.publicKey() })));
  app.post('/api/push/subscribe', wrap(async (req, res) => {
    try { await push.subscribe(req.user.id, req.body?.subscription); res.json({ ok: true }); } catch (e) { if (e.status) res.status(e.status).json({ error: e.message }); else throw e; }
  }));
  app.post('/api/push/unsubscribe', wrap(async (req, res) => { await push.unsubscribe(req.user.id, String(req.body?.endpoint || '')); res.json({ ok: true }); }));
  return push;
}
