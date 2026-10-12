import { useMemo } from 'react';
import { Se as useStore } from '@/internal/min';
import { formatClock } from './timeFormat';

/**
 * Returns a function day -> end-of-day sent time ("HH:MM"), "" if the record
 * exists but nothing was sent, or null when there is no record. (bundle: lL)
 */
export function useEodLookup(personId) {
  const daily = useStore((s) => s.daily);
  return useMemo(
    () => (day) => {
      const entry = daily[`${personId}|${day}`];
      return entry ? (entry.eodAt ? formatClock(new Date(entry.eodAt)) : '') : null;
    },
    [daily, personId],
  );
}
