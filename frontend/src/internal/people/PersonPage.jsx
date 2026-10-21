import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Se as useStore,
  Qe as PEOPLE,
  rt as Card,
  dt as CardTitle,
  vt as Avatar,
  qe as Badge,
  oe as cn,
  nt as displayName,
  wp as useAnalytics,
  ek as useCalendar,
  Xu as buildPeriodOptions,
  ic as computeKpis,
  mb as TAG_LABELS,
  Go as KPI_IDS,
  Yo as KPI_LABELS,
  sle as KPI_SHORT_LABELS,
  yh as KpiValue,
  nk as GranularityTabs,
  ak as TimeBreakdown,
  We as formatMinutes,
  $e as dayKey,
} from '@/internal/min';
import { LeaveBadge } from '../ui/LeaveBadge';
import { eodStatusText } from '../lib/eodReview';
import { HistoryCalendar } from './HistoryCalendar';
import { TaskLine } from './TaskLine';
import { dayHours, dayHasTime, personMetrics, isSubmitted, workDate, NOT_ENOUGH_DATA } from '../lib/domain';
import { recordWithAssigned } from '../lib/assigned';
import { leaveOn } from '../lib/leave';
import { WEEKDAY_SHORT, addDays, formatDayMonth, isWeekday, parseDateKey } from '../lib/dates';


/** A person's own page (route "/people/:id"): performance by period, where time goes, task history, day by day, current tasks. (ede) */
export function PersonPage() {
  const { id = '' } = useParams();
  const analytics = useAnalytics();
  const calendar = useCalendar();
  const { tasks, daily, profiles, projects } = useStore();
  const person = PEOPLE.find((p) => p.id === id);
  const [gran, setGran] = useState('week');
  const options = buildPeriodOptions(gran, calendar);
  const rows = useMemo(
    () => options.map((o) => ({ o, r: computeKpis(analytics, gran, o.period.key, { people: [id] })[0] })),
    [options, analytics, gran, id],
  );
  const [index, setIndex] = useState(0);
  const selected = options[Math.min(index, options.length - 1)];
  const period = selected?.period;
  const mine = useMemo(() => tasks.filter((t) => t.assigneeId === id), [tasks, id]);
  const open = mine.filter((t) => t.status !== 'done').sort((a, b) => a.date.localeCompare(b.date));
  // the last 10 working days; a Saturday or Sunday joins them when that day holds any time or finished work
  const days = useMemo(() => {
    const out = [];
    let day = dayKey(0);
    for (let n = 0; out.length < 10 && n < 60; n++, day = addDays(day, -1)) {
      const hasWork =
        dayHasTime(dayHours(recordWithAssigned(mine, daily, id, day, { projects, carry: false }))) ||
        mine.some((t) => t.date === day || (isSubmitted(t) && workDate(t) === day));
      if (isWeekday(day) || hasWork) out.push(day);
    }
    return out;
  }, [mine, daily, id, projects]);
  const flagRow = useMemo(
    () => (period ? computeKpis(analytics, gran, period.key).find((r) => r.personId === id) : undefined),
    [analytics, gran, period, id],
  );

  if (!person)
    return (
      <Card>
        <p className="text-sm">
          Person not found.{' '}
          <Link className="font-semibold text-accent-ink" to="/people">
            Back to People
          </Link>
        </p>
      </Card>
    );

  return (
    <div className="space-y-6" data-testid="person-page">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/people"
          className="focus-ring flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-accent-ink hover:bg-surface-2"
        >
          <ArrowLeft size={15} /> People
        </Link>
        <Avatar id={id} size="lg" />
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            {displayName(id)} <LeaveBadge personId={id} date={dayKey(0)} />
          </h1>
          <p className="text-sm text-muted">{person.title}</p>
        </div>
      </div>
      <Card>
        <CardTitle
          right={
            <GranularityTabs
              value={gran}
              onChange={(g) => {
                setGran(g);
                setIndex(0);
              }}
            />
          }
        >
          Performance
        </CardTitle>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm" data-testid="person-kpis">
            <thead className="text-left text-[11px] uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="px-2 py-2">{gran === 'day' ? 'Day' : gran === 'week' ? 'Week' : 'Month'}</th>
                {KPI_IDS.map((k) => (
                  <th key={k} className="px-2 py-2 text-right" title={KPI_LABELS[k]}>
                    {KPI_SHORT_LABELS[k]}
                  </th>
                ))}
                <th className="px-2 py-2 text-right">Assigned</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map(({ o, r }, i) => (
                <tr
                  key={o.period.key}
                  className={cn(
                    'border-b border-line/70 last:border-0',
                    i === index && 'bg-accent-soft/40',
                    'cursor-pointer hover:bg-surface-2',
                  )}
                  onClick={() => setIndex(i)}
                  title="Show where time went for this period"
                >
                  <td className="px-2 py-1.5 font-medium">{o.label}</td>
                  {KPI_IDS.map((k) => (
                    <td key={k} className="px-2 py-1.5 text-right">
                      <KpiValue kpi={k} v={r?.[k]} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right text-muted">{r?.assigned ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected && flagRow && (
          <p className="mt-2 text-xs text-muted" data-testid="person-flag">
            {selected.label}:{' '}
            {flagRow.tag ? (
              <span title={flagRow.tagReason}>
                <Badge tone={flagRow.tag === 'acknowledge' ? 'mint' : 'coral'}>{TAG_LABELS[flagRow.tag]}</Badge> {flagRow.tagReason}
              </span>
            ) : (
              <span>{flagRow.tagReason || 'No flag'}{flagRow.tagReason === NOT_ENOUGH_DATA ? ' (needs 3 timed items)' : ''}</span>
            )}
          </p>
        )}
      </Card>
      {period && (
        <Card>
          <CardTitle
            right={<span className="text-xs text-muted">{selected.label} · click a row above to change</span>}
          >
            Where time goes
          </CardTitle>
          <TimeBreakdown personId={id} from={period.from} to={period.to} />
        </Card>
      )}
      <Card>
        <CardTitle>Task history</CardTitle>
        <HistoryCalendar tasks={mine} personId={id} />
      </Card>
      <Card>
        <CardTitle right={<span className="text-xs text-muted">Last 10 working days</span>}>Day by day</CardTitle>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm" data-testid="day-by-day">
            <thead className="text-left text-[11px] uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="px-2 py-2">Day</th>
                <th className="px-2 py-2 text-right">Assigned</th>
                <th className="px-2 py-2 text-right">Submitted</th>
                <th className="px-2 py-2 text-right">Approved</th>
                <th className="px-2 py-2 text-right">On time</th>
                <th className="px-2 py-2 text-right">Planned</th>
                <th className="px-2 py-2 text-right">Actual</th>
                <th className="px-2 py-2 text-right">Extra</th>
                <th className="px-2 py-2">End of day</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {days.map((day) => {
                // the same figures as the Team table: tasks, ticked-off table rows and worked plan blocks
                const m = personMetrics(mine, daily, id, day, day);
                const approved = mine.filter((t) => t.approvedAt?.slice(0, 10) === day);
                const onTime = m.onTime;
                const entry = daily[`${id}|${day}`];
                const hours = dayHours(recordWithAssigned(mine, daily, id, day, { projects, carry: false }));
                return (
                  <tr key={day} className="border-b border-line/70 last:border-0" data-day-row={day}>
                    <td className="px-2 py-1.5 font-medium">
                      {WEEKDAY_SHORT[parseDateKey(day).getDay()]} {formatDayMonth(day)}{' '}
                      <LeaveBadge personId={id} date={day} />
                    </td>
                    <td className="px-2 py-1.5 text-right">{m.assigned}</td>
                    <td className="px-2 py-1.5 text-right">{m.tasks}</td>
                    <td className="px-2 py-1.5 text-right">{approved.length}</td>
                    <td className="px-2 py-1.5 text-right">
                      {onTime == null ? <span className="text-muted">n/a</span> : `${onTime}%`}
                    </td>
                    <td className="px-2 py-1.5 text-right text-muted">
                      {hours.plannedMin ? formatMinutes(hours.plannedMin) : '·'}
                    </td>
                    <td className="px-2 py-1.5 text-right">{hours.actualMin ? formatMinutes(hours.actualMin) : '·'}</td>
                    <td className="px-2 py-1.5 text-right">{hours.extraMin ? formatMinutes(hours.extraMin) : '·'}</td>
                    <td className="px-2 py-1.5">
                      {!entry?.eodAt && leaveOn(profiles, id, day) ? (
                        <span className="text-xs font-semibold text-lavender-ink">On leave</span>
                      ) : entry?.eodAt ? (
                        <span
                          className="inline-flex flex-wrap items-center gap-1.5"
                          title={Object.entries(entry.eodReviews ?? {})
                            .map(([pid, r]) => `${projects.find((p) => p.id === pid)?.name ?? 'Project'}: ${eodStatusText(r, displayName(r.reviewerId).split(' ')[0], displayName(r.by ?? r.reviewerId).split(' ')[0])?.text}`)
                            .join('\n') || undefined}
                        >
                          <Badge tone="mint">
                            Sent{' '}
                            {new Date(entry.eodAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Badge>
                          {Object.values(entry.eodReviews ?? {}).some((r) => r.status === 'changes') ? (
                            <Badge tone="coral">Changes asked</Badge>
                          ) : Object.values(entry.eodReviews ?? {}).some((r) => r.status === 'pending') ? (
                            <Badge tone="butter">Awaiting approval</Badge>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Not sent</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardTitle right={<span className="text-xs text-muted">{open.length} open</span>}>Current tasks</CardTitle>
        {open.length === 0 ? (
          <p className="text-sm text-muted">Nothing open right now.</p>
        ) : (
          <ul data-testid="current-tasks">
            {open.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-2 border-b border-line/70 py-1.5 text-sm last:border-0"
              >
                <span className="w-24 shrink-0 text-xs text-muted">
                  {t.date < dayKey(0) ? `From ${formatDayMonth(t.date)}` : t.date === dayKey(0) ? 'Today' : formatDayMonth(t.date)}
                </span>
                <ul className="min-w-0 flex-1">
                  <TaskLine t={t} />
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default PersonPage;
