import { cx } from './cx';

const BAR_TONES = {
  mint: 'bg-mint-strong',
  sky: 'bg-sky-strong',
  peach: 'bg-peach-strong',
  lavender: 'bg-lavender-strong',
  butter: 'bg-butter-strong',
};

/** Thin progress bar (original: `Rh`; tone map `gU`). */
export function ProgressBar({ value, max, tone = 'mint' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx('h-full rounded-full transition-all duration-500', BAR_TONES[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default ProgressBar;
