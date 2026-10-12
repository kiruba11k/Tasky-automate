import { $w as MONTH_SHORT, $e as dayKey, We as formatMinutes, FV as DIFFICULTY_LABELS } from '@/internal/min';

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const pad2 = (n) => String(n).padStart(2, '0');

/** "Mon 3 Oct, 14:05" */
export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Time only when the timestamp is today, otherwise the full date-time. */
export function formatTimeOrDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return key === dayKey(0) ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : formatDateTime(iso);
}

/** Human duration between two ISO timestamps. */
export const durationBetween = (from, to) =>
  formatMinutes(Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 6e4)));

export const DIFFICULTY_TONE = { standard: 'sky', easy: 'butter', challenging: 'coral' };

export function difficultyLabel(d) {
  return d.level === 'standard'
    ? 'Standard'
    : `${DIFFICULTY_LABELS[d.level]} (${d.pct > 0 ? '+' : ''}${d.pct}% time)`;
}

/** Standard minutes for a task, or null when it is a custom task with no project standard. */
export function standardMinutesOf(task) {
  return task.typeId === 'custom' && !task.customStandardId
    ? null
    : task.standardMinutes && task.standardMinutes > 0
      ? task.standardMinutes
      : null;
}
