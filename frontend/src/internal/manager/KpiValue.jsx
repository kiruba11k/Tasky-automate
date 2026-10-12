import React from 'react';
import { oe as cn, Vw as formatKpi } from '@/internal/min';

/** Formatted KPI value, or "n/a". (bundle: yh) */
export function KpiValue({ kpi, v, className }) {
  return v == null ? (
    <span className={cn('text-muted', className)} title="No submitted tasks with time recorded">
      n/a
    </span>
  ) : (
    <span className={className}>{formatKpi(kpi, v)}</span>
  );
}

export default KpiValue;
