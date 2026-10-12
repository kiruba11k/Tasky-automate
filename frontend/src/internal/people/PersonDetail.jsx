import React, { useMemo, useState } from 'react';
import {
  Se as useStore,
  Qe as PEOPLE,
  Ya as Modal,
  vt as Avatar,
  nt as displayName,
  dt as CardTitle,
  qe as Badge,
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
  yt as formatDate,
  aL as resubmitLabel,
  mi as STATUS_META,
  mb as TAG_LABELS,
  nk as GranularityTabs,
  rk as KpiTabs,
  ik as PeriodPicker,
  nL as KpiCards,
  rL as ProgressChart,
  sL as DayTrack,
  ak as TimeBreakdown,
  oL as TaskHistory,
} from '@/internal/min';

/** Body of the person KPI drill-down modal. (Xle) */
export function PersonDetailBody({ personId, g0, k0, i0 }) {
  const analytics = useAnalytics();
  const tasks = useStore((s) => s.tasks);
  const calendar = useCalendar();
  const [gran, setGran] = useState(g0);
  const [kpi, setKpi] = useState(k0);
  const [index, setIndex] = useState(i0);
  const options = buildPeriodOptions(gran, calendar);
  const period = options[Math.min(index, options.length - 1)].period;
  const prevPeriod = shiftPeriod(period, -1);
  const monthCount = buildPeriodOptions('month', calendar).length;
  const current = useMemo(
    () => computeKpis(analytics, gran, period.key).find((r) => r.personId === personId),
    [analytics, gran, period.key, personId],
  );
  const points = useMemo(
    () => kpiSeries(analytics, personId, gran, kpi, historyLength(gran, monthCount)),
    [analytics, personId, gran, kpi, monthCount],
  );
  const dayRows = useMemo(() => trackRows(analytics, personId, 'day', 20), [analytics, personId]);
  const eodOf = useEodOf(personId);
  const openTasks = tasks
    .filter((t) => t.assigneeId === personId && !t.historic && t.status !== 'done')
    .sort((a, b) => a.date.localeCompare(b.date));
  const noun = granularityNoun(gran);

  return (
    <div className="space-y-6 pb-2" data-testid="person-modal" data-person={personId}>
      <div className="flex flex-wrap items-center gap-2">
        <GranularityTabs value={gran} onChange={setGran} />
        <PeriodPicker options={options} index={index} onChange={setIndex} />
        {current?.tag && (
          <span
            className="ml-auto flex items-center gap-2 text-xs text-muted"
            data-testid="person-tag"
          >
            <Badge tone={current.tag === 'acknowledge' ? 'mint' : 'coral'}>
              {TAG_LABELS[current.tag]}
            </Badge>
            <span className="max-w-xs">{current.tagReason}</span>
          </span>
        )}
      </div>
      <KpiTabs value={kpi} onChange={setKpi} />
      {current && (
        <KpiCards
          cur={current}
          prev={current.prev}
          selected={kpi}
          prevLabel={`Previous ${noun}: ${prevPeriod.title}`}
          onSelect={setKpi}
        />
      )}
      <section>
        <CardTitle>Progress over time</CardTitle>
        <ProgressChart points={points} kpi={kpi} selectedKey={period.key} />
        <p className="mt-1 text-[11px] text-muted">
          {kpi === 'onTime' ? 'Dashed line: 80% goal. ' : ''}
          Ringed dot: the selected {noun}. Hollow dot: still in progress.
        </p>
      </section>
      <section>
        <CardTitle right={<span className="text-xs text-muted">{period.title}</span>}>
          Where time goes
        </CardTitle>
        <TimeBreakdown personId={personId} from={period.from} to={period.to} />
      </section>
      <section>
        <CardTitle right={<span className="text-xs text-muted">{period.title}</span>}>
          Task history
        </CardTitle>
        <TaskHistory
          personId={personId}
          from={period.from}
          to={period.to}
          periodTitle={period.title}
        />
      </section>
      <section>
        <CardTitle right={<span className="text-xs text-muted">Last 20 working days</span>}>
          Day-by-day track
        </CardTitle>
        <DayTrack
          rows={dayRows}
          gran="day"
          selectedKey={gran === 'day' ? period.key : undefined}
          eodOf={eodOf}
        />
      </section>
      <section>
        <CardTitle>Current tasks</CardTitle>
        {openTasks.length === 0 ? (
          <p className="text-sm text-muted">No open tasks right now.</p>
        ) : (
          <ul className="divide-y divide-line">
            {openTasks.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="first-letter:uppercase">{t.title}</span>
                  <span className="block text-xs text-muted">{formatDate(t.date)}</span>
                </span>
                {(t.resubmits ?? 0) > 0 && <Badge tone="butter">{resubmitLabel(t.resubmits)}</Badge>}
                <Badge tone={STATUS_META[t.status].tone}>{STATUS_META[t.status].label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Modal wrapping the person drill-down. (Yle) */
export function PersonDetailModal({ personId, gran, kpi, index, onClose }) {
  const person = PEOPLE.find((p) => p.id === personId);
  return (
    <Modal
      open={!!person}
      onClose={onClose}
      size="lg"
      className="sm:max-w-5xl"
      title={
        person ? (
          <span className="flex items-center gap-3">
            <Avatar id={person.id} size="md" />
            <span>
              {displayName(person.id)}
              <span className="block text-xs font-medium text-muted">{person.title}</span>
            </span>
          </span>
        ) : (
          ''
        )
      }
    >
      {person && (
        <PersonDetailBody key={person.id} personId={person.id} g0={gran} k0={kpi} i0={index} />
      )}
    </Modal>
  );
}

export default PersonDetailModal;
