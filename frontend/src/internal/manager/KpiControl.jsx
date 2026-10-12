import React from 'react';
import { Go as KPI_KEYS, Yo as KPI_LABELS, Ca as KPI_HINTS } from '@/internal/min';
import { SegmentedControl } from './SegmentedControl';

/** KPI switch. (bundle: rk) */
export function KpiControl({ value, onChange }) {
  return (
    <SegmentedControl
      label="KPI"
      value={value}
      onChange={onChange}
      options={KPI_KEYS.map((id) => ({ id, label: KPI_LABELS[id], title: KPI_HINTS[id] }))}
    />
  );
}

export default KpiControl;
