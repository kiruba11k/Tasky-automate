import React from 'react';
import { oe as cn } from '@/internal/min';
import { DIFFICULTY_BANDS } from './difficulty';

/** Stacked horizontal bar of challenging / standard / easy shares. (bundle: UU) */
export function DifficultyBar({ mix }) {
  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
      role="img"
      aria-label={DIFFICULTY_BANDS.map((band) => `${mix.pct[band.key]}% ${band.label}`).join(', ')}
    >
      {DIFFICULTY_BANDS.map(
        (band) =>
          mix[band.key] > 0 && (
            <div
              key={band.key}
              className={cn('h-full', band.bar)}
              style={{ width: `${(mix[band.key] / Math.max(1, mix.total)) * 100}%` }}
            />
          ),
      )}
    </div>
  );
}

export default DifficultyBar;
