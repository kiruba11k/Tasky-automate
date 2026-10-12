import { RotateCcwClock } from 'lucide-react';
import { oe as cx } from '@/internal/min';
import { HISTORY_ACTIONS, HISTORY_TONE_CLASSES, historyActor, historySummary, sortedHistory } from './historyMeta';
import { formatDateTime } from './taskFormat';

/** Timeline of everything that happened to a task. */
export function TaskHistory({ task, className }) {
  const history = sortedHistory(task);
  const summary = historySummary(task);
  if (!history.length)
    return <p className={cx('text-xs text-muted', className)}>No history recorded for this task yet.</p>;
  let resubmitCount = 0;
  return (
    <div
      className={cx('rounded-xl border border-line bg-surface-2/60 px-3 py-2.5', className)}
      data-testid="task-history"
    >
      <ol className="space-y-2">
        {history.map((entry, i) => {
          const meta = HISTORY_ACTIONS[entry.action] ?? { title: entry.action, tone: 'grey', icon: RotateCcwClock };
          const Icon = meta.icon;
          if (entry.action === 'resubmitted') resubmitCount++;
          return (
            <li key={`${entry.at}-${i}`} className="relative flex gap-3 text-sm" data-action={entry.action}>
              {i < history.length - 1 && (
                <span aria-hidden className="absolute left-[11px] top-6 h-[calc(100%-0.5rem)] w-px bg-line" />
              )}
              <span
                className={cx(
                  'relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  HISTORY_TONE_CLASSES[meta.tone],
                )}
              >
                <Icon size={12} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>
                    <b>{meta.title}</b> <span className="text-muted">{historyActor(entry)}</span>
                    {entry.action === 'resubmitted' && <span className="text-muted"> · resubmit {resubmitCount}</span>}
                  </span>
                  <time dateTime={entry.at} className="text-xs tabular-nums text-muted">
                    {formatDateTime(entry.at)}
                  </time>
                </p>
                {entry.note && (
                  <p className="mt-0.5 text-xs text-muted">
                    {entry.action === 'edited' ? `Changed ${entry.note}` : `"${entry.note}"`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {summary && <p className="mt-2 border-t border-line pt-2 text-xs text-muted">{summary}</p>}
    </div>
  );
}

export default TaskHistory;
