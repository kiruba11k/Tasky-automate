import { We as formatMinutes } from '@/internal/min';

/** "1h 30m" or "0h" for zero. */
export const formatHours = (minutes) => (minutes > 0 ? formatMinutes(minutes) : '0h');

export function HoursStats({ t, sent = true }) {
  const stats = [
    ['Planned', formatHours(t.plannedMin)],
    ['Actual', sent || t.actualMin ? formatHours(t.actualMin) : 'pending'],
    ['Extra', formatHours(t.extraMin)],
  ];
  return (
    <div className="flex flex-wrap gap-2" data-testid="hours-stats">
      {stats.map(([label, value]) => (
        <span key={label} className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs text-muted">
          {label} <b className="ml-0.5 text-ink tabular-nums">{value}</b>
        </span>
      ))}
    </div>
  );
}

export default HoursStats;
