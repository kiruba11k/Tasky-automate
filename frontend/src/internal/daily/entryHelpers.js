import { TASK_TYPES } from '../lib/constants.js';
import { weekStart } from '../lib/dates.js';
import { weeklyDone } from '../lib/entries.js';

/** Value of the "Custom..." choice in a task picker. */
export const CUSTOM_TASK = '__custom';

/** A blank row for a project's day / week table. */
let rowCounter = 0;
export const newEntryId = () => `e${Date.now().toString(36)}${rowCounter++}`;
export const blankEntry = (projectId) => ({ id: newEntryId(), projectId, task: '', desc: '', estMin: 0, achieved: '', remarks: '' });

/** Prefix of a person's own dropdown options (task id "my:Client call"): shown without it. */
export const MY_PREFIX = 'my:';

/** The standard task types a project offers (every one unless the project switched some off). */
export const standardTypes = (project) => TASK_TYPES.filter((t) => !project?.typesOff?.includes(t.id));

/**
 * Task choices for a project's dropdown: the standard task types, the project's own custom standards and the person's own
 * extra options, minus anything they hid or deleted (`taskMenu` = { hidden, extra, removed }).
 */
export const taskChoices = (project, taskMenu) => {
  const all = [
    ...standardTypes(project).map((t) => ({ id: t.id, name: t.name })),
    ...(project?.customStandards ?? []).map((t) => ({ id: `std:${t.id}`, name: t.name })),
    ...(taskMenu?.extra ?? []).map((name) => ({ id: `${MY_PREFIX}${name}`, name })),
  ];
  return all.filter((t) => !taskMenu?.hidden?.includes(t.id) && !taskMenu?.removed?.includes(t.id));
};

/** The name to show for a row. */
export const entryName = (entry, project) =>
  entry.task === CUSTOM_TASK
    ? entry.custom || 'Custom task'
    : entry.task.startsWith(MY_PREFIX)
      ? entry.task.slice(MY_PREFIX.length)
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

/** Name to show for a project id in the tables: free-text "other:" work, or the project's name. */
export const projectLabel = (projectId, projects) =>
  projectId.startsWith('other:') ? projectId.slice('other:'.length) : (projects.find((p) => p.id === projectId)?.name ?? projectId);

/** The kinds of target a row can have. */
export const ENTRY_KINDS = ['number', 'milestone', 'text'];

/** Progress of a milestone row. */
export const ROW_STATUSES = ['Not started', 'In progress', 'Completed', 'Blocked'];

/** Extra classes that tint the status picker. */
export const STATUS_CLASS = {
  'Not started': '',
  'In progress': '!bg-sky/50 !text-sky-ink',
  Completed: '!bg-mint/60 !text-mint-ink',
  Blocked: '!bg-coral/60 !text-coral-ink',
};

/** How much of a row is done (a milestone counts 1 once completed, text rows do not count) and what its target is. */
export const rowDone = (row) =>
  (row.kind ?? 'number') === 'milestone' ? (row.status === 'Completed' ? 1 : 0) : (row.kind ?? 'number') === 'text' ? 0 : (row.doneQty ?? 0);
export const rowTarget = (row) =>
  (row.kind ?? 'number') === 'milestone' ? 1 : (row.kind ?? 'number') === 'text' ? 0 : (row.qty ?? 0);

/** The saved rows for a day, or for the week that contains `date`. */
export function savedEntries(kind, personId, date, daily, weekly) {
  return (kind === 'day' ? daily[`${personId}|${date}`] : weekly[`${personId}|${weekStart(date)}`])?.entries ?? [];
}
