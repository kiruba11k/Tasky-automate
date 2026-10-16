import React, { useState, useMemo } from 'react';
import { Sunrise, CalendarRange, Moon, CalendarCheck2 } from 'lucide-react';
import {
  Se as useStore,
  jp as TODAY_KEY,
  Xt as weekKeyOf,
  nc as TEAM_IDS,
  nt as personName,
  Qe as PEOPLE,
  B1 as dailyRowsFor,
  hL as weeklyRowsFor,
  kR as weeklyHours,
  UV as dailyStats,
  WV as weeklyStats,
  sk as formatWeek,
  uL as DateNav,
  oe as cn,
  VM as StatusFilterCard,
  rt as Card,
  Vle as PersonUpdateCard,
  vt as Avatar,
  qe as Badge,
} from '@/internal/min';
import { EntriesLog } from '../daily/EntriesLog';
import { WeeklyUpdate } from '../daily/WeeklyUpdate';
import { leaveLabel, leaveOn } from '../lib/leave';
import { dayHours as dailyHours, dayRecordWithTaskTime } from '../lib/domain';

/** Manager view of "/daily": team tasks update (daily or weekly). */
export function ManagerDaily() {
  const { daily, weekly, tasks, projects, profiles } = useStore();
  const [view, setView] = useState('daily');
  const [date, setDate] = useState(TODAY_KEY);
  const [sheet, setSheet] = useState('sheets'); // summary cards, or each person's task tables
  const [filter, setFilter] = useState('all');
  const weekKey = weekKeyOf(date);
  const ids = useMemo(() => [...TEAM_IDS].sort((a, b) => personName(a).localeCompare(personName(b))), []);
  const results = useMemo(
    () =>
      ids.map((id) => {
        const person = PEOPLE.find((z) => z.id === id);
        if (view === 'daily') {
          const entry = daily[`${id}|${date}`];
          const { rows, sent } = dailyRowsFor(tasks, projects, id, date, entry);
          return {
            id,
            name: personName(id),
            title: person.title,
            rows,
            sent,
            targetsAt: entry?.sodAt,
            sentAt: entry?.eodAt,
            hours: dailyHours(dayRecordWithTaskTime(tasks, daily, id, date)),
            note: (sent ? entry?.eodNote : entry?.sodNote) || entry?.sodNote,
            leave: leaveLabel(leaveOn(profiles, id, date)),
          };
        }
        const entry = weekly[`${id}|${weekKey}`];
        const { rows, sent } = weeklyRowsFor(tasks, id, weekKey, entry, undefined, daily, projects);
        const hours = weeklyHours(daily, id, weekKey, tasks);
        return {
          id,
          name: personName(id),
          title: person.title,
          rows,
          sent,
          targetsAt: entry?.targetsAt,
          sentAt: entry?.eowAt,
          hours,
          note: (sent ? entry?.eowNote : entry?.targetsNote) || entry?.targetsNote,
        };
      }),
    [profiles, ids, view, daily, weekly, tasks, projects, date, weekKey],
  );
  const dayStats = dailyStats({ daily }, date, ids);
  const weekStats = weeklyStats({ weekly }, weekKey, ids);
  const counts =
    view === 'daily'
      ? { targets: dayStats.targetsSet, sent: dayStats.eodSent, total: dayStats.total }
      : { targets: weekStats.targetsSet, sent: weekStats.eowSent, total: weekStats.total };
  const visible = results.filter((r) =>
    filter === 'targets' ? !r.targetsAt : filter === 'sent' ? !r.sentAt : true,
  );
  const toggleFilter = (key) => setFilter((cur) => (cur === key ? 'all' : key));
  const switchView = (next) => {
    setView(next);
    setFilter('all');
  };
  const labels =
    view === 'daily'
      ? {
          targets: 'Set morning targets',
          sent: 'Sent end of day',
          pendingT: "haven't set morning targets",
          pendingS: "haven't sent end of day",
        }
      : {
          targets: 'Set weekly targets',
          sent: 'Sent end of week',
          pendingT: "haven't set weekly targets",
          pendingS: "haven't sent end of week",
        };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[16rem] flex-1">
          <h1 className="text-2xl font-bold">Team tasks update</h1>
          <p className="text-sm text-muted">
            {view === 'daily'
              ? 'Morning targets against end-of-day actuals, for everyone.'
              : `Weekly targets against end-of-week actuals · ${formatWeek(weekKey)}`}
          </p>
        </div>
        <DateNav date={date} onChange={setDate} mode={view === 'daily' ? 'day' : 'week'} />
      </div>
      <div className="flex w-fit rounded-full bg-surface-2 p-1" role="tablist" aria-label="Daily or weekly">
        {['daily', 'weekly'].map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={view === tab}
            onClick={() => switchView(tab)}
            className={cn(
              'focus-ring rounded-full px-5 py-1.5 text-sm font-semibold',
              view === tab ? 'bg-accent text-accent-on shadow-soft' : 'text-muted',
            )}
          >
            {tab === 'daily' ? 'Daily' : 'Weekly'}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatusFilterCard
          icon={
            view === 'daily' ? (
              <Sunrise size={16} className="text-butter-ink" />
            ) : (
              <CalendarRange size={16} className="text-sky-ink" />
            )
          }
          label={labels.targets}
          done={counts.targets}
          total={counts.total}
          active={filter === 'targets'}
          onClick={() => toggleFilter('targets')}
        />
        <StatusFilterCard
          icon={
            view === 'daily' ? (
              <Moon size={16} className="text-accent-ink" />
            ) : (
              <CalendarCheck2 size={16} className="text-mint-ink" />
            )
          }
          label={labels.sent}
          done={counts.sent}
          total={counts.total}
          active={filter === 'sent'}
          onClick={() => toggleFilter('sent')}
        />
      </div>
      {filter !== 'all' && (
        <p className="flex flex-wrap items-center gap-2 text-sm" data-testid="filter-note">
          <span className="text-muted">
            Showing {visible.length} {visible.length === 1 ? 'person who' : 'people who'}{' '}
            {filter === 'targets' ? labels.pendingT : labels.pendingS}.
          </span>
          <button
            className="focus-ring rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-accent-ink"
            onClick={() => setFilter('all')}
          >
            Show everyone
          </button>
        </p>
      )}
      {visible.length === 0 && (
        <Card>
          <p className="py-6 text-center text-muted">Everyone is in ✓</p>
        </Card>
      )}
      <div className="flex w-fit rounded-full bg-surface-2 p-1" role="tablist" aria-label="Cards or sheets">
        {['cards', 'sheets'].map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={sheet === tab}
            onClick={() => setSheet(tab)}
            className={cn(
              'focus-ring rounded-full px-4 py-1 text-xs font-semibold',
              sheet === tab ? 'bg-surface text-ink shadow-soft' : 'text-muted',
            )}
          >
            {tab === 'cards' ? 'Summary cards' : 'Task updates'}
          </button>
        ))}
      </div>
      {sheet === 'cards' ? (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {visible.map((r) => (
            <PersonUpdateCard key={r.id} r={r} view={view} />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {visible.map((r) => (
            <div key={r.id} className="space-y-2" data-person-sheet={r.id}>
              <p className="flex items-center gap-2 font-bold">
                <Avatar id={r.id} size="sm" />
                {r.name}
                <span className="text-xs font-normal text-muted">{r.title}</span>
                {r.leave && <Badge tone="lavender">{r.leave}</Badge>}
              </p>
              {view === 'daily' ? (
                <EntriesLog personId={r.id} date={date} readOnly />
              ) : (
                <WeeklyUpdate personId={r.id} date={date} readOnly />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManagerDaily;
