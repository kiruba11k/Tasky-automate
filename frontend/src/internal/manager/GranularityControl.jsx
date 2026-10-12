import React from 'react';
import { KV as GRANULARITY_LABELS } from '@/internal/min';
import { SegmentedControl } from './SegmentedControl';
import { GRANULARITIES } from './periods';

/** Day / Week / Month switch. (bundle: nk) */
export function GranularityControl({ value, onChange }) {
  return (
    <SegmentedControl
      label="Granularity"
      value={value}
      onChange={onChange}
      options={GRANULARITIES.map((id) => ({ id, label: GRANULARITY_LABELS[id] }))}
    />
  );
}

export default GranularityControl;
