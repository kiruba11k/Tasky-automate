import React, { useMemo } from 'react';
import { JV as timeBreakdown, We as formatMinutes } from '@/internal/min';
import { useChartColors, useDataSnapshot } from './chartTheme';
import { useProjectColor } from './projectColors';
import { TimeBreakdownChart, groupRest } from './TimeBreakdownChart';

/** "Where the time goes" breakdown by project and task type. (bundle: ak) */
export function WhereTimeGoes({
  personId,
  from,
  to,
  emptyText = 'No time recorded in this period yet.',
}) {
  const snapshot = useDataSnapshot();
  const colors = useChartColors();
  const projectColor = useProjectColor();
  const breakdown = useMemo(
    () => timeBreakdown(snapshot, { personId, from, to }),
    [snapshot, personId, from, to],
  );
  return (
    <div data-testid="where-time-goes" data-total={breakdown.totalMin}>
      {breakdown.totalMin === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">
          {emptyText}
          {breakdown.extraMin > 0 && ` Extra hours: ${formatMinutes(Math.round(breakdown.extraMin))}.`}
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            <b className="text-base text-ink tabular-nums">
              {formatMinutes(Math.round(breakdown.totalMin))}
            </b>
            {' worked, the same as Hours logged: plan blocks, day tables and submitted tasks (the larger per project).'}
            {breakdown.extraMin > 0 && ` Extra hours (${formatMinutes(Math.round(breakdown.extraMin))}) are counted separately.`}
          </p>
          <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
            <TimeBreakdownChart
              title="By project"
              rows={groupRest(breakdown.byProject, 6)}
              total={breakdown.totalMin}
              color={projectColor}
            />
            <TimeBreakdownChart
              title="By task type"
              rows={groupRest(breakdown.byType, 8)}
              total={breakdown.totalMin}
              color={(id) => (id === 'plan' ? colors.butter : colors.accent)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default WhereTimeGoes;
