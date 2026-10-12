import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Se as useStore,
  yt as formatDate,
  qe as Badge,
  mi as STATUS_META,
} from '@/internal/min';
import { summarizeTaskHistory, resubmitLabel } from './taskHistoryStats';
import { TaskHistoryTimeline } from './TaskHistoryTimeline';

/** Feedback / resubmit history for one person over a period. (bundle: oL) */
export function TaskHistoryPanel({ personId, from, to, periodTitle }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const [openId, setOpenId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const mine = useMemo(() => tasks.filter((t) => t.assigneeId === personId), [tasks, personId]);
  const inPeriod = useMemo(() => mine.filter((t) => t.date >= from && t.date <= to), [mine, from, to]);
  const period = useMemo(() => summarizeTaskHistory(inPeriod), [inPeriod]);
  const allTime = useMemo(() => summarizeTaskHistory(mine), [mine]);
  const since = mine.reduce((min, t) => (t.date < min ? t.date : min), to);
  const sentBack = inPeriod
    .filter((t) => (t.resubmits ?? 0) > 0 || t.history?.some((h) => h.action === 'feedback'))
    .sort((a, b) => (b.resubmits ?? 0) - (a.resubmits ?? 0) || b.date.localeCompare(a.date));
  const visible = showAll ? sentBack : sentBack.slice(0, 5);
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? id;

  const stats = [
    ['Sent for approval', period.submitted, `${period.tasks} assigned`],
    ['Approved', period.approved],
    ['Feedback rounds', period.feedback],
    [
      'Resubmits',
      period.resubmits,
      period.resubmitted ? `on ${period.resubmitted} task${period.resubmitted === 1 ? '' : 's'}` : undefined,
    ],
    ['Approved first time', period.firstTime == null ? 'n/a' : `${period.firstTime}%`],
    ['Avg time to approval', period.avgApprovalH == null ? 'n/a' : `${period.avgApprovalH}h`],
  ];

  return (
    <div data-testid="task-history">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, value, sub]) => (
          <div key={label} className="min-w-0 rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-lg font-bold leading-tight tabular-nums">{value}</p>
            <p className="truncate text-[11px] text-muted" title={label}>
              {label}
              {sub ? <span className="block">{sub}</span> : null}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted" data-testid="history-all-time">
        {'All history since '}
        {formatDate(since)}
        {': '}
        <b className="text-ink">
          {allTime.resubmits}
          {' resubmit'}
          {allTime.resubmits === 1 ? '' : 's'}
        </b>
        {' on '}
        {allTime.resubmitted}
        {' of '}
        {allTime.tasks}
        {' tasks'}
        {allTime.firstTime != null && <>, {allTime.firstTime}% approved first time</>}
        {allTime.forwarded ? <>, {allTime.forwarded} forwarded</> : null}
        {'.'}
      </p>
      <p className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-muted">
        {'Sent back and resubmitted, '}
        {periodTitle}
      </p>
      {sentBack.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-3 py-3 text-sm text-muted">
          {period.submitted
            ? 'No feedback rounds in this period: everything went through first time.'
            : 'Nothing sent for approval in this period yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {visible.map((task) => (
            <li key={task.id} className="px-3 py-2" data-task={task.id}>
              <button
                type="button"
                className="focus-ring flex w-full items-center gap-2 rounded-lg text-left text-sm"
                aria-expanded={openId === task.id}
                onClick={() => setOpenId(openId === task.id ? null : task.id)}
              >
                {openId === task.id ? (
                  <ChevronDown size={14} className="shrink-0 text-muted" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate first-letter:uppercase">{task.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {formatDate(task.date)}
                    {' · '}
                    {projectName(task.projectId)}
                  </span>
                </span>
                {(task.resubmits ?? 0) > 0 ? (
                  <Badge tone="butter">{resubmitLabel(task.resubmits)}</Badge>
                ) : (
                  <Badge tone="grey">Feedback</Badge>
                )}
                <Badge tone={STATUS_META[task.status].tone}>{STATUS_META[task.status].label}</Badge>
              </button>
              {openId === task.id && (
                <div className="mt-2 pl-6">
                  <TaskHistoryTimeline task={task} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {sentBack.length > 5 && (
        <button
          type="button"
          className="focus-ring mt-2 rounded-lg text-xs font-semibold text-accent-ink hover:underline"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? 'Show fewer' : `Show all ${sentBack.length}`}
        </button>
      )}
    </div>
  );
}

export default TaskHistoryPanel;
