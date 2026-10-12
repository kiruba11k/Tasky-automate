import { useMemo } from 'react';
import { $e as dayKey, qw as recentPeriods } from '@/internal/min';

/** Granularities offered in the selector. (bundle: ole) */
export const GRANULARITIES = ['day', 'week', 'month'];

/** How many periods to chart for a granularity. (bundle: eL) */
export const trendLength = (gran, count) =>
  gran === 'day' ? 20 : gran === 'week' ? 12 : Math.max(3, count);

/** Short KPI labels. (bundle: sle) */
export const KPI_SHORT_LABELS = {
  onTime: 'On time',
  tasks: 'Tasks done',
  hours: 'Hours logged',
  extra: 'Extra hours',
  resubmits: 'Resubmits',
};

/** Table headings for the track per granularity. (bundle: lle) */
export const TRACK_TITLES = {
  day: 'Day-by-day track',
  week: 'Week-by-week track',
  month: 'Month-by-month track',
};

const UNIT_WORDS = { day: 'day', week: 'week', month: 'month' };

/** Granularity -> unit word. (bundle: gh) */
export const granularityUnit = (gran) => UNIT_WORDS[gran];

/** Label for a period in the period selector. (bundle: cle) */
export function periodOptionLabel(period, index) {
  return period.gran === 'day'
    ? index === 0
      ? period.key === dayKey(0)
        ? `Today, ${period.title}`
        : `${period.title} (latest)`
      : index === 1
        ? `${period.title} (previous day)`
        : period.title
    : period.gran === 'week'
      ? index === 0
        ? `This week, ${period.title}`
        : index === 1
          ? `Last week, ${period.title}`
          : `Week of ${period.title}`
      : index === 0
        ? `This month, ${period.title}`
        : index === 1
          ? `Last month, ${period.title}`
          : period.title;
}

/** Options for the period selector, newest first. (bundle: Xu) */
export function usePeriodOptions(gran, earliest) {
  return useMemo(
    () =>
      recentPeriods(gran, gran === 'day' ? 15 : gran === 'week' ? 12 : 6)
        .reverse()
        .filter((period, index) => index < 2 || period.to >= earliest)
        .map((period, index) => ({ period, label: periodOptionLabel(period, index) })),
    [gran, earliest],
  );
}
