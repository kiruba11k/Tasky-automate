import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Se as useStore,
  ic as computePeriodRows,
  hf as periodInfo,
  Ca as KPI_HINTS,
  rt as Card,
  dt as CardTitle,
} from '@/internal/min';
import { sumPeriodRows } from './weekStats';

/** "This week at a glance" KPI card for the manager dashboard. (bundle: VU) */
export function WeekGlance() {
  const tasks = useStore((s) => s.tasks);
  const daily = useStore((s) => s.daily);
  const {
    cur,
    prev,
    title,
    people,
  } = useMemo(() => {
    const rows = computePeriodRows({ tasks, daily }, 'week', 'current');
    return {
      cur: sumPeriodRows(rows),
      prev: sumPeriodRows(rows.map((row) => row.prev)),
      title: periodInfo('week').title,
      people: rows.length,
    };
  }, [tasks, daily]);

  const items = [
    {
      key: 'tasks',
      label: 'Tasks done',
      value: String(cur.tasks),
      last: String(prev.tasks),
      hint: KPI_HINTS.tasks,
    },
    {
      key: 'onTime',
      label: 'On time',
      value: cur.onTime == null ? 'No tasks yet' : `${cur.onTime}%`,
      last: prev.onTime == null ? 'none' : `${prev.onTime}%`,
      hint: KPI_HINTS.onTime,
    },
    {
      key: 'hours',
      label: 'Hours logged',
      value: `${cur.hours}h`,
      last: `${prev.hours}h`,
      hint: KPI_HINTS.hours,
    },
    {
      key: 'extra',
      label: 'Extra hours',
      value: `${cur.extra}h`,
      last: `${prev.extra}h`,
      hint: KPI_HINTS.extra,
    },
  ];

  return (
    <Card>
      <CardTitle
        right={
          <span className="text-xs text-muted">
            {title}
            {' · team of '}
            {people}
            {' · '}
            <Link
              to="/people"
              className="focus-ring rounded font-semibold text-accent-ink hover:underline"
            >
              See everyone
            </Link>
          </span>
        }
      >
        This week at a glance
      </CardTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="week-glance">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-xl bg-surface-2 px-3 py-2.5"
            title={item.hint}
            data-kpi={item.key}
          >
            <p className="text-xs font-semibold text-muted">{item.label}</p>
            <p className="text-xl font-extrabold tabular-nums">{item.value}</p>
            <p className="text-[11px] text-muted">Last week {item.last}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default WeekGlance;
