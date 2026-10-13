import { TASK_TYPES } from '../lib/constants.js';
import { weekStart } from '../lib/dates.js';
import { weeklyDone } from '../lib/entries.js';

/** Value of the "Custom..." choice in a task picker. */
export const CUSTOM_TASK = '__custom';

/** A blank row for a project's day / week table. */
let rowCounter = 0;
export const newEntryId = () => `e${Date.now().toString(36)}${rowCounter++}`;
export const blankEntry = (projectId) => ({ id: newEntryId(), projectId, task: '', desc: '', estMin: 0, achieved: '', remarks: '' });

/** Task choices for a project: the standard task types plus the project's own custom standards. */
export const taskChoices = (project) => [
  ...TASK_TYPES.map((t) => ({ id: t.id, name: t.name })),
  ...(project?.customStandards ?? []).map((t) => ({ id: `std:${t.id}`, name: t.name })),
];

/** The name to show for a row. */
export const entryName = (entry, project) =>
  entry.task === CUSTOM_TASK
    ? entry.custom || 'Custom task'
    : (taskChoices(project).find((t) => t.id === entry.task)?.name ?? entry.task);

/** Two rows are the same piece of work (same project and task; custom tasks compare by name). */
export const sameWork = (a, b) =>
  a.projectId === b.projectId &&
  a.task === b.task &&
  (a.task !== CUSTOM_TASK || (a.custom ?? '').trim().toLowerCase() === (b.custom ?? '').trim().toLowerCase());

/** "" -> undefined, otherwise a whole number of zero or more. */
export const parseQty = (text) => (text.trim() === '' ? undefined : Math.max(0, Math.round(+text || 0)));

/** Achieved count of a weekly row: what was typed, otherwise the sum of the matching daily rows from that week's days. */
export const weeklyAchieved = weeklyDone;

/** The saved rows for a day, or for the week that contains `date`. */
export function savedEntries(kind, personId, date, daily, weekly) {
  return (kind === 'day' ? daily[`${personId}|${date}`] : weekly[`${personId}|${weekStart(date)}`])?.entries ?? [];
}
