import { BADGES, STICKERS, badgeStatus, computeStats, pickSticker, questsFor, streakInfo } from './stats.js';
import { addDays } from './weekly.js';

const isManager = (u) => u.role === 'admin' || u.role === 'team_leader';

async function claim(store, userId, key, date, meta) {
  try {
    if ((await store.list('Achievement', { query: { user_id: userId, key } })).length) return false;
    await store.insert('Achievement', { user_id: userId, key, date, meta });
    return true;
  } catch (e) {
    if (e.code === '23505') return false; // lost a race: someone else already claimed it
    throw e;
  }
}

async function gather(store, user, today) {
  const [done, approved, planned, kudosGiven, kudosReceived, achievements, reviews, plans] = await Promise.all([
    store.list('DailyTask', { query: { user_id: user.id, task_status: 'Completed' } }),
    store.list('WeeklyAssignment', { query: { user_id: user.id, status: 'Approved' } }),
    store.list('DailyTask', { query: { user_id: user.id, date: today } }),
    store.list('Kudos', { query: { from_user_id: user.id } }),
    store.list('Kudos', { query: { to_user_id: user.id } }),
    store.list('Achievement', { query: { user_id: user.id } }),
    isManager(user) ? store.list('WeeklyAssignment', { query: { approved_by: user.id } }) : [],
    isManager(user) ? store.list('WeeklyTask', { query: { allocated_by: user.id } }) : [],
  ]);
  return { done, approved, planned, kudosGiven, kudosReceived, achievements, reviews, plans };
}

const dayOf = (iso) => String(iso).slice(0, 10);

function context(user, today, g, claims, streak) {
  return {
    done: g.done,
    plannedToday: g.planned.length,
    doneToday: g.planned.filter((d) => d.task_status === 'Completed').length,
    streak,
    approved: g.approved.length,
    kudosGiven: g.kudosGiven.length,
    kudosReceived: g.kudosReceived.length,
    questsClaimed: [...claims].filter((k) => k.startsWith('quest:')).length,
    stickers: [...claims].filter((k) => k.startsWith('sticker:')).length,
    reviews: g.reviews.length,
    plans: g.plans.length,
    voiceUsed: claims.has('flag:voice'),
  };
}

/** Evaluates quests and badges, records anything newly earned (once), and returns progress for the UI. */
export async function syncProgress(store, user, today) {
  const g = await gather(store, user, today);
  const claims = new Set(g.achievements.map((a) => a.key));
  const streak = streakInfo(g.done.map((d) => d.date), today).streak;
  const role = isManager(user) ? 'leader' : 'member';

  const quests = questsFor({
    role: role === 'leader' ? 'leader' : 'member',
    today,
    done: g.done,
    plannedToday: g.planned.length,
    kudosGivenToday: g.kudosGiven.filter((k) => dayOf(k.created_date) === today).length,
    approvalsToday: g.reviews.filter((r) => dayOf(r.approved_at) === today).length,
  });
  const newQuests = [];
  for (const q of quests) if (q.done && !claims.has(q.key) && (await claim(store, user.id, q.key, today))) { claims.add(q.key); newQuests.push(q.id); }

  const ctx = context(user, today, g, claims, streak);
  const newBadges = [];
  for (const b of badgeStatus(ctx)) {
    if (b.earned && !claims.has(`badge:${b.id}`) && (await claim(store, user.id, `badge:${b.id}`, today))) { claims.add(`badge:${b.id}`); newBadges.push(b.id); }
  }

  const drops = g.achievements.filter((a) => a.key.startsWith('drop:'));
  const stats = computeStats({
    done: g.done, approved: g.approved, planned: g.planned, today,
    claims: [...claims],
    dropNew: drops.filter((d) => d.meta?.is_new).length,
    dropDupes: drops.filter((d) => !d.meta?.is_new).length,
  });
  return {
    ...stats,
    quests: quests.map(({ key, ...q }) => q),
    quests_done: quests.filter((q) => q.done).length,
    drop_available: g.planned.some((d) => d.task_status === 'Completed') && !claims.has(`drop:${today}`),
    drop_state: claims.has(`drop:${today}`) ? 'opened' : g.planned.some((d) => d.task_status === 'Completed') ? 'ready' : 'locked',
    new_quests: newQuests,
    new_badges: newBadges.map((id) => BADGES.find((b) => b.id === id)).map((b) => ({ id: b.id, emoji: b.emoji, name: b.name, desc: b.desc })),
  };
}

export async function trophies(store, user, today) {
  const synced = await syncProgress(store, user, today);
  const g = await gather(store, user, today);
  const claims = new Set(g.achievements.map((a) => a.key));
  const ctx = context(user, today, g, claims, synced.streak);
  const owned = new Set([...claims].filter((k) => k.startsWith('sticker:')).map((k) => k.slice(8)));
  const earnedAt = Object.fromEntries(g.achievements.filter((a) => a.key.startsWith('badge:')).map((a) => [a.key.slice(6), a.date]));
  return {
    badges: badgeStatus(ctx).map((b) => ({ ...b, earned: claims.has(`badge:${b.id}`) || b.earned, earned_on: earnedAt[b.id] })),
    stickers: STICKERS.map((s) => ({ ...s, owned: owned.has(s.id) })),
    drop_available: synced.drop_available,
  };
}

export async function openDailyDrop(store, user, today, rng) {
  const g = await gather(store, user, today);
  if (!g.planned.some((d) => d.task_status === 'Completed')) return { error: 'Finish a task today to unlock your chest!', status: 409 };
  const claims = new Set(g.achievements.map((a) => a.key));
  if (claims.has(`drop:${today}`)) return { error: 'You already opened today\'s chest. Come back tomorrow!', status: 409 };
  const sticker = pickSticker(rng);
  const isNew = !claims.has(`sticker:${sticker.id}`);
  if (!(await claim(store, user.id, `drop:${today}`, today, { sticker: sticker.id, is_new: isNew }))) return { error: 'You already opened today\'s chest.', status: 409 };
  if (isNew) await claim(store, user.id, `sticker:${sticker.id}`, today);
  return { sticker, is_new: isNew, xp: isNew ? 10 : 5 };
}

export async function teamPulse(store, today, weekStart, users) {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const days = await Promise.all(dates.map((d) => store.list('DailyTask', { query: { date: d } })));
  const week = days.flat();
  const planned = week.length;
  const doneN = week.filter((d) => d.task_status === 'Completed').length;
  const name = Object.fromEntries(users.map((u) => [u.id, u.full_name]));
  const active = users.filter((u) => u.status !== 'Inactive');
  const todayDone = new Set((days[dates.indexOf(today)] || []).filter((d) => d.task_status === 'Completed').map((d) => d.user_id));

  const [recentDone, recentAch, recentKudos] = await Promise.all([
    store.list('DailyTask', { query: { task_status: 'Completed' }, sort: '-updated_date', limit: 40 }),
    store.list('Achievement', { sort: '-created_date', limit: 40 }),
    store.list('Kudos', { sort: '-created_date', limit: 20 }),
  ]);
  const wins = [];
  // Several tasks finished together (e.g. a submitted weekly task) collapse into one line.
  const grouped = new Map();
  for (const t of recentDone) {
    const key = `${t.user_id}|${String(t.updated_date).slice(0, 15)}`;
    if (!grouped.has(key)) grouped.set(key, { user_id: t.user_id, at: t.updated_date, tasks: [] });
    grouped.get(key).tasks.push(t.task);
  }
  for (const g of grouped.values()) {
    wins.push({ type: 'done', user_id: g.user_id, name: name[g.user_id], at: g.at, text: g.tasks.length > 1 ? `finished ${g.tasks.length} tasks` : `finished “${g.tasks[0]}”` });
  }
  for (const a of recentAch.filter((x) => x.key.startsWith('badge:'))) {
    const b = BADGES.find((x) => x.id === a.key.slice(6));
    if (b) wins.push({ type: 'badge', user_id: a.user_id, name: name[a.user_id], at: a.created_date, text: `earned the ${b.emoji} ${b.name} badge` });
  }
  for (const k of recentKudos) wins.push({ type: 'kudos', user_id: k.from_user_id, name: name[k.from_user_id], at: k.created_date, text: `sent ${name[k.to_user_id] || 'a teammate'} a ${k.emoji}${k.message ? ` “${k.message}”` : ''}`, to_user_id: k.to_user_id });
  wins.sort((a, b) => String(b.at).localeCompare(String(a.at)));

  return {
    week: { planned, done: doneN, pct: planned ? Math.round((doneN / planned) * 100) : 0 },
    today: { active_members: todayDone.size, members: active.length },
    wins: wins.filter((w) => w.name).slice(0, 12),
  };
}
