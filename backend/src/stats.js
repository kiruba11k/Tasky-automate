import { addDays } from './weekly.js';

export const XP_PER_DAILY_TASK = 10;
export const XP_PER_APPROVED_WEEKLY = 40;

export const LEVEL_TITLES = [
  'Task Hatchling', 'Checklist Cadet', 'Deadline Dodger', 'Sprint Sidekick', 'Productivity Ninja',
  'Workflow Wizard', 'Hustle Hero', 'Sprint Legend', 'Grand Task Master', 'Cosmic Closer',
];

/** XP needed to reach level L (L >= 1): 0, 50, 150, 300, 500, 750, ... */
export const xpForLevel = (level) => 25 * level * (level - 1);
export const levelForXp = (xp) => Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 6.25)) / 2));

/** Consecutive days with at least one completed task, counting back from today (or from yesterday if today has none yet). */
export function streakDays(dates, today) {
  const set = new Set(dates);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

export function computeStats({ done, approved, planned, today }) {
  const xp = done.length * XP_PER_DAILY_TASK + approved.length * XP_PER_APPROVED_WEEKLY;
  const level = levelForXp(xp);
  return {
    xp,
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1],
    level_start_xp: xpForLevel(level),
    next_level_xp: xpForLevel(level + 1),
    completed_total: done.length,
    approved_total: approved.length,
    streak: streakDays(done.map((d) => d.date), today),
    completed_today: planned.filter((d) => d.task_status === 'Completed').length,
    planned_today: planned.length,
  };
}
