import { RotateCcwClock, ChevronDown } from 'lucide-react';
import { oe as cx } from '@/internal/min';
import { HISTORY_ACTIONS, sortedHistory } from './historyMeta';
import { formatTimeOrDateTime } from './taskFormat';

/** "History (n)" disclosure button; shows the latest event while collapsed. */
export function HistoryToggle({ task, open, onClick, className }) {
  const history = sortedHistory(task);
  const last = history[history.length - 1];
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={cx(
        'focus-ring inline-flex items-center gap-1 rounded-md text-xs font-semibold text-accent-ink hover:underline',
        className,
      )}
    >
      <RotateCcwClock size={12} /> History ({history.length})
      <ChevronDown size={12} className={cx('transition-transform', open && 'rotate-180')} />
      {!open && last && (
        <span className="font-normal text-muted">
          · last: {HISTORY_ACTIONS[last.action]?.title.toLowerCase() ?? last.action} {formatTimeOrDateTime(last.at)}
        </span>
      )}
    </button>
  );
}

export default HistoryToggle;
