import React from 'react';

/** Recharts custom tooltip content (original: `Mw`). */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  hideLabel,
  footer,
}) {
  if (!active || !payload || payload.length === 0) return null;
  const heading = labelFormatter ? labelFormatter(label) : label;
  const footerContent = footer?.(payload);
  return (
    <div className="min-w-[140px] max-w-[260px] rounded-xl border border-line/80 bg-surface px-3 py-2.5 text-xs shadow-lift">
      {!hideLabel && heading !== undefined && heading !== '' && (
        <p className="mb-1.5 font-semibold text-ink">{heading}</p>
      )}
      <ul className="space-y-1">
        {payload
          .filter((item) => item.value !== undefined && item.value !== null)
          .map((item, index) => (
            <li
              key={`${String(item.dataKey ?? item.name)}-${index}`}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-muted">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color ?? item.payload?.fill ?? item.stroke }}
                />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">
                {valueFormatter ? valueFormatter(item.value, item.name) : item.value}
              </span>
            </li>
          ))}
      </ul>
      {footerContent && (
        <div className="mt-2 border-t border-line/70 pt-2 text-muted">{footerContent}</div>
      )}
    </div>
  );
}

export default ChartTooltip;
