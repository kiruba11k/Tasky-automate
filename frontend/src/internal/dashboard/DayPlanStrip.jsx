import { useEffect, useState } from 'react';
import { Se as useStore, ac as useTheme, Tr as PROJECT_COLORS, We as formatMinutes } from '@/internal/min';

/** Day runs 10:00 to 19:00, expressed in minutes. */
export const DAY_START = 600;
export const DAY_END = 1140;

export const timeToMinutes = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);

export const formatClockLabel = (m) =>
  `${m / 60 > 12 ? Math.floor(m / 60) - 12 : Math.floor(m / 60)}${m % 60 ? `:${String(m % 60).padStart(2, '0')}` : ''}${m >= 720 ? 'pm' : 'am'}`;

export const projectColor = (projects, projectId) =>
  PROJECT_COLORS[Math.max(0, projects.findIndex((p) => p.id === projectId)) % PROJECT_COLORS.length];

/** Horizontal 10am-7pm strip with the planned time blocks, lunch and a live "now" marker. */
export function DayPlanStrip({ blocks, loggedMinutes, extra = [], lunch = { start: '13:00', end: '14:00' } }) {
  const projects = useStore((s) => s.projects);
  const theme = useTheme();
  const blockStyle = (color) =>
    theme.blocks === 'striped'
      ? {
          backgroundImage:
            'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.18) 0 7px, transparent 7px 14px)',
        }
      : theme.blocks === 'candy'
        ? {
            backgroundImage: 'linear-gradient(180deg, rgb(255 255 255 / 0.35), transparent 60%)',
            boxShadow: `inset 0 -3px 0 ${color}`,
          }
        : {};
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 3e4);
    return () => clearInterval(id);
  }, []);

  const span = DAY_END - DAY_START;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPct = Math.min(100, Math.max(0, ((nowMinutes - DAY_START) / span) * 100));
  const remaining =
    nowMinutes < DAY_START
      ? 'Day starts at 10am'
      : nowMinutes > DAY_END
        ? 'Day complete, see you tomorrow 🌙'
        : `${Math.floor((DAY_END - nowMinutes) / 60)}h ${(DAY_END - nowMinutes) % 60}m left today`;

  return (
    <div className="pt-6">
      <div className="relative h-10 overflow-hidden rounded-xl bg-surface-2">
        <div
          className="absolute inset-y-0 flex items-center justify-center border-x-2 border-surface bg-grey text-[11px] font-semibold text-grey-ink"
          style={{
            left: `${((timeToMinutes(lunch.start) - DAY_START) / span) * 100}%`,
            width: `${((timeToMinutes(lunch.end) - timeToMinutes(lunch.start)) / span) * 100}%`,
            backgroundImage: 'repeating-linear-gradient(135deg, rgb(0 0 0 / 0.04) 0 6px, transparent 6px 12px)',
          }}
          title={`Lunch ${formatClockLabel(timeToMinutes(lunch.start))} to ${formatClockLabel(timeToMinutes(lunch.end))}`}
        >
          🍽 Lunch
        </div>
        {blocks.map((b) => {
          const project = projects.find((p) => p.id === b.projectId);
          const left = ((timeToMinutes(b.start) - DAY_START) / span) * 100;
          const width = ((timeToMinutes(b.end) - timeToMinutes(b.start)) / span) * 100;
          return (
            <div
              key={b.id}
              className="absolute inset-y-0 flex items-center justify-center truncate border-r-2 border-surface px-2 text-[11px] font-semibold text-white"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: b.custom ? (b.custom.priority ? '#DC2626' : '#64748B') : projectColor(projects, b.projectId),
                ...blockStyle(projectColor(projects, b.projectId)),
                ...(b.custom
                  ? {
                      backgroundImage:
                        'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.12) 0 6px, transparent 6px 12px)',
                    }
                  : {}),
              }}
              title={`${b.start} to ${b.end} · ${b.custom ? b.custom.title : project?.name}`}
            >
              {b.custom ? `${b.custom.priority ? '★ ' : ''}${b.custom.title}` : project?.client}
              {' · '}
              {b.start}
              {' to '}
              {b.end}
            </div>
          );
        })}
        {extra
          .filter((x) => x.start && x.end && x.end > x.start)
          .map((x) => {
            const from = Math.max(DAY_START, timeToMinutes(x.start));
            const to = Math.min(DAY_END, timeToMinutes(x.end));
            if (to <= from) return null;
            return (
              <div
                key={x.id}
                data-extra-block
                className="absolute inset-y-0 flex items-center justify-center truncate border-r-2 border-surface bg-lavender-strong px-2 text-[11px] font-semibold text-white"
                style={{
                  left: `${((from - DAY_START) / span) * 100}%`,
                  width: `${((to - from) / span) * 100}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.18) 0 6px, transparent 6px 12px)',
                }}
                title={`Extra ${x.start} to ${x.end} · ${x.work}`}
              >
                Extra · {x.work || 'extra hours'}
              </div>
            );
          })}
        {!blocks.length && (
          <p className="absolute inset-y-0 left-0 flex w-1/3 items-center justify-center text-xs text-muted">
            No day plan yet
          </p>
        )}
      </div>
      <div className="relative -mt-12 h-12">
        <div className="absolute top-0 h-12 w-0.5 -translate-x-1/2 bg-coral-strong" style={{ left: `${nowPct}%` }}>
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-coral-strong px-1.5 text-[10px] font-bold text-white">
            {theme.nowEmoji && <span className="mr-1">{theme.nowEmoji}</span>}
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-faint">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i}>{formatClockLabel(DAY_START + i * 60)}</span>
        ))}
      </div>
      <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
        <span>Logged {formatMinutes(loggedMinutes)} (submitted tasks and your day tables)</span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-coral-strong" />
          {remaining}
        </span>
      </p>
    </div>
  );
}

export default DayPlanStrip;
