import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { oe as cn } from '@/internal/min';
import { deltaText, deltaTone } from './kpiDelta';

/** Up/down arrow with the change in a KPI. (bundle: R1) */
export function KpiDelta({ kpi, v, className }) {
  if (v == null) {
    return <span className={cn('text-xs text-muted', className)}>No comparison</span>;
  }
  if (v === 0) {
    return <span className={cn('text-xs font-semibold text-muted', className)}>No change</span>;
  }
  const Arrow = v > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold tabular-nums',
        deltaTone(kpi, v),
        className,
      )}
    >
      <Arrow size={13} aria-hidden />
      {deltaText(kpi, v)}
    </span>
  );
}

export default KpiDelta;
