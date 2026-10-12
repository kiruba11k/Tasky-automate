import { Fragment } from 'react';
import { oe as cx, We as formatMinutes, Rh as ProgressBar } from '@/internal/min';
import { pctTone, pctTextClass } from './progressRows';

export function TargetsTable({
  rows,
  showTime,
  showActual,
  empty = 'Nothing assigned for this day.',
  label = 'Targets',
}) {
  if (!rows.length) {
    return <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">{empty}</p>;
  }
  const th = 'pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted';
  return (
    <table className="w-full table-fixed border-collapse text-sm" aria-label={label}>
      <colgroup>
        <col />
        <col className="w-12 sm:w-[7.5rem]" />
        {showTime && <col className="w-14 sm:w-16" />}
        {showActual && (
          <>
            <col className="w-11 sm:w-16" />
            <col className="w-12 sm:w-[5.5rem]" />
          </>
        )}
      </colgroup>
      <thead>
        <tr className="border-b border-line">
          <th className={cx(th, 'text-left')}>Task</th>
          <th className={cx(th, 'text-right')}>Target</th>
          {showTime && <th className={cx(th, 'text-right')}>Time</th>}
          {showActual && (
            <>
              <th className={cx(th, 'text-right')}>Actual</th>
              <th className={cx(th, 'text-right')}>Done</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line/70 last:border-0" data-row={row.key}>
            <td className="py-1.5 pr-2 align-top">
              <span className="block truncate font-medium" title={row.sub ? `${row.label} (${row.sub})` : row.label}>
                {row.priority && <span className="mr-1 text-coral-ink">★</span>}
                {row.label}
                {row.sub && <span className="ml-1.5 text-[11px] font-normal text-muted">{row.sub}</span>}
              </span>
            </td>
            <td className="py-1.5 text-right align-top tabular-nums" data-cell="target">
              <b>{row.target > 0 ? row.target : ''}</b>
              {row.unit && row.target > 0 && <span className="ml-1 hidden text-xs text-muted sm:inline">{row.unit}</span>}
            </td>
            {showTime && (
              <td className="py-1.5 text-right align-top tabular-nums text-muted" data-cell="time">
                {row.targetMin ? formatMinutes(row.targetMin) : ''}
              </td>
            )}
            {showActual && (
              <Fragment>
                <td className="py-1.5 text-right align-top font-bold tabular-nums" data-cell="actual">
                  {row.actual == null ? '' : row.actual}
                </td>
                <td className="py-1.5 align-top" data-cell="pct">
                  {row.pct != null && (
                    <span className="flex items-center justify-end gap-2">
                      <span className="hidden w-8 sm:block">
                        <ProgressBar value={row.pct} max={100} tone={pctTone(row.pct)} />
                      </span>
                      <span className={cx('w-10 text-right font-semibold tabular-nums', pctTextClass(row.pct))}>
                        {row.pct}%
                      </span>
                    </span>
                  )}
                </td>
              </Fragment>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TargetsTable;
