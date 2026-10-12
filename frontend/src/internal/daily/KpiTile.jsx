import { oe as cx, Rh as ProgressBar } from '@/internal/min';

/** Clickable "done / total" tile used to filter people who are still pending. */
export function KpiTile({ icon, label, done, total, active, onClick }) {
  const pending = total - done;
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      data-testid="kpi-tile"
      className={cx(
        'focus-ring rounded-card border-2 bg-surface p-4 text-left shadow-soft transition',
        active ? 'border-accent' : 'border-transparent hover:border-line',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-muted">
          {icon}
          {label}
        </span>
        <span
          className={cx(
            'rounded-full px-2 py-0.5 text-[11px] font-bold',
            pending ? 'bg-butter text-butter-ink' : 'bg-mint text-mint-ink',
          )}
        >
          {pending ? `${pending} pending` : 'Everyone in'}
        </span>
      </span>
      <span className="mt-1 block text-3xl font-extrabold tabular-nums" data-testid="kpi-value">
        {done}/{total}
      </span>
      <span className="mt-2 block">
        <ProgressBar value={done} max={total} tone={pending ? 'sky' : 'mint'} />
      </span>
      <span className="mt-2 block text-xs text-muted">
        {active
          ? 'Showing who is pending. Click again to show everyone.'
          : pending
            ? 'Click to see who is pending'
            : 'Nobody is pending'}
      </span>
    </button>
  );
}

export default KpiTile;
