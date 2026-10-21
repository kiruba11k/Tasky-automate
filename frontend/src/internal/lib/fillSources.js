import { addDays } from './dates.js';

const minutesBetween = (a, b) => {
  const [ah, am] = String(a).split(':').map(Number);
  const [bh, bm] = String(b).split(':').map(Number);
  return Math.max(0, bh * 60 + (bm || 0) - (ah * 60 + (am || 0)));
};

/**
 * Earlier days a person can copy from: every day before `date` (up to `lookback` days back, newest first) that has something
 * saved. `kind` "plan" counts plan blocks (and their minutes), "rows" counts Daily update rows, optionally only one project's.
 */
export function fillSources(daily, personId, date, { kind = 'plan', projectId, lookback = 45 } = {}) {
  const out = [];
  for (let i = 1; i <= lookback; i++) {
    const day = addDays(date, -i);
    const rec = daily?.[`${personId}|${day}`];
    if (!rec) continue;
    if (kind === 'plan') {
      const blocks = (rec.plan ?? []).filter((b) => b.id !== 'lunch' && !b.lunch);
      if (!blocks.length) continue;
      out.push({ date: day, count: blocks.length, minutes: blocks.reduce((s, b) => s + minutesBetween(b.start, b.end), 0) });
    } else {
      const rows = (rec.entries ?? []).filter((r) => (!projectId || r.projectId === projectId) && (r.task || r.desc));
      if (!rows.length) continue;
      out.push({ date: day, count: rows.length, minutes: rows.reduce((s, r) => s + (r.estMin || 0), 0) });
    }
  }
  return out;
}
