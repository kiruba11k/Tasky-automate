import React from 'react';
import { oe as cn, Go as KPI_KEYS, Yo as KPI_LABELS, Ca as KPI_HINTS, Vw as formatKpi } from '@/internal/min';
import { KpiValue } from './KpiValue';
import { KpiDelta } from './KpiDelta';
import { kpiDifference } from './kpiDelta';

/** Row of KPI cards for the selected period vs the previous one. (bundle: nL) */
export function KpiCards({ cur, prev, selected, prevLabel, onSelect }) {
  return (
    <div
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
      aria-label="KPIs for the selected period"
    >
      {KPI_KEYS.map((kpi) => {
        const content = (
          <>
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted">
              {KPI_LABELS[kpi]}
            </p>
            <p className="mt-1 text-2xl font-extrabold leading-none tabular-nums">
              <KpiValue kpi={kpi} v={cur[kpi]} />
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <KpiDelta kpi={kpi} v={kpiDifference(cur[kpi], prev[kpi])} />
              <span className="truncate text-[11px] text-muted" title={prevLabel}>
                {'vs '}
                {prev[kpi] == null ? 'n/a' : formatKpi(kpi, prev[kpi])}
              </span>
            </p>
          </>
        );
        const cardClass = cn(
          'min-w-0 rounded-2xl border p-3 text-left transition',
          kpi === selected ? 'border-accent bg-accent-soft/40 ring-1 ring-accent' : 'border-line bg-surface',
        );
        return onSelect ? (
          <button
            key={kpi}
            type="button"
            data-kpi={kpi}
            aria-pressed={kpi === selected}
            title={`${KPI_HINTS[kpi]}. Click to chart it.`}
            onClick={() => onSelect(kpi)}
            className={cn('focus-ring hover:border-accent', cardClass)}
          >
            {content}
          </button>
        ) : (
          <div key={kpi} data-kpi={kpi} title={KPI_HINTS[kpi]} className={cardClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default KpiCards;
