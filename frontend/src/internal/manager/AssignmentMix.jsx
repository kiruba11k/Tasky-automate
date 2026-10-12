import React, { useMemo } from 'react';
import {
  Se as useStore,
  vR as assignmentMixByAssigner,
  Jl as DIFFICULTY_TOLERANCE,
  nt as personName,
  vt as Avatar,
  oe as cn,
} from '@/internal/min';
import { useChartColors } from './chartTheme';

/** Text colour used on the coloured bar segments. (bundle: ble) */
const SEGMENT_TEXT_COLOR = '#0F172A';

/** Per-assigner easy / standard / challenging mix. (bundle: ok) */
export function AssignmentMix({ from, to, assignedBy, onOpen }) {
  const tasks = useStore((s) => s.tasks);
  const colors = useChartColors();
  const rows = useMemo(() => {
    const all = assignmentMixByAssigner({ tasks }, { from, to });
    return assignedBy ? all.filter((r) => r.assignerId === assignedBy) : all;
  }, [tasks, from, to, assignedBy]);
  const legend = [
    {
      k: 'easy',
      label: 'Easy',
      hint: `more than ${DIFFICULTY_TOLERANCE}% extra time`,
      fill: colors.butter,
    },
    {
      k: 'standard',
      label: 'Standard',
      hint: `within ${DIFFICULTY_TOLERANCE}% of standard`,
      fill: colors.sky,
    },
    {
      k: 'challenging',
      label: 'Challenging',
      hint: `more than ${DIFFICULTY_TOLERANCE}% less time`,
      fill: colors.coral,
    },
  ];

  if (!rows.length) {
    return (
      <p className="rounded-xl bg-surface-2 px-4 py-5 text-center text-sm text-muted">
        No tasks assigned in this period.
      </p>
    );
  }
  return (
    <div data-testid="assignment-mix">
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
        {legend.map((item) => (
          <li key={item.k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.fill }} />
            <b className="text-ink">{item.label}</b> {item.hint}
          </li>
        ))}
      </ul>
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const summary = legend.map((item) => `${row.pct[item.k]}% ${item.label.toLowerCase()}`).join(', ');
          const who = (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar id={row.assignerId} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{personName(row.assignerId)}</span>
                <span className="block text-[11px] text-muted">
                  {row.total}
                  {' task'}
                  {row.total === 1 ? '' : 's'}
                </span>
              </span>
            </span>
          );
          return (
            <li
              key={row.assignerId}
              data-assigner={row.assignerId}
              className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] items-center gap-3"
            >
              {onOpen ? (
                <button
                  type="button"
                  className="focus-ring rounded-lg text-left"
                  onClick={() => onOpen(row.assignerId)}
                >
                  {who}
                </button>
              ) : (
                who
              )}
              <div
                className="flex h-6 w-full gap-[2px] overflow-hidden rounded-md bg-surface"
                role="img"
                aria-label={`${personName(row.assignerId)}: ${summary}`}
                title={summary}
              >
                {legend.map(
                  (item) =>
                    row[item.k] > 0 && (
                      <div
                        key={item.k}
                        className={cn(
                          'flex h-full items-center justify-center text-[11px] font-bold tabular-nums first:rounded-l-md last:rounded-r-md',
                        )}
                        style={{
                          width: `${(row[item.k] / row.total) * 100}%`,
                          background: item.fill,
                          color: SEGMENT_TEXT_COLOR,
                        }}
                      >
                        {row[item.k] / row.total >= 0.12 ? `${row.pct[item.k]}%` : ''}
                      </div>
                    ),
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AssignmentMix;
