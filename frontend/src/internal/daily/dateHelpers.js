import {
  $e as dayKey,
  Wr as isWorkday,
  ia as snapToWorkday,
  ft as addDays,
  yt as formatShortDate,
} from '@/internal/min';

/** Today's date key if it is a workday, otherwise the snapped workday (the latest selectable date). */
export const latestWorkday = () => (isWorkday(dayKey(0)) ? dayKey(0) : snapToWorkday(dayKey(0)));

/** Move `date` by `steps` workdays (negative = back), never past the latest workday. */
export function stepWorkdays(date, steps) {
  let n = date;
  for (let i = 0; i < Math.abs(steps); i++) {
    do n = addDays(n, Math.sign(steps));
    while (!isWorkday(n));
  }
  const max = latestWorkday();
  return n > max ? max : n;
}

/** "HH:MM" clock text for an ISO timestamp. */
export const formatClock = (iso) => {
  if (!iso) return '';
  const t = new Date(iso);
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon 09:30" text for an ISO timestamp. */
export const formatDayClock = (iso) =>
  iso ? `${WEEKDAY_SHORT[new Date(iso).getDay()]} ${formatClock(iso)}` : '';

/** "<Monday> to <Friday>" label for a week starting on `monday`. */
export const formatWeekRange = (monday) => `${formatShortDate(monday)} to ${formatShortDate(addDays(monday, 4))}`;

/** [monday, friday] date keys of the week containing `date` (YYYY-MM-DD). */
export function weekdayRange(date) {
  const t = new Date(date + 'T00:00');
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const monday = fmt(t);
  t.setDate(t.getDate() + 4);
  return [monday, fmt(t)];
}
