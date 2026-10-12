import { MessageSquareText } from 'lucide-react';
import { qe as Badge, vt as Avatar } from '@/internal/min';
import { TargetsTable } from './TargetsTable';
import { PendingHint } from './PendingHint';
import { HoursLine } from './HoursLine';
import { countTargetsMet } from './progressRows';
import { formatClock, formatDayClock } from './dateHelpers';

/** Manager-facing card summarising one person's day/week update. */
export function PersonUpdateCard({ r, view }) {
  const met = countTargetsMet(r.rows);
  const status = r.sentAt ? (
    <Badge tone="mint">
      {view === 'daily' ? `End of day sent ${formatClock(r.sentAt)}` : `End of week sent ${formatDayClock(r.sentAt)}`}
    </Badge>
  ) : r.targetsAt ? (
    <Badge tone="sky">
      {view === 'daily' ? `Targets set ${formatClock(r.targetsAt)}` : `Targets set ${formatDayClock(r.targetsAt)}`}
    </Badge>
  ) : (
    <Badge tone="grey">Pending</Badge>
  );
  return (
    <section
      aria-label={`${r.name} update`}
      data-person={r.id}
      className="flex min-w-0 flex-col rounded-card bg-surface shadow-soft"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Avatar id={r.id} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{r.name}</p>
          <p className="text-xs text-muted">{r.title}</p>
        </div>
        <span data-testid="status">{status}</span>
      </div>
      <div className="flex-1 space-y-2 px-4 py-3">
        <TargetsTable
          rows={r.rows}
          showActual
          label={`${r.name} targets vs actuals`}
          empty={view === 'daily' ? 'No tasks or targets for this day.' : 'No tasks or targets this week.'}
        />
        {r.sent && met.total > 0 && (
          <p className="text-xs text-muted" data-testid="met">
            <b className="text-ink">
              {met.met} of {met.total}
            </b>{' '}
            targets met
          </p>
        )}
        {!r.sent && r.rows.length > 0 && (
          <PendingHint>
            {view === 'daily'
              ? 'Actual fills in when the end of day is sent'
              : 'Actual fills in when the end of week is sent'}
          </PendingHint>
        )}
      </div>
      <div className="space-y-1 rounded-b-card border-t border-line bg-surface-2/50 px-4 py-2.5">
        <HoursLine t={r.hours} sent={r.sent} />
        <p className="flex items-center gap-1.5 text-sm" data-testid="note">
          <MessageSquareText size={13} className="shrink-0 text-muted" />
          {r.note?.trim() ? (
            <span className="truncate" title={r.note}>
              {r.note}
            </span>
          ) : (
            <span className="text-muted">No note</span>
          )}
        </p>
      </div>
    </section>
  );
}

export default PersonUpdateCard;
