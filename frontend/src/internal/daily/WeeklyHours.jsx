import { Se as useStore, We as formatMinutes, Mn as toMinutes, pu as projectColor, yt as formatShortDate } from '@/internal/min';
import { addDays, weekStart } from '../lib/dates.js';
import { CalendarRange } from 'lucide-react';
import { dayHours, dayHasTime } from '../lib/domain.js';
import { recordWithAssigned } from '../lib/assigned.js';
import { projectLabel } from './entryHelpers';
import { formatWeekRange } from './dateHelpers';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TH = 'pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted';
const blockMinutes = (b) => Math.max(0, toMinutes(b.end) - toMinutes(b.start));

/**
 * "Weekly hours" card: planned, actual and extra time per day and per project. Monday to Friday always; Saturday and Sunday only
 * when there is any plan, table, task or extra time that day, so the total equals the person's Hours logged on the People page.
 */
export function WeeklyHours({ personId, date }) {
  const { daily, projects, tasks } = useStore();
  const mon = weekStart(date);
  const dayRecord = (d) => recordWithAssigned(tasks, daily, personId, d, { projects, carry: false });
  const perDay = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => addDays(mon, i))
    .map((d) => ({ d, ...dayHours(dayRecord(d)) }))
    .filter((d, i) => i < 5 || dayHasTime(d));
  const days = perDay.map((d) => d.d);
  const byProject = new Map();
  days.forEach((d) => {
    const rec = dayRecord(d);
    const dayMap = new Map();
    (rec?.plan ?? []).forEach((b) => {
      if (b.id === 'lunch') return;
      const pid = (b.custom ? (b.custom.projectId ?? b.projectId) : b.projectId) || `other:${b.custom?.title || 'Other work'}`;
      const planned = blockMinutes(b);
      const cur = dayMap.get(pid) ?? { planned: 0, actual: 0, extra: 0 };
      cur.planned += planned;
      cur.actual += b.actualMinutes ?? (rec.eodAt ? planned : 0);
      dayMap.set(pid, cur);
    });
    // time typed into a project's day table is that project's actual for the day
    const typed = new Map();
    (rec?.entries ?? []).forEach((e) => {
      if (e.actualMin > 0) typed.set(e.projectId, (typed.get(e.projectId) ?? 0) + e.actualMin);
    });
    typed.forEach((m, pid) => {
      const cur = dayMap.get(pid) ?? { planned: 0, actual: 0, extra: 0 };
      cur.actual = m;
      dayMap.set(pid, cur);
    });
    (rec?.extra ?? []).forEach((x) => {
      const pid = x.projectId ?? `other:${x.work || 'Extra work'}`;
      const cur = dayMap.get(pid) ?? { planned: 0, actual: 0, extra: 0 };
      cur.extra += x.minutes || 0;
      dayMap.set(pid, cur);
    });
    dayMap.forEach((v, pid) => {
      const cur = byProject.get(pid) ?? { planned: 0, actual: 0, extra: 0 };
      byProject.set(pid, { planned: cur.planned + v.planned, actual: cur.actual + v.actual, extra: cur.extra + v.extra });
    });
  });
  const total = perDay.reduce(
    (t, d) => ({ planned: t.planned + d.plannedMin, actual: t.actual + d.actualMin, extra: t.extra + d.extraMin }),
    { planned: 0, actual: 0, extra: 0 },
  );
  const list = [...byProject].sort((a, b) => b[1].actual + b[1].extra - (a[1].actual + a[1].extra) || b[1].planned - a[1].planned);
  const widest = Math.max(1, ...list.map(([, v]) => Math.max(v.planned, v.actual + v.extra)));
  return (
    <section id="weekly-hours" aria-label="Weekly hours" className="overflow-hidden rounded-card bg-surface shadow-soft">
      <div className="flex items-center gap-3 bg-mint/40 px-5 py-3">
        <CalendarRange size={18} className="text-mint-ink" />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">Weekly hours</h2>
          <p className="text-xs text-muted">{formatWeekRange(mon)} · filled in from your day plans: where the week&apos;s time went</p>
        </div>
      </div>
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-surface-2 px-3 py-2 text-sm" data-testid="week-hours-total">
          <span className="text-muted">Planned <b className="text-ink">{formatMinutes(total.planned)}</b></span>
          <span className="text-muted">Actual <b className="text-ink">{formatMinutes(total.actual)}</b></span>
          <span className="text-muted">Extra <b className="text-ink">{formatMinutes(total.extra)}</b></span>
          <span className="text-muted">Total worked <b className="text-ink">{formatMinutes(total.actual + total.extra)}</b></span>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <table className="w-full text-sm" aria-label="Hours by day">
            <thead>
              <tr className="border-b border-line text-left">
                <th className={TH}>Day</th>
                <th className={`${TH} text-right`}>Planned</th>
                <th className={`${TH} text-right`}>Actual</th>
                <th className={`${TH} text-right`}>Extra</th>
              </tr>
            </thead>
            <tbody>
              {perDay.map((d) => (
                <tr key={d.d} className="border-b border-line/70" data-week-hours-day={d.d}>
                  <td className="py-1.5">
                    {WEEKDAYS[new Date(`${d.d}T12:00:00`).getDay()]} {formatShortDate(d.d)}{' '}
                    {d.sent && <span className="ml-1 text-[10px] font-semibold text-mint-ink">sent</span>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted">{d.plannedMin ? formatMinutes(d.plannedMin) : '·'}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{d.actualMin ? formatMinutes(d.actualMin) : '·'}</td>
                  <td className="py-1.5 text-right tabular-nums">{d.extraMin ? formatMinutes(d.extraMin) : '·'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div aria-label="Hours by project">
            <p className={TH}>By project</p>
            {list.length === 0 ? (
              <p className="mt-1 text-sm text-muted">No day plans this week yet.</p>
            ) : (
              <ul className="mt-1 space-y-2">
                {list.map(([pid, v]) => (
                  <li key={pid} className="text-sm" data-week-hours-project={pid}>
                    <p className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: pid.startsWith('other:') ? '#64748B' : projectColor(projects, pid) }}
                        />
                        {projectLabel(pid, projects)}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {formatMinutes(v.actual + v.extra)} worked · {formatMinutes(v.planned)} planned
                        {v.extra ? ` · ${formatMinutes(v.extra)} extra` : ''}
                      </span>
                    </p>
                    <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full bg-sky-strong" style={{ width: `${(v.actual / widest) * 100}%` }} />
                      <div className="h-full bg-lavender-strong" style={{ width: `${(v.extra / widest) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default WeeklyHours;
