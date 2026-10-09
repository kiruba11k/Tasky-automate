// Anonymous "bird post": short messages that any signed-in person can send to one, several or all teammates.
// Recipients never learn who sent a bird (no endpoint returns the sender). A message stays sealed until it is opened and
// then flies away 5 minutes later; unopened birds are dropped after a week. The sender id is stored only for rate limiting.

export const BIRD_TYPES = ['robin', 'bluebird', 'parrot', 'canary', 'pigeon', 'toucan', 'rosie', 'parakeet', 'plum', 'hummingbird', 'puffin', 'cockatiel'];
export const OPEN_TTL_MS = 5 * 60 * 1000;
export const UNOPENED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_TEXT = 280;
export const MAX_RECIPIENTS = 200;
const HOURLY_LIMIT = 60; // birds (recipient deliveries) per sender per hour
const PER_PAIR_UNOPENED = 3; // unopened birds from one sender waiting for one person

/** Deletes birds that have flown away (5 minutes after being opened) and very old unopened ones. */
export async function purgeBirds(store, now) {
  const all = await store.list('BirdMessage');
  let n = 0;
  for (const b of all) {
    const expired = b.opened_at ? now >= b.expires_at : now - new Date(b.created_date).getTime() > UNOPENED_TTL_MS;
    if (expired) { await store.remove('BirdMessage', b.id); n += 1; }
  }
  return n;
}

export function registerBirds(app, { store, notifier, wrap, clock = Date.now }) {
  const sent = new Map(); // senderId -> [timestamps] (per server instance, resets on restart)
  const recent = (id, now) => { const list = (sent.get(id) || []).filter((t) => now - t < 3600000); sent.set(id, list); return list; };

  const timer = setInterval(() => { purgeBirds(store, clock()).catch(() => {}); }, 60000);
  timer.unref?.();

  // Everyone who can receive a bird (a plain list: name and buddy only, never roles, emails or mute settings).
  app.get('/api/birds/recipients', wrap(async (req, res) => {
    const users = (await store.list('User')).filter((u) => u.status !== 'Inactive' && u.id !== req.user.id);
    res.json(users.map((u) => ({ id: u.id, name: u.full_name || u.email, buddy: u.buddy || null, equipped: u.equipped || {} })));
  }));

  app.post('/api/birds', wrap(async (req, res) => {
    const now = clock();
    const { to, text, bird } = req.body || {};
    const msg = typeof text === 'string' ? text.trim() : '';
    if (!msg) return res.status(400).json({ error: 'Write something for the bird to carry' });
    if (msg.length > MAX_TEXT) return res.status(400).json({ error: `Keep it under ${MAX_TEXT} characters` });
    const everyone = (await store.list('User')).filter((u) => u.status !== 'Inactive' && u.id !== req.user.id);
    let targets;
    if (to === 'all') targets = everyone;
    else if (Array.isArray(to) && to.length) {
      const ids = new Set(to.map(String));
      targets = everyone.filter((u) => ids.has(u.id));
      if (!targets.length) return res.status(400).json({ error: 'Pick at least one teammate' });
    } else return res.status(400).json({ error: 'Pick who the bird should visit' });
    if (targets.length > MAX_RECIPIENTS) return res.status(400).json({ error: 'That is too many birds at once' });
    if (!targets.length) return res.status(400).json({ error: 'There is nobody else to send to yet' });
    const mine = recent(req.user.id, now);
    if (mine.length + targets.length > HOURLY_LIMIT) return res.status(429).json({ error: 'The birds need a rest. Try again a little later.' });
    await purgeBirds(store, now);
    const waiting = await store.list('BirdMessage', { query: { from_user_id: req.user.id } });
    const kind = BIRD_TYPES.includes(bird) ? bird : BIRD_TYPES[Math.floor(Math.random() * BIRD_TYPES.length)];
    let delivered = 0;
    for (const u of targets) {
      mine.push(now);
      if (u.birds_muted === true) continue; // silently skipped, so a sender can never tell who muted birds
      if (waiting.filter((b) => b.to_user_id === u.id && !b.opened_at).length >= PER_PAIR_UNOPENED) continue;
      await store.insert('BirdMessage', { to_user_id: u.id, from_user_id: req.user.id, text: msg, bird: kind });
      notifier.signal(u.id, { __bird: true });
      delivered += 1;
    }
    sent.set(req.user.id, mine);
    res.status(201).json({ sent: targets.length });
  }));

  app.get('/api/birds/inbox', wrap(async (req, res) => {
    const now = clock();
    await purgeBirds(store, now);
    const mine = await store.list('BirdMessage', { query: { to_user_id: req.user.id }, sort: 'created_date' });
    res.json(mine.map((b) => ({ id: b.id, bird: b.bird, created_date: b.created_date, opened: Boolean(b.opened_at), expires_at: b.expires_at || null, ...(b.opened_at ? { text: b.text } : {}) })));
  }));

  app.post('/api/birds/:id/open', wrap(async (req, res) => {
    const now = clock();
    const b = await store.get('BirdMessage', req.params.id);
    if (!b || b.to_user_id !== req.user.id) return res.status(404).json({ error: 'That bird has flown away' });
    if (b.opened_at && now >= b.expires_at) { await store.remove('BirdMessage', b.id); return res.status(410).json({ error: 'That bird has flown away' }); }
    let rec = b;
    if (!b.opened_at) rec = await store.update('BirdMessage', b.id, { opened_at: now, expires_at: now + OPEN_TTL_MS });
    res.json({ id: rec.id, bird: rec.bird, text: rec.text, opened_at: rec.opened_at, expires_at: rec.expires_at });
  }));

  app.delete('/api/birds/:id', wrap(async (req, res) => {
    const b = await store.get('BirdMessage', req.params.id);
    if (!b || b.to_user_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
    await store.remove('BirdMessage', b.id);
    res.json({ success: true });
  }));
}
