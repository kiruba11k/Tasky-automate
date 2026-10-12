import { cx } from './cx';

/** Pastel tone -> classes (original: `_R`). */
export const TONE_CLASSES = {
  mint: 'bg-mint text-mint-ink',
  sky: 'bg-sky text-sky-ink',
  peach: 'bg-peach text-peach-ink',
  lavender: 'bg-lavender text-lavender-ink',
  butter: 'bg-butter text-butter-ink',
  coral: 'bg-coral text-coral-ink',
  grey: 'bg-grey text-grey-ink',
};

/** Small pill label (original: `qe`). */
export function Badge({ tone = 'grey', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
