import React, { useMemo, useState } from 'react';
import {
  rt as Card,
  dt as CardTitle,
  wp as useAnalytics,
  ek as useCalendar,
  Xu as buildPeriodOptions,
  $s as shiftPeriod,
  eL as historyLength,
  ic as computeKpis,
  Dh as kpiSeries,
  SR as trackRows,
  lL as useEodOf,
  gh as granularityNoun,
  nk as GranularityTabs,
  rk as KpiTabs,
  ik as PeriodPicker,
  nL as KpiCards,
  rL as ProgressChart,
  sL as DayTrack,
  ak as TimeBreakdown,
  ok as AssignVsStandard,
  oL as TaskHistory,
  lle as TRACK_TITLES,
} from '@/internal/min';

/** Profile "My progress" sections for non-assigner members. (_le) */
export function MyProgress({ me }) {
  const analytics = useAnalytics();
  const calendar = useCalendar();
  const [gran, setGran] = useState('day');
  const [kpi, setKpi] = useState('onTime');
  const [index, setIndex] = useState(0);
  const options = buildPeriodOptions(gran, calendar);
  const safeIndex = Math.min(index, options.length - 1);
  const period = options[safeIndex].period;
  const prevPeriod = shiftPeriod(period, -1);
  const monthCount = buildPeriodOptions('month', calendar).length;
  const history = historyLength(gran, monthCount);
  const current = useMemo(
    () => computeKpis(analytics, gran, period.key, { people: [me] })[0],
    [analytics, gran, period.key, me],
  );
  const points = useMemo(
    () => kpiSeries(analytics, me, gran, kpi, history),
    [analytics, me, gran, kpi, history],
  );
  const rows = useMemo(
    () => trackRows(analytics, me, gran, history),
    [analytics, me, gran, history],
  );
  const eodOf = useEodOf(me);
  const assignedAny = analytics.tasks.some(
    (t) => t.assignedById === me && t.date >= period.from && t.date <= period.to,
  );
  const noun = granularityNoun(gran);

  return (
    <>
      <Card>
        <div data-testid="my-progress">
          <CardTitle right={<GranularityTabs value={gran} onChange={setGran} />}>
            My progress
          </CardTitle>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <KpiTabs value={kpi} onChange={setKpi} />
            <span className="ml-auto">
              <PeriodPicker options={options} index={safeIndex} onChange={setIndex} />
            </span>
          </div>
          {current && (
            <KpiCards
              cur={current}
              prev={current.prev}
              selected={kpi}
              prevLabel={`Previous ${noun}: ${prevPeriod.title}`}
              onSelect={setKpi}
            />
          )}
          <p className="mt-2 text-xs text-muted">
            {period.title}
            {period.partial ? ' (so far)' : ''} compared with the previous {noun},{' '}
            {prevPeriod.title}.
          </p>
          <div className="mt-4">
            <ProgressChart points={points} kpi={kpi} selectedKey={period.key} height={220} />
            <p className="mt-1 text-[11px] text-muted">
              {kpi === 'onTime' ? 'Dashed line: 80% goal. ' : ''}
              Ringed dot: the selected {noun}. Hollow dot: still in progress.
            </p>
          </div>
          <p className="mb-2 mt-4 text-sm font-bold">{TRACK_TITLES[gran]}</p>
          <DayTrack
            rows={rows}
            gran={gran}
            selectedKey={period.key}
            eodOf={eodOf}
            maxHeight="max-h-56"
          />
        </div>
      </Card>
      <Card>
        <CardTitle right={<span className="text-xs text-muted">{period.title}</span>}>
          Where my time goes
        </CardTitle>
        <TimeBreakdown
          personId={me}
          from={period.from}
          to={period.to}
          emptyText={`No time recorded for ${period.title} yet.`}
        />
      </Card>
      {assignedAny && (
        <Card>
          <CardTitle
            right={
              <span className="text-xs text-muted">Tasks I assigned for {period.title}</span>
            }
          >
            How I assign vs standard time
          </CardTitle>
          <AssignVsStandard from={period.from} to={period.to} assignedBy={me} />
        </Card>
      )}
      <Card>
        <CardTitle right={<span className="text-xs text-muted">{period.title}</span>}>
          My task history
        </CardTitle>
        <TaskHistory personId={me} from={period.from} to={period.to} periodTitle={period.title} />
      </Card>
    </>
  );
}

export default MyProgress;
