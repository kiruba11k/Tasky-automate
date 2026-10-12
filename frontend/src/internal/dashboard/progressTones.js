/** Colour tone for a percentage of target reached. */
export const progressTone = (pct) =>
  pct == null ? 'grey' : pct >= 100 ? 'mint' : pct >= 70 ? 'sky' : pct >= 40 ? 'butter' : 'coral';

export const PROGRESS_FILL_CLASSES = {
  mint: 'bg-mint-strong',
  sky: 'bg-sky-strong',
  butter: 'bg-butter-strong',
  coral: 'bg-coral-strong',
  grey: 'bg-grey-strong',
};

export const PROGRESS_CHIP_CLASSES = {
  mint: 'bg-mint text-mint-ink',
  sky: 'bg-sky text-sky-ink',
  butter: 'bg-butter text-butter-ink',
  coral: 'bg-coral text-coral-ink',
  grey: 'bg-grey text-grey-ink',
};
