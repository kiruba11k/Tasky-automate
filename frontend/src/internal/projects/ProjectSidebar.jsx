import React from 'react';
import { vt as Avatar, nt as fullName, $e as dayKey } from '@/internal/min';
import { formatHours } from './projectHelpers';

const shortDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Right-hand column of the Progress tab: team and hours, upcoming meetings, latest updates. */
export function ProjectSidebar({ p }) {
  const upcoming = p.meetings.filter((m) => m.date >= dayKey(0)).slice(0, 4);
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-2xl border border-line p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Team and hours</p>
        <ul className="space-y-1.5">
          {p.teamIds.map((id) => (
            <li key={id} className="flex items-center gap-2">
              <Avatar id={id} size="sm" />
              <span className="min-w-0 flex-1 truncate">
                {fullName(id)}
                {id === p.pmId ? (
                  <span className="ml-1 text-xs text-muted">· owner</span>
                ) : p.admins.includes(id) ? (
                  <span className="ml-1 text-xs text-muted">· admin</span>
                ) : null}
              </span>
              <span className="text-xs tabular-nums text-muted">{formatHours(p.hours[id] ?? 0)}/day</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-line p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Upcoming meetings</p>
        {upcoming.length === 0 ? (
          <p className="text-muted">None scheduled.</p>
        ) : (
          upcoming.map((m) => (
            <p key={m.id} className="flex justify-between gap-2">
              <b className="truncate">{m.company}</b>{' '}
              <span className="shrink-0 text-muted">
                {shortDate(m.date + 'T00:00')} {m.time}
              </span>
            </p>
          ))
        )}
      </div>
      {p.updates.length > 0 && (
        <div className="rounded-2xl border border-line p-3" data-testid="project-updates">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Latest updates</p>
          <ul className="space-y-1.5">
            {p.updates.slice(0, 3).map((u) => (
              <li key={u.id} className="text-xs">
                <span className="text-ink">{u.text}</span>{' '}
                <span className="text-muted">· {shortDate(u.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ProjectSidebar;
