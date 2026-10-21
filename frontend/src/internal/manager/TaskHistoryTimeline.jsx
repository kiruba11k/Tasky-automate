import React from 'react';
import { oe as cn, yt as formatDate, dR as dateKeyOf, be as firstName } from '@/internal/min';
import { formatClock } from './timeFormat';

/** "12 Mar, 14:05" for an ISO timestamp. (bundle: wle) */
const formatTimestamp = (iso) => {
  const date = new Date(iso);
  return `${formatDate(dateKeyOf(date))}, ${formatClock(date)}`;
};

/** Label and dot colour for each history action. (bundle: EM) */
export const HISTORY_ACTIONS = {
  assigned: {
    text: (e) => `Assigned by ${firstName(e.by)}${e.to ? ` to ${firstName(e.to)}` : ''}`,
    dot: 'bg-grey-strong',
  },
  submitted: {
    text: (e) => `Sent for approval${e.to ? ` to ${firstName(e.to)}` : ''}`,
    dot: 'bg-sky-strong',
  },
  resubmitted: {
    text: (e) => `Resubmitted${e.to ? ` to ${firstName(e.to)}` : ''}`,
    dot: 'bg-lavender-strong',
  },
  feedback: {
    text: (e) => `Feedback from ${firstName(e.by)}`,
    dot: 'bg-butter-strong',
  },
  forwarded: {
    text: (e) => `Forwarded by ${firstName(e.by)}${e.to ? ` to ${firstName(e.to)}` : ''}`,
    dot: 'bg-peach-strong',
  },
  approved: { text: (e) => `Approved by ${firstName(e.by)}`, dot: 'bg-mint-strong' },
  edited: { text: (e) => `Edited by ${firstName(e.by)}`, dot: 'bg-grey-strong' },
  reminded: {
    text: (e) => `Reminder from ${firstName(e.by)}`,
    dot: 'bg-grey-strong',
  },
  rescheduled: { text: (e) => `Moved to another day by ${firstName(e.by)}`, dot: 'bg-lavender-strong' },
};

/** Vertical timeline of a task's history. (bundle: jle) */
export function TaskHistoryTimeline({ task }) {
  const history = task.history ?? [];
  if (!history.length) {
    return <p className="text-xs text-muted">No history recorded.</p>;
  }
  return (
    <ol className="relative ml-1.5 space-y-2 border-l border-line pl-4" aria-label="Task history">
      {history.map((entry, index) => (
        <li key={index} className="relative text-xs" data-action={entry.action}>
          <span
            className={cn(
              'absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-surface',
              HISTORY_ACTIONS[entry.action]?.dot ?? 'bg-grey-strong',
            )}
          />
          <span className="font-semibold text-ink">
            {HISTORY_ACTIONS[entry.action]?.text(entry) ?? entry.action}
          </span>
          <span className="text-muted">
            {' · '}
            {formatTimestamp(entry.at)}
          </span>
          {entry.note && (
            <span className="mt-0.5 block text-muted">
              {'"'}
              {entry.note}
              {'"'}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export default TaskHistoryTimeline;
