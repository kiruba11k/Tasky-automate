import { oe as cx } from '@/internal/min';
import { PROGRESS_FILL_CLASSES } from './progressTones';

/** Thin progress bar with an optional "expected by today" tick. */
export function ProgressMeter({ pct, tone, expected, className }) {
  return (
    <div
      className={cx('relative h-2.5 w-full rounded-full bg-surface-2 ring-1 ring-inset ring-line/60', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx('h-full rounded-full transition-all duration-500', PROGRESS_FILL_CLASSES[tone])}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
      {expected != null && (
        <span
          className="absolute -inset-y-1 w-0.5 rounded bg-ink/40"
          style={{ left: `${Math.min(100, expected)}%` }}
          title="Where you would expect to be by the end of today"
        />
      )}
    </div>
  );
}

export default ProgressMeter;
