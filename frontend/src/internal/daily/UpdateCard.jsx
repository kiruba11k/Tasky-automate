import { Lock, Pencil } from 'lucide-react';
import { oe as cx, qe as Badge, Te as Button } from '@/internal/min';
import { formatDayClock } from './dateHelpers';

/** Section card with a coloured header, a lock badge and a read-only "view" once locked. */
export function UpdateCard({
  id,
  icon,
  tone,
  title,
  subtitle,
  lockedAt,
  lockedLabel = 'Locked',
  editing,
  onEdit,
  children,
  view,
}) {
  const showView = !!lockedAt && !editing;
  return (
    <section id={id} aria-label={title} className="flex min-w-0 flex-col rounded-card bg-surface shadow-soft">
      <div
        className={cx(
          'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-t-card border-b border-line px-5 py-3',
          tone,
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface/70">{icon}</span>
        <div className="min-w-[10rem] flex-1">
          <p className="font-bold">{title}</p>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        {lockedAt ? (
          <Badge tone="mint">
            <Lock size={11} /> {lockedLabel} {formatDayClock(lockedAt)}
          </Badge>
        ) : (
          <Badge tone="butter">Not sent yet</Badge>
        )}
      </div>
      <div className="flex-1 space-y-4 p-5">{showView ? view : children}</div>
      {showView && onEdit && (
        <div className="border-t border-line px-5 py-3">
          <Button tone="ghost" className="border border-line" onClick={onEdit}>
            <Pencil size={13} /> Edit
          </Button>
        </div>
      )}
    </section>
  );
}

export default UpdateCard;
