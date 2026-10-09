// Team-spirit features: boss battle, celebrations, mood weather, shout-outs, coffee roulette, daily word and trivia,
// guess-the-colleague, weekly recap, daily wheel, standups, retro notes and the idea box.
// Everything here is positive and opt-in. Nothing ranks individuals. Private data (who voted, who wrote a retro note,
// anonymous ideas, individual moods) is stored with a user id for rules like "one vote each" but is never returned.
import crypto from 'node:crypto';
import { addDays } from './weekly.js';
import { parade } from './buddies.js';
import { STICKERS, pickSticker, streakInfo } from './stats.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const hash = (s) => parseInt(crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 8), 16);
const mondayOf = (iso) => { const d = new Date(`${iso}T00:00:00Z`).getUTCDay(); return addDays(iso, -((d + 6) % 7)); };
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const BOSSES = [
  { id: 'backlog', name: 'Grumble the Backlog Beast', tagline: 'He feeds on unfinished to-dos.' },
  { id: 'procrasti', name: 'Sir Procrasti-Nate', tagline: 'Always says "tomorrow".' },
  { id: 'meeting', name: 'The Meeting Monster', tagline: 'Could have been an email.' },
  { id: 'deadline', name: 'Captain Deadline', tagline: 'Sails in on Friday afternoon.' },
  { id: 'hydra', name: 'The Email Hydra', tagline: 'Answer one, two more appear.' },
  { id: 'bug', name: 'The Bug Dragon', tagline: 'Breathes tiny annoying fires.' },
  { id: 'gremlin', name: 'Context-Switch Gremlin', tagline: 'Loves a good interruption.' },
  { id: 'kraken', name: 'The Scope Creep Kraken', tagline: 'Just one more tentacle...' },
];
const WORDS = ('about above actor adopt after again agent agree ahead alarm album alert alike alive allow alone along amaze angel angle ankle apple apply arena argue arise armor aside asset audio avoid awake award aware bacon badge baker basic beach beard begin being below bench berry black blade blame blank blast blend bless blind block bloom board boast bonus boost brain brave bread break brick bride brief bring broad brown brush build bunch cabin cable candy carry catch cause chain chair charm chart chase cheap check cheer chess chief child chill choir civil claim clean clear clerk click cliff climb clock close cloud coach coast color coral count court cover craft crane crazy cream crown crush curve daily dance dairy delay depth dream dress drift drink drive eager early earth eight elite empty enjoy enter equal error event every exact extra faith fancy feast fence fiber field fifty fight final first flame flash fleet float flock floor flour focus force frame fresh front fruit funny giant glass globe glory grace grade grain grand grape graph grass great green greet group guard guess guest guide habit happy heart heavy honey horse hotel house human humor ideal image index inner input issue jelly jewel joint judge juice knife known label large laugh layer learn leave lemon level light limit linen local logic lucky lunch magic major maple march match maybe mayor media melon mercy metal might minor model money month moral motor mount mouse movie music nanny nerve never night noble noise north novel nurse ocean offer olive onion opera orbit order other outer owner paint panda panel paper party pasta patch pause peace pearl phase phone photo piano pilot pitch pizza place plain plane plant plate plaza point polar pound power press price pride prime print prize proof proud pulse queen quest quick quiet quilt quote radio raise range rapid ratio reach ready relax reply rhyme rider river robot rocky round route royal rural salad sauce scale scene scope score sense serve seven shade shape share sharp sheep shelf shine shirt shore short shout sight silly skill sleep slice small smart smile smoke snack solar solid sound south space spare speak speed spice spoon sport squad stack staff stage stamp stand star start state steam steel stick stone store storm story study style sugar sunny super sweet swift table taste teach tempo thank theme thing think three tiger toast today token topic total touch tower trace track trade trail train treat trend trial trick truck trust truth twice uncle union unity upper urban usual valid value video vivid voice waste watch water wheel white whole wheat world worth young youth zebra').split(' ').filter((w) => w.length === 5);
const TRIVIA = [
  ['Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 1], ['How many continents are there?', ['Five', 'Six', 'Seven', 'Eight'], 2],
  ['What is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3], ['Which animal is the fastest on land?', ['Cheetah', 'Horse', 'Lion', 'Greyhound'], 0],
  ['How many hours are in a week?', ['148', '168', '188', '208'], 1], ['What do bees make?', ['Silk', 'Wax only', 'Honey', 'Milk'], 2],
  ['Which is the tallest animal?', ['Elephant', 'Giraffe', 'Camel', 'Ostrich'], 1], ['What is H2O commonly called?', ['Salt', 'Oxygen', 'Water', 'Hydrogen'], 2],
  ['How many legs does a spider have?', ['Six', 'Eight', 'Ten', 'Twelve'], 1], ['Which country gave us pizza?', ['France', 'Spain', 'Greece', 'Italy'], 3],
  ['What is the capital of Japan?', ['Osaka', 'Kyoto', 'Tokyo', 'Nagoya'], 2], ['Which bird cannot fly?', ['Penguin', 'Owl', 'Parrot', 'Eagle'], 0],
  ['How many minutes are in a day?', ['1,240', '1,340', '1,440', '1,540'], 2], ['Which instrument has 88 keys?', ['Guitar', 'Piano', 'Violin', 'Flute'], 1],
  ['What is the largest mammal?', ['Blue whale', 'Elephant', 'Giraffe', 'Hippo'], 0], ['Which gas do plants absorb?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 2],
  ['How many sides does a hexagon have?', ['Five', 'Six', 'Seven', 'Eight'], 1], ['What colour do you get mixing blue and yellow?', ['Green', 'Purple', 'Orange', 'Brown'], 0],
  ['Which month has the fewest days?', ['January', 'February', 'April', 'June'], 1], ['What is the hardest natural substance?', ['Gold', 'Iron', 'Diamond', 'Quartz'], 2],
  ['Which planet has rings most famously?', ['Saturn', 'Mars', 'Earth', 'Neptune'], 0], ['What is a baby kangaroo called?', ['Cub', 'Joey', 'Pup', 'Kit'], 1],
  ['How many strings does a standard guitar have?', ['Four', 'Five', 'Six', 'Eight'], 2], ['Which fruit is dried to make raisins?', ['Plums', 'Figs', 'Dates', 'Grapes'], 3],
  ['What is the opposite of "vertical"?', ['Diagonal', 'Horizontal', 'Circular', 'Parallel'], 1], ['Which season comes after summer?', ['Spring', 'Winter', 'Autumn', 'Monsoon'], 2],
  ['How many days are in a leap year?', ['364', '365', '366', '367'], 2], ['Which sense does a nose provide?', ['Sight', 'Smell', 'Taste', 'Hearing'], 1],
  ['What is the largest planet in our solar system?', ['Saturn', 'Jupiter', 'Neptune', 'Earth'], 1], ['What do you call a group of crows?', ['A murder', 'A flock', 'A pack', 'A herd'], 0],
];
const WHEEL = ['sticker', 'confetti', 'rare', 'sticker', 'egg', 'confetti', 'epic', 'rare'];

export function registerSocial(app, { store, notifier, wrap, clock = Date.now, secret = 'dev' }) {
  const serverDay = () => new Date(clock()).toISOString().slice(0, 10);
  const nearToday = (d) => DAY.test(d || '') && Math.abs((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${serverDay()}T00:00:00Z`)) / 86400000) <= 1;
  const dayOf = (req) => (nearToday(req.query.today || req.body?.today) ? (req.query.today || req.body.today) : serverDay());
  const active = async () => (await store.list('User')).filter((u) => u.status !== 'Inactive');
  const nameMap = async () => Object.fromEntries((await store.list('User')).map((u) => [u.id, u.full_name || u.email]));
  const claimOnce = async (userId, key, date, meta) => {
    if ((await store.list('Achievement', { query: { user_id: userId, key } })).length) return false;
    try { await store.insert('Achievement', { user_id: userId, key, date, meta }); return true; } catch (e) { if (e.code === '23505') return false; throw e; }
  };
  const hmac = (s) => crypto.createHmac('sha256', secret).update(s).digest('hex').slice(0, 32);

  // ---------- boss battle: the whole team's finished tasks hurt this week's boss ----------
  async function bossState(req, today) {
    const ws = DAY.test(req.query.week_start || '') ? req.query.week_start : mondayOf(today);
    const rows = await parade(store, today, ws);
    const planned = rows.reduce((n, r) => n + r.planned, 0); const done = rows.reduce((n, r) => n + r.done, 0);
    const hpMax = Math.max(5, planned);
    const week = Math.floor(Date.parse(`${ws}T00:00:00Z`) / (7 * 86400000));
    const boss = BOSSES[week % BOSSES.length];
    return { ws, boss, hp_max: hpMax, hp_left: Math.max(0, hpMax - done), defeated: done >= hpMax };
  }
  app.get('/api/team/boss', wrap(async (req, res) => {
    const s = await bossState(req, dayOf(req));
    const claimed = (await store.list('Achievement', { query: { user_id: req.user.id, key: `boss:${s.ws}` } })).length > 0;
    res.json({ week_start: s.ws, boss: s.boss, hp_max: s.hp_max, hp_left: s.hp_left, defeated: s.defeated, claimed });
  }));
  app.post('/api/me/boss-claim', wrap(async (req, res) => {
    const s = await bossState(req, dayOf(req));
    if (!s.defeated) return res.status(409).json({ error: 'The boss is still standing. Keep going!' });
    const ok = await claimOnce(req.user.id, `boss:${s.ws}`, dayOf(req));
    if (!ok) return res.status(409).json({ error: 'You already claimed this week\'s reward.' });
    res.json({ reward: 'egg', boss: s.boss.name });
  }));

  // ---------- celebrations: birthdays and work anniversaries ----------
  app.get('/api/team/celebrations', wrap(async (req, res) => {
    const today = dayOf(req); const year = Number(today.slice(0, 4));
    const out = [];
    for (const u of await active()) {
      const check = (iso, kind) => {
        if (!iso) return;
        const md = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.slice(5) : /^\d{2}-\d{2}$/.test(iso) ? iso : null; if (!md) return;
        const next = `${year}-${md}`; let t = next < today ? `${year + 1}-${md}` : next;
        const days = Math.round((Date.parse(`${t}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
        if (days > 7) return;
        const years = kind === 'anniversary' && /^\d{4}/.test(iso) ? Number(t.slice(0, 4)) - Number(iso.slice(0, 4)) : undefined;
        if (kind === 'anniversary' && (!years || years < 1)) return;
        out.push({ id: u.id, name: u.full_name || u.email, kind, years, date: md, days_until: days, buddy: u.buddy || null, equipped: u.equipped || {} });
      };
      check(u.birthday, 'birthday'); check(u.hire_date, 'anniversary');
    }
    res.json(out.sort((a, b) => a.days_until - b.days_until));
  }));

  // ---------- mood weather: one tap a day; only combined weather is ever shown, and only once 3+ people have answered ----------
  const MOODS = ['sunny', 'partly', 'cloudy', 'rainy', 'stormy'];
  app.post('/api/mood', wrap(async (req, res) => {
    const mood = req.body?.mood; const today = dayOf(req);
    if (!MOODS.includes(mood)) return res.status(400).json({ error: 'Pick one of the weather icons' });
    const mine = (await store.list('Mood', { query: { user_id: req.user.id, date: today } }))[0];
    if (mine) await store.update('Mood', mine.id, { mood }); else await store.insert('Mood', { user_id: req.user.id, date: today, mood });
    res.status(201).json({ mood });
  }));
  app.get('/api/team/mood', wrap(async (req, res) => {
    const today = dayOf(req);
    const days = Array.from({ length: 5 }, (_, i) => addDays(today, i - 4));
    const all = (await Promise.all(days.map((d) => store.list('Mood', { query: { date: d } })))).flat();
    const score = { sunny: 4, partly: 3, cloudy: 2, rainy: 1, stormy: 0 };
    const week = days.map((d) => { const m = all.filter((x) => x.date === d); return { date: d, total: m.length, avg: m.length >= 3 ? Math.round((m.reduce((n, x) => n + score[x.mood], 0) / m.length) * 10) / 10 : null }; });
    const t = all.filter((x) => x.date === today);
    const counts = Object.fromEntries(MOODS.map((k) => [k, t.filter((x) => x.mood === k).length]));
    res.json({ today: { total: t.length, visible: t.length >= 3, counts: t.length >= 3 ? counts : null }, week, mine: t.find((x) => x.user_id === req.user.id)?.mood || null });
  }));

  // ---------- shout-outs: public thank-yous ----------
  app.get('/api/shoutouts', wrap(async (req, res) => {
    const names = await nameMap();
    const list = await store.list('ShoutOut', { sort: '-created_date', limit: 40 });
    const weekAgo = Date.now() - 7 * 86400000;
    const all = await store.list('ShoutOut');
    res.json({ week_count: all.filter((s) => new Date(s.created_date).getTime() > weekAgo).length, items: list.map((s) => ({ id: s.id, from: names[s.from_user_id] || 'Someone', to: names[s.to_user_id] || 'a teammate', text: s.text, created_date: s.created_date, mine: s.from_user_id === req.user.id })) });
  }));
  app.post('/api/shoutouts', wrap(async (req, res) => {
    const text = clean(req.body?.text, 140); const target = req.body?.to_user_id && await store.get('User', req.body.to_user_id);
    if (!target || target.status === 'Inactive') return res.status(404).json({ error: 'Teammate not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Shout-outs are for your teammates. Save the praise for them!' });
    if (!text) return res.status(400).json({ error: 'Say what you appreciate' });
    const todayN = (await store.list('ShoutOut', { query: { from_user_id: req.user.id } })).filter((s) => String(s.created_date).slice(0, 10) === serverDay()).length;
    if (todayN >= 15) return res.status(429).json({ error: 'That is plenty of appreciation for today!' });
    const rec = await store.insert('ShoutOut', { from_user_id: req.user.id, to_user_id: target.id, text });
    const by = req.user.full_name || req.user.email;
    await notifier.notify(target.id, { type: 'shoutout', title: `${by} gave you a shout-out`, message: text, actor_name: by, link: '/Hub' }).catch(() => {});
    res.status(201).json({ id: rec.id });
  }));
  app.delete('/api/shoutouts/:id', wrap(async (req, res) => {
    const s = await store.get('ShoutOut', req.params.id);
    if (!s || s.from_user_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
    await store.remove('ShoutOut', s.id); res.json({ success: true });
  }));

  // ---------- coffee roulette: opt in for the week and get paired with someone you do not usually chat with ----------
  const coffeeRows = async (ws) => (await store.list('CoffeeEntry', { query: { week_start: ws } }));
  app.get('/api/coffee', wrap(async (req, res) => {
    const ws = DAY.test(req.query.week_start || '') ? req.query.week_start : mondayOf(dayOf(req));
    const entries = await coffeeRows(ws);
    const names = await nameMap(); const users = Object.fromEntries((await store.list('User')).map((u) => [u.id, u]));
    const ids = entries.map((e) => e.user_id).sort((a, b) => hash(`${ws}${a}`) - hash(`${ws}${b}`));
    const groups = []; for (let i = 0; i < ids.length; i += 2) groups.push(ids.slice(i, i + 2));
    if (groups.length > 1 && groups[groups.length - 1].length === 1) groups[groups.length - 2].push(groups.pop()[0]);
    const mine = groups.find((g) => g.includes(req.user.id));
    res.json({ week_start: ws, joined: ids.includes(req.user.id), pool: ids.length, match: mine && mine.length > 1 ? mine.filter((i) => i !== req.user.id).map((i) => ({ id: i, name: names[i], buddy: users[i]?.buddy || null, equipped: users[i]?.equipped || {} })) : null });
  }));
  app.post('/api/coffee', wrap(async (req, res) => {
    const ws = DAY.test(req.body?.week_start || '') ? req.body.week_start : mondayOf(dayOf(req));
    const mine = (await coffeeRows(ws)).find((e) => e.user_id === req.user.id);
    if (req.body?.leave) { if (mine) await store.remove('CoffeeEntry', mine.id); return res.json({ joined: false }); }
    if (!mine) await store.insert('CoffeeEntry', { user_id: req.user.id, week_start: ws });
    res.status(201).json({ joined: true });
  }));

  // ---------- daily word (five letters, six tries) ----------
  const todaysWord = (d) => WORDS[hash(`word-${d}`) % WORDS.length];
  const marks = (guess, answer) => {
    const m = Array(5).fill('b'); const left = answer.split('');
    for (let i = 0; i < 5; i += 1) if (guess[i] === answer[i]) { m[i] = 'g'; left[i] = null; }
    for (let i = 0; i < 5; i += 1) if (m[i] === 'b') { const k = left.indexOf(guess[i]); if (k >= 0) { m[i] = 'y'; left[k] = null; } }
    return m.join('');
  };
  const wordState = async (userId, d) => {
    const g = (await store.list('WordGame', { query: { user_id: userId, date: d } }))[0];
    const answer = todaysWord(d);
    const teamSolved = (await store.list('WordGame', { query: { date: d } })).filter((x) => x.solved).length;
    return { rec: g, state: { guesses: g?.guesses || [], solved: Boolean(g?.solved), done: Boolean(g?.done), tries_left: 6 - (g?.guesses?.length || 0), answer: g?.done ? answer : undefined, team_solved: teamSolved } };
  };
  app.get('/api/word/today', wrap(async (req, res) => res.json((await wordState(req.user.id, dayOf(req))).state)));
  app.post('/api/word/guess', wrap(async (req, res) => {
    const d = dayOf(req); const word = String(req.body?.word || '').toLowerCase();
    if (!/^[a-z]{5}$/.test(word)) return res.status(400).json({ error: 'Type a five-letter word' });
    let { rec } = await wordState(req.user.id, d);
    if (rec?.done) return res.status(409).json({ error: 'You have finished today\'s word. Come back tomorrow!' });
    const m = marks(word, todaysWord(d));
    const guesses = [...(rec?.guesses || []), { word, marks: m }];
    const solved = m === 'ggggg'; const done = solved || guesses.length >= 6;
    if (rec) await store.update('WordGame', rec.id, { guesses, solved, done }); else await store.insert('WordGame', { user_id: req.user.id, date: d, guesses, solved, done });
    res.json((await wordState(req.user.id, d)).state);
  }));

  // ---------- guess the colleague ----------
  app.get('/api/guess/round', wrap(async (req, res) => {
    const users = await active();
    const pool = users.filter((u) => u.fun_fact && u.id !== req.user.id);
    if (!pool.length || users.length < 3) return res.json({ available: false });
    const target = pool[Math.floor(Math.random() * pool.length)];
    const others = users.filter((u) => u.id !== target.id && u.id !== req.user.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [target, ...others].sort(() => Math.random() - 0.5).map((u) => ({ id: u.id, name: u.full_name || u.email }));
    const nonce = crypto.randomBytes(8).toString('hex');
    res.json({ available: true, fact: target.fun_fact, options, token: `${nonce}.${hmac(`${nonce}.${target.id}`)}` });
  }));
  app.post('/api/guess/answer', wrap(async (req, res) => {
    const { token, choice, options } = req.body || {};
    const [nonce, sig] = String(token || '').split('.');
    if (!nonce || !sig || !Array.isArray(options)) return res.status(400).json({ error: 'Start a new round' });
    const correctId = options.find((o) => hmac(`${nonce}.${o}`) === sig);
    if (!correctId) return res.status(400).json({ error: 'Start a new round' });
    const names = await nameMap();
    res.json({ correct: choice === correctId, answer: names[correctId] });
  }));

  // ---------- daily trivia ----------
  const triviaOf = (d) => TRIVIA[hash(`trivia-${d}`) % TRIVIA.length];
  app.get('/api/trivia/today', wrap(async (req, res) => {
    const d = dayOf(req); const [q, options, a] = triviaOf(d);
    const mine = (await store.list('Achievement', { query: { user_id: req.user.id, key: `trivia:${d}` } }))[0];
    res.json({ question: q, options, answered: Boolean(mine), choice: mine?.meta?.choice, correct_index: mine ? a : undefined });
  }));
  app.post('/api/trivia/answer', wrap(async (req, res) => {
    const d = dayOf(req); const [, options, a] = triviaOf(d); const choice = Number(req.body?.choice);
    if (!Number.isInteger(choice) || choice < 0 || choice >= options.length) return res.status(400).json({ error: 'Pick an answer' });
    const ok = await claimOnce(req.user.id, `trivia:${d}`, d, { choice, correct: choice === a });
    if (!ok) return res.status(409).json({ error: 'You already answered today\'s question.' });
    res.json({ correct: choice === a, correct_index: a });
  }));

  // ---------- your week, wrapped ----------
  app.get('/api/me/wrapped', wrap(async (req, res) => {
    const today = dayOf(req); const ws = DAY.test(req.query.week_start || '') ? req.query.week_start : mondayOf(today);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const mine = (await Promise.all(dates.map((d) => store.list('DailyTask', { query: { date: d, user_id: req.user.id } })))).flat();
    const done = mine.filter((t) => t.task_status === 'Completed');
    const hours = Math.round(done.reduce((n, t) => n + (t.actual_time_taken || t.expected_time || 0), 0) * 10) / 10;
    const byProject = {}; for (const t of done) if (t.project_id) byProject[t.project_id] = (byProject[t.project_id] || 0) + 1;
    const topId = Object.entries(byProject).sort((a, b) => b[1] - a[1])[0]?.[0];
    const project = topId ? (await store.get('Project', topId))?.name : null;
    const byDay = {}; for (const t of done) byDay[t.date] = (byDay[t.date] || 0) + 1;
    const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const allDone = await store.list('DailyTask', { query: { user_id: req.user.id, task_status: 'Completed' } });
    const kudos = (await store.list('Kudos', { query: { to_user_id: req.user.id } })).filter((k) => dates.includes(String(k.created_date).slice(0, 10))).length;
    const shout = (await store.list('ShoutOut', { query: { to_user_id: req.user.id } })).filter((k) => dates.includes(String(k.created_date).slice(0, 10))).length;
    const title = mine.length && done.length >= mine.length ? 'The Closer' : hours >= 25 ? 'The Marathoner' : done.length >= 10 ? 'The Machine' : kudos + shout >= 3 ? 'The Team Favourite' : done.length ? 'The Steady Climber' : 'The Rested Hero';
    res.json({ week_start: ws, done: done.length, planned: mine.length, hours, project, best_day: best ? { weekday: weekdays[new Date(`${best[0]}T00:00:00Z`).getUTCDay()], count: best[1] } : null, streak: streakInfo(allDone.map((t) => t.date), today).streak, kudos, shoutouts: shout, title });
  }));

  // ---------- daily wheel: unlocked by finishing a task today ----------
  app.get('/api/me/wheel', wrap(async (req, res) => {
    const d = dayOf(req);
    const doneToday = (await store.list('DailyTask', { query: { user_id: req.user.id, date: d, task_status: 'Completed' } })).length > 0;
    const mine = (await store.list('Achievement', { query: { user_id: req.user.id, key: `wheel:${d}` } }))[0];
    res.json({ segments: WHEEL, available: doneToday && !mine, claimed: Boolean(mine), prize: mine?.meta || null });
  }));
  app.post('/api/me/wheel', wrap(async (req, res) => {
    const d = dayOf(req);
    if (!(await store.list('DailyTask', { query: { user_id: req.user.id, date: d, task_status: 'Completed' } })).length) return res.status(409).json({ error: 'Finish a task today to unlock the wheel!' });
    const roll = Math.random(); const kind = roll < 0.4 ? 'sticker' : roll < 0.62 ? 'rare' : roll < 0.68 ? 'epic' : roll < 0.78 ? 'egg' : 'confetti';
    const wedges = WHEEL.map((k, i) => (k === kind ? i : -1)).filter((i) => i >= 0);
    const segment = wedges[Math.floor(Math.random() * wedges.length)];
    let prize = { kind, segment };
    if (kind === 'sticker' || kind === 'rare' || kind === 'epic') {
      const rarity = { sticker: 'common', rare: 'rare', epic: 'epic' }[kind]; const pool = STICKERS.filter((s) => s.rarity === rarity);
      const st = pool[Math.floor(Math.random() * pool.length)] || pickSticker();
      const isNew = await claimOnce(req.user.id, `sticker:${st.id}`, d); prize = { ...prize, sticker: st, is_new: isNew };
    } else if (kind === 'egg') await claimOnce(req.user.id, `bonus_egg:${d}`, d);
    if (!(await claimOnce(req.user.id, `wheel:${d}`, d, prize))) return res.status(409).json({ error: 'You already spun today.' });
    res.json(prize);
  }));

  // ---------- standups: three lines, delivered to the team ----------
  app.post('/api/standups', wrap(async (req, res) => {
    const d = dayOf(req); const y = clean(req.body?.yesterday, 300); const t = clean(req.body?.today, 300); const b = clean(req.body?.blockers, 300);
    if (!y && !t && !b) return res.status(400).json({ error: 'Add at least one line' });
    const mine = (await store.list('Standup', { query: { user_id: req.user.id, date: d } }))[0];
    if (mine) await store.update('Standup', mine.id, { yesterday: y, today: t, blockers: b }); else await store.insert('Standup', { user_id: req.user.id, date: d, yesterday: y, today: t, blockers: b });
    res.status(201).json({ ok: true });
  }));
  app.get('/api/standups', wrap(async (req, res) => {
    const d = dayOf(req); const users = Object.fromEntries((await store.list('User')).map((u) => [u.id, u]));
    const list = await store.list('Standup', { query: { date: d }, sort: 'created_date' });
    res.json(list.map((s) => ({ id: s.id, name: users[s.user_id]?.full_name || 'Someone', buddy: users[s.user_id]?.buddy || null, equipped: users[s.user_id]?.equipped || {}, yesterday: s.yesterday, today: s.today, blockers: s.blockers, mine: s.user_id === req.user.id })));
  }));

  // ---------- retro board (author hidden) and idea box (author optional); votes are hearts and birds ----------
  const COLUMNS = ['well', 'improve', 'thanks'];
  const view = (n, me) => ({ id: n.id, text: n.text, votes: (n.voters || []).length, voted: (n.voters || []).includes(me), mine: n.user_id === me });
  app.get('/api/retro', wrap(async (req, res) => {
    const ws = DAY.test(req.query.week_start || '') ? req.query.week_start : mondayOf(dayOf(req));
    const notes = await store.list('RetroNote', { query: { week_start: ws }, sort: 'created_date' });
    res.json({ week_start: ws, columns: Object.fromEntries(COLUMNS.map((c) => [c, notes.filter((n) => n.column === c).map((n) => view(n, req.user.id))])) });
  }));
  app.post('/api/retro', wrap(async (req, res) => {
    const text = clean(req.body?.text, 200); const column = req.body?.column; const ws = DAY.test(req.body?.week_start || '') ? req.body.week_start : mondayOf(dayOf(req));
    if (!COLUMNS.includes(column) || !text) return res.status(400).json({ error: 'Write a note and pick a column' });
    const n = await store.insert('RetroNote', { user_id: req.user.id, week_start: ws, column, text, voters: [] });
    res.status(201).json(view(n, req.user.id));
  }));
  app.post('/api/retro/:id/vote', wrap(async (req, res) => {
    const n = await store.get('RetroNote', req.params.id); if (!n) return res.status(404).json({ error: 'Not found' });
    const v = new Set(n.voters || []); if (v.has(req.user.id)) v.delete(req.user.id); else v.add(req.user.id);
    res.json(view(await store.update('RetroNote', n.id, { voters: [...v] }), req.user.id));
  }));
  app.delete('/api/retro/:id', wrap(async (req, res) => {
    const n = await store.get('RetroNote', req.params.id); if (!n || n.user_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
    await store.remove('RetroNote', n.id); res.json({ success: true });
  }));
  app.get('/api/ideas', wrap(async (req, res) => {
    const names = await nameMap(); const list = await store.list('Idea');
    res.json(list.map((i) => ({ ...view(i, req.user.id), title: i.title, author: i.anonymous ? null : names[i.user_id], created_date: i.created_date })).sort((a, b) => b.votes - a.votes || String(b.created_date).localeCompare(String(a.created_date))).slice(0, 60));
  }));
  app.post('/api/ideas', wrap(async (req, res) => {
    const title = clean(req.body?.title, 80); const text = clean(req.body?.text, 400);
    if (!title) return res.status(400).json({ error: 'Give your idea a title' });
    const i = await store.insert('Idea', { user_id: req.user.id, title, text, anonymous: req.body?.anonymous !== false, voters: [req.user.id] });
    res.status(201).json({ id: i.id });
  }));
  app.post('/api/ideas/:id/boost', wrap(async (req, res) => {
    const i = await store.get('Idea', req.params.id); if (!i) return res.status(404).json({ error: 'Not found' });
    const v = new Set(i.voters || []); if (v.has(req.user.id)) v.delete(req.user.id); else v.add(req.user.id);
    const rec = await store.update('Idea', i.id, { voters: [...v] });
    res.json({ ...view(rec, req.user.id), title: rec.title });
  }));
  app.delete('/api/ideas/:id', wrap(async (req, res) => {
    const i = await store.get('Idea', req.params.id); if (!i || i.user_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
    await store.remove('Idea', i.id); res.json({ success: true });
  }));
}
