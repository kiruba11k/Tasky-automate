import React, { useMemo, useState } from 'react';
import { Se as useStore } from '@/internal/min';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  rt as Card,
  dt as CardTitle,
  vt as Avatar,
  qe as Badge,
  oe as cn,
  nt as displayName,
  Ws as useTheme,
  wp as useAnalytics,
  ek as useCalendar,
  Xu as buildPeriodOptions,
  $s as shiftPeriod,
  ic as computeKpis,
  Dh as kpiSeries,
  gh as granularityNoun,
  tL as computeChange,
  Go as KPI_IDS,
  Yo as KPI_LABELS,
  sle as KPI_SHORT_LABELS,
  mb as TAG_LABELS,
  yh as KpiValue,
  R1 as ChangeValue,
  vle as Sparkline,
  tk as Segmented,
  nk as GranularityTabs,
  rk as KpiTabs,
  ik as PeriodPicker,
  $e as dayKey,
} from '@/internal/min';
import { TAG_ORDER, roleOf, titleOf, totalKpis } from './peopleUtils';
import { ManagePeople } from './ManagePeople';
import { Button } from '../ui/Button';
import { LeaveBadge } from '../ui/LeaveBadge';
import { PEOPLE } from '../lib/constants';
import { MIN_TIMED } from '../lib/domain';

const WHO_OPTIONS = [
  { id: 'all', label: 'Everyone' },
  { id: 'pm', label: 'Project managers' },
  { id: 'resource', label: 'Resources' },
];

/** People page (route "/people"). (eue) */
export function People() {
  const analytics = useAnalytics();
  const theme = useTheme();
  const calendar = useCalendar();
  const [gran, setGran] = useState('week');
  const [kpi, setKpi] = useState('onTime');
  const [index, setIndex] = useState(() => {
    const day = new Date().getDay();
    return day >= 1 && day <= 3 ? 1 : 0;
  });
  const [who, setWho] = useState('all');
  const [sort, setSort] = useState({ col: 'name', dir: 'asc' });
  const navigate = useNavigate();
  const openPerson = (id) => navigate(`/people/${id}`);
  const [adding, setAdding] = useState(false);
  const me = useStore((s) => s.me);
  const isMainAdmin = !!PEOPLE.find((p) => p.id === me)?.owner; // the account set in ADMIN_EMAIL

  const options = buildPeriodOptions(gran, calendar);
  const safeIndex = Math.min(index, options.length - 1);
  const period = options[safeIndex].period;
  const prevPeriod = shiftPeriod(period, -1);
  const allRows = useMemo(
    () => computeKpis(analytics, gran, period.key),
    [analytics, gran, period.key],
  );
  const trends = useMemo(
    () =>
      new Map(
        allRows.map((row) => [
          row.personId,
          kpiSeries(analytics, row.personId, gran, kpi, 8, { end: period.key }),
        ]),
      ),
    [allRows, analytics, gran, kpi, period.key],
  );
  const rows = useMemo(() => {
    const valueOf = (row, col) =>
      col === 'name'
        ? row.name
        : col === 'change'
          ? row.change[kpi]
          : col === 'tag'
            ? row.tag
              ? TAG_ORDER[row.tag]
              : 1
            : row[col];
    return [...allRows.filter((row) => who === 'all' || roleOf(row.personId) === who)].sort(
      (a, b) => {
        const va = valueOf(a, sort.col);
        const vb = valueOf(b, sort.col);
        if (va == null && vb == null) return a.name.localeCompare(b.name);
        if (va == null) return 1;
        if (vb == null) return -1;
        const diff = typeof va == 'string' ? va.localeCompare(String(vb)) : va - vb;
        return (sort.dir === 'asc' ? diff : -diff) || a.name.localeCompare(b.name);
      },
    );
  }, [allRows, who, sort, kpi]);
  const totals = useMemo(() => totalKpis(rows), [rows]);
  const prevTotals = useMemo(() => totalKpis(rows.map((row) => row.prev)), [rows]);
  const noun = granularityNoun(gran);

  const toggleSort = (col) =>
    setSort((cur) =>
      cur.col === col
        ? { col, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: col === 'name' ? 'asc' : 'desc' },
    );

  const sortHeader = (col, label, className, tooltip) => {
    const active = sort.col === col;
    const SortIcon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th
        key={col}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={cn('px-2 py-2 font-bold', className)}
      >
        <button
          type="button"
          data-sort={col}
          title={tooltip}
          onClick={() => toggleSort(col)}
          className={cn(
            'focus-ring inline-flex items-center gap-1 whitespace-nowrap rounded-md uppercase tracking-wide hover:text-ink',
            active && 'text-ink',
          )}
        >
          {label}
          <SortIcon size={12} aria-hidden className={active ? '' : 'opacity-50'} />
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">People</h1>
          <p className="text-sm text-muted">
            Everyone at a glance. Click a person to see their daily, weekly and monthly performance, task
            history and current work.
          </p>
        </div>
        {isMainAdmin && <Button onClick={() => setAdding(true)}>Manage people</Button>}
      </div>
      {isMainAdmin && <ManagePeople open={adding} onClose={() => setAdding(false)} />}
      <Card className="!py-4">
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2"
          data-testid="people-filters"
        >
          <GranularityTabs value={gran} onChange={(g) => setGran(g)} />
          <PeriodPicker options={options} index={safeIndex} onChange={setIndex} />
          <span className="hidden h-6 w-px bg-line md:block" aria-hidden />
          <KpiTabs value={kpi} onChange={setKpi} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Showing <b className="text-ink">{period.title}</b>
          {period.partial ? ' (so far)' : ''}, compared with the previous {noun} (
          {prevPeriod.title}).
        </p>
      </Card>
      <Card>
        <CardTitle
          right={
            <Segmented label="Who" size="xs" value={who} onChange={setWho} options={WHO_OPTIONS} />
          }
        >
          {['Team, ', period.title]}
        </CardTitle>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm" data-testid="team-table">
            <thead className="text-left text-[11px] text-muted">
              <tr className="border-b border-line">
                {sortHeader('name', 'Person', 'pl-1')}
                {KPI_IDS.map((id) =>
                  sortHeader(
                    id,
                    KPI_SHORT_LABELS[id],
                    cn('text-right', id === kpi && 'bg-accent-soft/50 text-accent-ink'),
                    KPI_LABELS[id],
                  ),
                )}
                {sortHeader(
                  'change',
                  'vs previous',
                  'text-right',
                  `Change in ${KPI_LABELS[kpi]} vs ${prevPeriod.title}`,
                )}
                <th className="px-2 py-2 font-bold uppercase tracking-wide">Trend</th>
                {sortHeader('tag', 'Flag')}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((row) => {
                const trend = trends.get(row.personId) ?? [];
                return (
                  <tr
                    key={row.personId}
                    data-person={row.personId}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2"
                    onClick={() => openPerson(row.personId)}
                  >
                    <td className="py-2 pl-1 pr-2">
                      <button
                        type="button"
                        className="focus-ring flex items-center gap-2 rounded-lg text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPerson(row.personId);
                        }}
                      >
                        <Avatar id={row.personId} size="sm" />
                        <span>
                          <span className="font-semibold">{displayName(row.personId)}</span>{' '}
                          <LeaveBadge personId={row.personId} date={dayKey(0)} />
                          <br />
                          <span className="text-xs text-muted">{titleOf(row.personId)}</span>
                        </span>
                      </button>
                    </td>
                    {KPI_IDS.map((id) => (
                      <td
                        key={id}
                        data-kpi={id}
                        className={cn(
                          'px-2 py-2 text-right',
                          id === kpi ? 'bg-accent-soft/50 text-base font-bold' : 'font-medium',
                        )}
                      >
                        <KpiValue kpi={id} v={row[id]} />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right" data-col="change">
                      <ChangeValue kpi={kpi} v={row.change[kpi]} />
                    </td>
                    <td className="px-2 py-2">
                      <Sparkline
                        values={trend.map((p) => p.value)}
                        color={theme.accent}
                        label={`${KPI_LABELS[kpi]}, last ${trend.length} ${noun}s: ${trend
                          .map((p) => (p.value == null ? 'n/a' : p.value))
                          .join(', ')}`}
                      />
                    </td>
                    <td className="px-2 py-2" data-col="tag">
                      {row.tag ? (
                        <span title={row.tagReason}>
                          <Badge tone={row.tag === 'acknowledge' ? 'mint' : 'coral'}>
                            {TAG_LABELS[row.tag]}
                          </Badge>
                        </span>
                      ) : (
                        <span className="text-xs text-faint">{row.tagReason || 'None'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="tabular-nums">
              <tr className="border-t-2 border-line text-muted" data-testid="team-total">
                <td className="py-2 pl-1 pr-2 text-xs font-bold uppercase tracking-wide">Team</td>
                {KPI_IDS.map((id) => (
                  <td
                    key={id}
                    className={cn(
                      'px-2 py-2 text-right font-semibold text-ink',
                      id === kpi && 'bg-accent-soft/50',
                    )}
                  >
                    <KpiValue kpi={id} v={totals[id]} />
                  </td>
                ))}
                <td className="px-2 py-2 text-right">
                  <ChangeValue kpi={kpi} v={computeChange(totals[kpi], prevTotals[kpi])} />
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Click a column to sort, click a person to open their page. Flags compare each person with
          the team in the same {noun}, and need at least {MIN_TIMED} timed items in the period. Hours logged is time worked (plan blocks,
          day tables and submitted tasks, the larger per project, Saturdays and Sundays included, as in each person's Weekly hours); extra
          hours come from end-of-day updates. Tasks done counts submitted tasks, work ticked off in the day tables and, for a day and project
          that has neither, each plan block with time worked as one item. On time compares the time taken with the target: a task's target
          minutes, a table row's estimate, or a plan block's planned length (on time means no more than 10% over the target, so a few
          minutes over a long task is not late). While a {noun} is still running, vs previous sets it against the same number of days of the previous {noun}; an on-time
          change is only shown when both {noun}s have at least {MIN_TIMED} timed items.
        </p>
      </Card>
    </div>
  );
}

export default People;
