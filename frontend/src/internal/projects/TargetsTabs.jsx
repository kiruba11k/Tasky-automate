import React, { useState } from 'react';
import { oe as clsx } from '@/internal/min';
import { PeriodManager } from './PeriodManager';

/** Targets tab: Weekly / Monthly switch over the week or month manager. */
export function TargetsTabs({ p }) {
  const [period, setPeriod] = useState('week');
  return (
    <div className="space-y-3">
      <div className="flex w-fit rounded-full bg-surface-2 p-1" role="tablist" aria-label="Weekly or monthly targets">
        {['week', 'month'].map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={period === id}
            onClick={() => setPeriod(id)}
            className={clsx(
              'focus-ring rounded-full px-5 py-1.5 text-sm font-semibold transition',
              period === id ? 'bg-accent text-accent-on shadow-soft' : 'text-muted',
            )}
          >
            {id === 'week' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>
      <PeriodManager key={period} p={p} period={period} />
    </div>
  );
}

export default TargetsTabs;
