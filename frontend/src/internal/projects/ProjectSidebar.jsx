import React, { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { Se as useStore, ea as canEditProject, vt as Avatar, nt as fullName, $e as dayKey, lt as attempt, Ye as toast, Ge as INPUT_CLASS } from '@/internal/min';
import { formatHours } from './projectHelpers';
import { usesMeetings } from '../lib/projectTemplates.js';

const shortDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Right-hand column of the Progress tab: team and hours, upcoming meetings, latest updates. */
export function ProjectSidebar({ p }) {
  const { me, editUpdate, removeUpdate } = useStore();
  const canEdit = canEditProject(p, me);
  const [editing, setEditing] = useState(null); // { id, text }
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
      {(usesMeetings(p) || p.meetings.length > 0) && <div className="rounded-2xl border border-line p-3">
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
      </div>}
      {p.updates.length > 0 && (
        <div className="rounded-2xl border border-line p-3" data-testid="project-updates">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Latest updates</p>
          <ul className="space-y-1.5">
            {p.updates.slice(0, 3).map((u) => (
              <li key={u.id} className="text-xs">
                {editing?.id === u.id ? (
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (attempt(() => editUpdate(p.id, u.id, editing.text))) { setEditing(null); toast({ title: 'Update saved', tone: 'success' }); }
                    }}
                  >
                    <input aria-label="Update text" className={INPUT_CLASS} value={editing.text} onChange={(e) => setEditing({ id: u.id, text: e.target.value })} />
                    <button type="submit" aria-label="Save update" className="focus-ring rounded p-1 text-muted hover:text-ink"><Check size={13} /></button>
                    <button type="button" aria-label="Cancel" className="focus-ring rounded p-1 text-muted hover:text-ink" onClick={() => setEditing(null)}><X size={13} /></button>
                  </form>
                ) : (
                  <>
                    <span className="text-ink">{u.text}</span>{' '}
                    <span className="text-muted">· {shortDate(u.at)}{u.editedAt ? ' · edited' : ''}</span>
                    {canEdit && (
                      <span className="ml-1 inline-flex gap-0.5 align-middle">
                        <button type="button" aria-label="Edit update" className="focus-ring rounded p-1 text-muted hover:text-ink" onClick={() => setEditing({ id: u.id, text: u.text })}><Pencil size={12} /></button>
                        <button type="button" aria-label="Delete update" className="focus-ring rounded p-1 text-muted hover:text-ink" onClick={() => attempt(() => removeUpdate(p.id, u.id)) && toast({ title: 'Update deleted', tone: 'info' })}><Trash2 size={12} /></button>
                      </span>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ProjectSidebar;
