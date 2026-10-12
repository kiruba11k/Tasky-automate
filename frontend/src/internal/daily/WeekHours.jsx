import { Check } from 'lucide-react';
import { We as formatMinutes, Se as useStore, kR as weekHours, yt as formatShortDate } from '@/internal/min';
import { HoursStats } from './HoursStats';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** "Hours this week" summary + per-day table. */
export function WeekHours({ personId, mon }) {
  const daily = useStore((s) => s.daily);
  const hours = weekHours(daily, personId, mon);
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Hours this week</p>
      <HoursStats t={hours} sent={hours.days.some((d) => d.sent)} />
      <table className="w-full table-fixed text-xs" aria-label="Hours by day">
        <colgroup>
          <col />
          <col className="w-12 sm:w-16" />
          <col className="w-12 sm:w-16" />
          <col className="w-12 sm:w-14" />
          <col className="w-16 sm:w-20" />
        </colgroup>
        <thead>
          <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
            <th className="pb-1 text-left font-semibold">Day</th>
            <th className="pb-1 text-right font-semibold">Planned</th>
            <th className="pb-1 text-right font-semibold">Actual</th>
            <th className="pb-1 text-right font-semibold">Extra</th>
            <th className="pb-1 text-right font-semibold">End of day</th>
          </tr>
        </thead>
        <tbody>
          {hours.days.map((day) => (
            <tr key={day.date} className="border-b border-line/60 last:border-0">
              <td className="truncate py-1 text-muted">
                {WEEKDAYS[hours.days.indexOf(day)]}
                <span className="hidden sm:inline"> {formatShortDate(day.date)}</span>
              </td>
              <td className="py-1 text-right tabular-nums">{day.plannedMin ? formatMinutes(day.plannedMin) : ''}</td>
              <td className="py-1 text-right font-semibold tabular-nums">
                {day.sent || day.actualMin ? formatMinutes(day.actualMin) : ''}
              </td>
              <td className="py-1 text-right tabular-nums">{day.extraMin ? formatMinutes(day.extraMin) : ''}</td>
              <td className="py-1 text-right">
                {day.sent ? (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-mint-ink">
                    <Check size={11} /> Sent
                  </span>
                ) : (
                  <span className="text-muted">{day.plannedMin ? 'Pending' : ''}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WeekHours;
