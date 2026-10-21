import { Se as useStore, Ye as toast } from '@/internal/min';
import { canReschedule } from '../lib/moveRows.js';
import { formatShortDate } from './dateHelpers';

/** Change the day of the given tasks (those the viewer may reschedule). Returns how many moved. */
export function rescheduleTasksTo(taskIds, to) {
  const st = useStore.getState();
  let n = 0;
  [...new Set(taskIds ?? [])].forEach((id) => {
    const task = st.tasks.find((t) => t.id === id);
    if (task && task.date !== to && canReschedule(task, st.me)) {
      st.rescheduleTask(id, to);
      n++;
    }
  });
  return n;
}

/**
 * Move work of one of my days to another day: logged rows (`ids`: those rows, nothing when empty, every row when omitted) and
 * assigned tasks (`taskIds`, their own day changes). Throws a readable error when nothing could move, so callers wrap it in `guarded`.
 */
export function moveWork({ personId, from, to, ids, taskIds, fromRows, quiet }) {
  const st = useStore.getState();
  const rows = ids && ids.length === 0 ? 0 : st.moveDayRows(personId, from, to, { ids, fromRows });
  const tasks = rescheduleTasksTo(taskIds, to);
  if (!rows && !tasks) throw new Error('There is nothing here that can be moved.');
  if (!quiet) toast({ title: `Moved to ${formatShortDate(to)}`, tone: 'success' });
  return { rows, tasks };
}
