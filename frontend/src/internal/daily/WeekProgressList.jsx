import { oe as cx, Rh as ProgressBar } from '@/internal/min';
import { pctTone, pctTextClass } from './progressRows';

export function WeekProgressList({ rows, sent, empty = 'Nothing assigned this week yet.' }) {
  if (!rows.length) {
    return <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="space-y-3" aria-label="Week progress" data-sent={sent ? 'yes' : 'no'}>
      {rows.map((r) => (
        <li key={r.key} data-row={r.key}>
          <div className="flex items-baseline gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium" title={r.label}>
              {r.label}
              {r.sub && <span className="ml-1.5 text-[11px] font-normal text-muted">{r.sub}</span>}
            </span>
            <span className="shrink-0 tabular-nums" data-cell="value">
              {r.actual != null ? (
                <>
                  <b>{r.actual}</b>
                  <span className="text-muted">
                    {' / '}
                    {r.target > 0 ? r.target : 'no target'}
                    {r.unit && r.target > 0 ? ` ${r.unit}` : ''}
                  </span>
                </>
              ) : (
                <span className="text-muted">
                  {'target '}
                  <b className="text-ink">{r.target}</b>
                  {r.unit ? ` ${r.unit}` : ''}
                </span>
              )}
            </span>
            <span
              className={cx('w-11 shrink-0 text-right text-sm font-bold tabular-nums', r.pct != null && pctTextClass(r.pct))}
              data-cell="pct"
            >
              {r.pct != null ? `${r.pct}%` : ''}
            </span>
          </div>
          <div className="mt-1.5">
            <ProgressBar value={r.pct ?? 0} max={100} tone={r.pct != null ? pctTone(r.pct) : 'sky'} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default WeekProgressList;
