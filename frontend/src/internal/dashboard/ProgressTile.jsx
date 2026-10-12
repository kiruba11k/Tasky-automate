import { oe as cx } from '@/internal/min';
import { ProgressMeter } from './ProgressMeter';
import { progressTone, PROGRESS_CHIP_CLASSES } from './progressTones';

/** KPI tile: big number, target, percentage chip and a small bar. */
export function ProgressTile({ label, value, target, auto }) {
  const pct = target ? Math.round((value / target) * 100) : null;
  const tone = progressTone(pct);
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-soft">
      <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted" title={label}>
        {label}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-1">
        <span className="text-2xl font-extrabold leading-none">{value}</span>
        {target ? <span className="text-sm text-muted">/ {target}</span> : null}
        {pct != null && (
          <span className={cx('ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold', PROGRESS_CHIP_CLASSES[tone])}>
            {pct}%
          </span>
        )}
      </p>
      <ProgressMeter className="mt-2 h-2" pct={pct ?? 0} tone={tone} />
      {auto ? <p className="mt-1 truncate text-[10px] text-accent-ink">+{auto} auto from tasks</p> : null}
    </div>
  );
}

export default ProgressTile;
