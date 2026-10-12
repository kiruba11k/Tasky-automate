import React from 'react';

/** Period dropdown. (bundle: ik) */
export function PeriodSelect({ options, index, onChange }) {
  return (
    <select
      aria-label="Period"
      value={Math.min(index, options.length - 1)}
      onChange={(event) => onChange(Number(event.target.value))}
      className="focus-ring max-w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
    >
      {options.map((option, i) => (
        <option key={option.period.key} value={i}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default PeriodSelect;
