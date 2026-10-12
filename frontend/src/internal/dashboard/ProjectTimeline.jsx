import { MapPin, Rocket, Flag } from 'lucide-react';
import { $e as dayKey, Mt as weekStart, Dw as weekRanges } from '@/internal/min';

const formatShortDate = (iso) =>
  new Date(iso + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Start-to-end progress bar for a project with a "today" pin. */
export function ProjectTimeline({ project }) {
  const start = new Date(project.startDate + 'T00:00').getTime();
  const end = new Date(project.endDate + 'T00:00').getTime();
  const today = new Date(dayKey(0) + 'T00:00').getTime();
  const span = Math.max(1, end - start);
  const pct = Math.min(100, Math.max(0, ((today - start) / span) * 100));
  const daysLeft = Math.round((end - today) / 864e5);
  const weeks = weekRanges(project, 0).filter((w) => w.start <= project.endDate);
  const currentWeek = weeks.find((w) => w.start === weekStart(0));
  const weekText = currentWeek ? ` · Week ${currentWeek.n} of ${weeks.length}` : '';
  const status =
    today < start
      ? `Starts in ${Math.round((start - today) / 864e5)} days`
      : daysLeft < 0
        ? 'Completed'
        : `Day ${Math.round((today - start) / 864e5) + 1}${weekText} · ${daysLeft} days left`;

  return (
    <div className="pt-6">
      <div className="relative h-2 rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-coral-strong"
          style={{ width: `${pct}%` }}
        />
        <span className="absolute -top-6 -translate-x-1/2 text-accent" style={{ left: `${pct}%` }} title="Today">
          <MapPin size={18} fill="currentColor" className="text-accent" />
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="flex shrink-0 items-center gap-1">
          <Rocket size={12} /> {formatShortDate(project.startDate)}
        </span>
        <span className="text-center font-semibold text-ink">{status}</span>
        <span className="flex shrink-0 items-center gap-1">
          {formatShortDate(project.endDate)} <Flag size={12} />
        </span>
      </div>
    </div>
  );
}

export default ProjectTimeline;
