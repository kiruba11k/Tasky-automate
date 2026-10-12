import React, { useMemo, useState } from 'react';
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
  ak as TimeBreakdown,
  ok as AssignVsStandard,
} from '@/internal/min';
import { TAG_ORDER, roleOf, titleOf, totalKpis } from './peopleUtils';
import { PersonDetailModal } from './PersonDetail';

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
  const [openPerson, setOpenPerson] = useState(null);

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
  const acknowledge = allRows.filter((row) => row.tag === 'acknowledge');
  const support = allRows.filter((row) => row.tag === 'support');
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

  const callouts = [
    ['acknowledge', acknowledge, 'Top performers this ' + noun],
    ['support', support, 'May need support or training'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">People</h1>
        <p className="text-sm text-muted">
          Everyone's daily, weekly and monthly progress: who to acknowledge, who needs support, and
          where the time goes.
        </p>
      </div>
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
      <div className="grid gap-4 md:grid-cols-2">
        {callouts.map(([tag, list, hint]) => (
          <Card
            key={tag}
            className={cn(
              'border-l-4',
              tag === 'acknowledge' ? 'border-mint-strong' : 'border-coral-strong',
            )}
          >
            <div data-testid={`callout-${tag}`}>
              <CardTitle right={<span className="text-xs text-muted">{hint}</span>}>
                {TAG_LABELS[tag]}
              </CardTitle>
              {list.length === 0 ? (
                <p className="text-sm text-muted">Nobody in this {noun}.</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((row) => (
                    <li key={row.personId}>
                      <button
                        type="button"
                        onClick={() => setOpenPerson(row.personId)}
                        className="focus-ring flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-surface-2"
                      >
                        <Avatar id={row.personId} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {displayName(row.personId)}
                          </span>
                          <span className="block text-xs text-muted">{row.tagReason}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        ))}
      </div>
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
                    onClick={() => setOpenPerson(row.personId)}
                  >
                    <td className="py-2 pl-1 pr-2">
                      <button
                        type="button"
                        className="focus-ring flex items-center gap-2 rounded-lg text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPerson(row.personId);
                        }}
                      >
                        <Avatar id={row.personId} size="sm" />
                        <span>
                          <span className="font-semibold">{displayName(row.personId)}</span>
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
          Click a column to sort, click a person for their profile. Flags compare each person with
          the team in the same {noun}. Hours logged is time recorded on submitted tasks; extra hours
          come from end-of-day updates.
        </p>
      </Card>
      <Card>
        <CardTitle
          right={<span className="text-xs text-muted">{['Team, ', period.title]}</span>}
        >
          Where time goes
        </CardTitle>
        <TimeBreakdown from={period.from} to={period.to} />
      </Card>
      <Card>
        <CardTitle
          right={<span className="text-xs text-muted">Tasks assigned for {period.title}</span>}
        >
          Assigned vs standard time, by assigner
        </CardTitle>
        <AssignVsStandard from={period.from} to={period.to} />
      </Card>
      <PersonDetailModal
        personId={openPerson}
        gran={gran}
        kpi={kpi}
        index={safeIndex}
        onClose={() => setOpenPerson(null)}
      />
    </div>
  );
}

export default People;
