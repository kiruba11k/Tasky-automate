import { addDays, format, parseISO, startOfWeek } from 'date-fns';

export const toISO = (d) => format(d, 'yyyy-MM-dd');
export const mondayOf = (d = new Date()) => toISO(startOfWeek(d, { weekStartsOn: 1 }));
export const shiftWeek = (weekStart, weeks) => toISO(addDays(parseISO(weekStart), weeks * 7));
export const weekDates = (weekStart) => Array.from({ length: 7 }, (_, i) => toISO(addDays(parseISO(weekStart), i)));
export const dayLabel = (iso) => format(parseISO(iso), 'EEE d');
export const weekLabel = (weekStart) => `${format(parseISO(weekStart), 'MMM d')} – ${format(addDays(parseISO(weekStart), 6), 'MMM d, yyyy')}`;

const round = (n) => Math.round(n * 100) / 100;

/** Splits `target` across `dates` (whole numbers stay whole; earlier days take the remainder). Mirrors the server. */
export function evenSplit(target, dates) {
  const plan = {};
  const n = dates.length;
  if (!n || !(target > 0)) return plan;
  if (Number.isInteger(target)) {
    dates.forEach((d, i) => { plan[d] = Math.floor(target / n) + (i < target % n ? 1 : 0); });
  } else {
    dates.forEach((d) => { plan[d] = round(target / n); });
    plan[dates[n - 1]] = round(target - round(target / n) * (n - 1));
  }
  return plan;
}

export const planTotal = (plan) => round(Object.values(plan || {}).reduce((s, v) => s + (Number(v) || 0), 0));
