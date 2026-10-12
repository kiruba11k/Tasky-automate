import React from 'react';
import { oe as cn } from '@/internal/min';
import { KpiValue } from './KpiValue';

/** On-time score tone. (bundle: kle) */
const onTimeTone = (value) =>
  value == null ? '' : value >= 80 ? 'text-mint-ink' : value >= 60 ? 'text-butter-ink' : 'text-coral-ink';

/** Period-by-period KPI table. (bundle: sL) */
export function TrackTable({ rows, gran, selectedKey, eodOf, maxHeight = 'max-h-64' }) {
  const showEod = gran === 'day' && !!eodOf;
  return (
    <div className={cn('overflow-auto rounded-xl border border-line', maxHeight)} data-testid="track-table">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-[1] bg-surface-2 text-left text-[11px] uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-bold">
              {gran === 'day' ? 'Date' : gran === 'week' ? 'Week' : 'Month'}
            </th>
            <th className="px-2 py-2 text-right font-bold">On time</th>
            <th className="px-2 py-2 text-right font-bold">Tasks done</th>
            <th className="px-2 py-2 text-right font-bold">Hours</th>
            <th className="px-2 py-2 text-right font-bold">Extra</th>
            <th className="px-2 py-2 text-right font-bold">Resubmits</th>
            {showEod && <th className="px-3 py-2 font-bold">End of day</th>}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {[...rows].reverse().map((row) => {
            const eod = showEod ? eodOf(row.key) : null;
            return (
              <tr
                key={row.key}
                className={cn('border-t border-line', row.key === selectedKey && 'bg-accent-soft/50')}
                aria-current={row.key === selectedKey ? 'true' : undefined}
              >
                <td className="whitespace-nowrap px-3 py-1.5">
                  {row.title}
                  {row.partial && <span className="ml-1 text-[11px] text-muted">(so far)</span>}
                </td>
                <td className={cn('px-2 py-1.5 text-right font-semibold', onTimeTone(row.onTime))}>
                  <KpiValue kpi="onTime" v={row.onTime} />
                </td>
                <td className="px-2 py-1.5 text-right">{row.tasks}</td>
                <td className="px-2 py-1.5 text-right">{row.hours}h</td>
                <td className="px-2 py-1.5 text-right">{row.extra ? `${row.extra}h` : '0h'}</td>
                <td
                  className={cn('px-2 py-1.5 text-right', row.resubmits > 0 && 'font-semibold text-butter-ink')}
                >
                  {row.resubmits}
                </td>
                {showEod && (
                  <td className="whitespace-nowrap px-3 py-1.5 text-xs">
                    {eod == null ? (
                      <span className="text-faint">No record</span>
                    ) : eod ? (
                      <span className="font-semibold text-mint-ink">Sent {eod}</span>
                    ) : (
                      <span className="font-semibold text-butter-ink">
                        {row.partial ? 'Not sent yet' : 'Not sent'}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TrackTable;
