import { addDays } from './weekly.js';

export const XP_PER_DAILY_TASK = 10;
export const XP_PER_APPROVED_WEEKLY = 40;
export const XP_PER_QUEST = 15;
export const XP_PER_BADGE = 25;
export const XP_NEW_STICKER = 10;
export const XP_DUPE_STICKER = 5;

export const LEVEL_TITLES = [
  'Task Hatchling', 'Checklist Cadet', 'Deadline Dodger', 'Sprint Sidekick', 'Productivity Ninja',
  'Workflow Wizard', 'Hustle Hero', 'Sprint Legend', 'Grand Task Master', 'Cosmic Closer',
];

/** XP needed to reach level L (L >= 1): 0, 50, 150, 300, 500, 750, ... */
export const xpForLevel = (level) => 25 * level * (level - 1);
export const levelForXp = (xp) => Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 6.25)) / 2));

export const isWorkday = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d !== 0 && d !== 6;
};

/**
 * Streak of working days with at least one finished task. Designed to be forgiving, because broken streaks demotivate:
 * weekends never count for or against you, and every 5 days of streak earns a shield (max 2) that silently covers one missed workday.
 */
export function streakInfo(doneDates, today) {
  const done = new Set(doneDates);
  const first = [...done].sort()[0];
  const out = { streak: 0, shields: 0, shield_used: false, at_risk: false };
  if (!first) return out;
  let streak = 0;
  let shields = 0;
  let lastShieldDay = null;
  for (let d = first; d <= today; d = addDays(d, 1)) {
    if (!isWorkday(d)) continue;
    if (done.has(d)) {
      streak += 1;
      if (streak % 5 === 0) shields = Math.min(2, shields + 1);
    } else if (d === today) {
      /* today is still open: it neither counts nor breaks */
    } else if (shields > 0) {
      shields -= 1;
      lastShieldDay = d;
    } else {
      streak = 0;
    }
  }
  out.streak = streak;
  out.shields = shields;
  out.shield_used = lastShieldDay !== null && addDays(lastShieldDay, 7) >= today;
  out.at_risk = streak > 0 && isWorkday(today) && !done.has(today);
  return out;
}

// ---- daily quests (derived from real work; the XP is claimed once per day) ----
export function questsFor({ role, today, done, plannedToday, kudosGivenToday, approvalsToday }) {
  const doneToday = done.filter((d) => d.date === today);
  const finishTarget = Math.min(3, Math.max(1, plannedToday));
  const quests = [
    { id: 'finish', emoji: '🎯', title: `Finish ${finishTarget} task${finishTarget === 1 ? '' : 's'}`, progress: doneToday.length, target: finishTarget },
    role === 'member'
      ? { id: 'track', emoji: '⏱️', title: 'Log the time on a finished task', progress: doneToday.filter((d) => d.actual_time_taken > 0).length, target: 1 }
      : { id: 'review', emoji: '🧐', title: 'Approve a teammate\'s submission', progress: approvalsToday, target: 1 },
    { id: 'kudos', emoji: '🙌', title: 'Send a high-five to a teammate', progress: kudosGivenToday, target: 1 },
  ];
  return quests.map((q) => ({ ...q, progress: Math.min(q.progress, q.target), done: q.progress >= q.target, xp: XP_PER_QUEST, key: `quest:${today}:${q.id}` }));
}

// ---- badges (collectible; each one needs real work, never just opening the app) ----
const maxPerDay = (done) => Object.values(done.reduce((m, d) => ({ ...m, [d.date]: (m[d.date] || 0) + 1 }), {})).reduce((a, b) => Math.max(a, b), 0);
export const BADGES = [
  { id: 'first_win', emoji: '🥇', name: 'First Win', desc: 'Finish your first task', progress: (c) => [c.done.length, 1] },
  { id: 'ten_down', emoji: '🔟', name: 'Ten Down', desc: 'Finish 10 tasks', progress: (c) => [c.done.length, 10] },
  { id: 'century', emoji: '💯', name: 'Century', desc: 'Finish 100 tasks', progress: (c) => [c.done.length, 100] },
  { id: 'hat_trick', emoji: '🎩', name: 'Hat-trick', desc: 'Finish 3 tasks in one day', progress: (c) => [maxPerDay(c.done), 3] },
  { id: 'perfect_day', emoji: '🌈', name: 'Perfect Day', desc: 'Finish every task planned for today (at least 3)', progress: (c) => [c.plannedToday >= 3 ? c.doneToday : 0, Math.max(3, c.plannedToday)] },
  { id: 'streak_3', emoji: '🔥', name: 'On Fire', desc: '3 working days in a row', progress: (c) => [c.streak, 3] },
  { id: 'streak_7', emoji: '⚡', name: 'Unstoppable', desc: '7 working days in a row', progress: (c) => [c.streak, 7] },
  { id: 'streak_30', emoji: '🌋', name: 'Volcano', desc: '30 working days in a row', progress: (c) => [c.streak, 30] },
  { id: 'approved_first', emoji: '🏆', name: 'Approved!', desc: 'Get a weekly task approved', progress: (c) => [c.approved, 1] },
  { id: 'gold_standard', emoji: '🥂', name: 'Gold Standard', desc: 'Get 10 weekly tasks approved', progress: (c) => [c.approved, 10] },
  { id: 'timekeeper', emoji: '⏱️', name: 'Timekeeper', desc: 'Log the time on 10 tasks', progress: (c) => [c.done.filter((d) => d.actual_time_taken > 0).length, 10] },
  { id: 'sharpshooter', emoji: '🎯', name: 'Sharpshooter', desc: 'Finish 5 tasks within their estimate', progress: (c) => [c.done.filter((d) => d.actual_time_taken > 0 && d.actual_time_taken <= d.expected_time).length, 5] },
  { id: 'hype', emoji: '🤝', name: 'Hype Person', desc: 'Send 3 high-fives', progress: (c) => [c.kudosGiven, 3] },
  { id: 'loved', emoji: '❤️', name: 'Fan Favourite', desc: 'Receive 3 high-fives', progress: (c) => [c.kudosReceived, 3] },
  { id: 'quest_master', emoji: '🗺️', name: 'Quest Master', desc: 'Complete 10 daily quests', progress: (c) => [c.questsClaimed, 10] },
  { id: 'collector', emoji: '🃏', name: 'Collector', desc: 'Collect 8 stickers', progress: (c) => [c.stickers, 8] },
  { id: 'mentor', emoji: '🧑‍🏫', name: 'Mentor', desc: 'Approve 10 submissions', progress: (c) => [c.reviews, 10] },
  { id: 'planner', emoji: '🗓️', name: 'Master Planner', desc: 'Plan a weekly allocation', progress: (c) => [c.plans, 1] },
  { id: 'voice_wizard', emoji: '🎤', name: 'Voice Wizard', desc: 'Create tasks by dictation', progress: (c) => [c.voiceUsed ? 1 : 0, 1] },
];

export function badgeStatus(ctx) {
  return BADGES.map((b) => {
    const [n, target] = b.progress(ctx);
    return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, progress: Math.min(n, target), target, earned: n >= target };
  });
}

// ---- stickers: the daily-drop collection ----
export const STICKERS = [
  ...['🐱', '🐶', '🦊', '🐼', '🐸', '🐙', '🦄', '🐝', '🌵', '🍕', '🍩', '☕', '🎸', '🪴'].map((e, i) => ({ id: `c${i}`, emoji: e, rarity: 'common' })),
  ...['🦉', '🐧', '🦖', '🍉', '🎨', '🛸', '🌈'].map((e, i) => ({ id: `r${i}`, emoji: e, rarity: 'rare' })),
  ...['🐉', '👑', '🚀'].map((e, i) => ({ id: `e${i}`, emoji: e, rarity: 'epic' })),
];
export function pickSticker(rng = Math.random) {
  const roll = rng();
  const rarity = roll < 0.7 ? 'common' : roll < 0.95 ? 'rare' : 'epic';
  const pool = STICKERS.filter((s) => s.rarity === rarity);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

export function computeStats({ done, approved, planned, today, claims = [], dropDupes = 0, dropNew = 0 }) {
  const questXp = claims.filter((k) => k.startsWith('quest:')).length * XP_PER_QUEST;
  const badgeXp = claims.filter((k) => k.startsWith('badge:')).length * XP_PER_BADGE;
  const xp = done.length * XP_PER_DAILY_TASK + approved.length * XP_PER_APPROVED_WEEKLY + questXp + badgeXp + dropNew * XP_NEW_STICKER + dropDupes * XP_DUPE_STICKER;
  const level = levelForXp(xp);
  return {
    xp,
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1],
    level_start_xp: xpForLevel(level),
    next_level_xp: xpForLevel(level + 1),
    completed_total: done.length,
    approved_total: approved.length,
    ...streakInfo(done.map((d) => d.date), today),
    completed_today: planned.filter((d) => d.task_status === 'Completed').length,
    planned_today: planned.length,
  };
}
