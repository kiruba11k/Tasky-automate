import { We as formatMinutes } from '@/internal/min';
import { withinTarget } from '../lib/domain';

/** One-line summary of assigned or submitted tasks. */
export function TaskSummary({ tasks, mode }) {
  if (!tasks.length) return null;
  if (mode === 'assigned') {
    const minutes = tasks.reduce((sum, t) => sum + (t.targetMinutes || 0), 0);
    const priority = tasks.filter((t) => t.priority).length;
    return (
      <p className="text-xs text-muted">
        {tasks.length}
        {' task'}
        {tasks.length === 1 ? '' : 's'}
        {' · '}
        {formatMinutes(minutes)}
        {' of work'}
        {priority ? ` · ${priority} priority` : ''}
      </p>
    );
  }
  const logged = tasks.reduce((sum, t) => sum + (t.minutes ?? 0), 0);
  const measurable = tasks.filter((t) => t.minutes && t.doneQty && t.qty);
  const onTime = measurable.filter((t) => withinTarget(t.minutes, t.targetMinutes * (t.doneQty / t.qty))).length;
  return (
    <p className="text-xs text-muted">
      {tasks.length}
      {' submitted · '}
      {formatMinutes(logged)}
      {' logged'}
      {measurable.length ? ` · ${onTime} of ${measurable.length} on time` : ''}
    </p>
  );
}

export default TaskSummary;
