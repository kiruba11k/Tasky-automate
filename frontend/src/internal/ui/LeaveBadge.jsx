import { Se as useStore, qe as Badge } from '@/internal/min';
import { leaveLabel } from '../lib/leave';

/** "On leave" / "Half day leave" badge for a person on a given day (original: `Jf`). Renders nothing when they are not on leave. */
export function LeaveBadge({ personId, date, className }) {
  const leave = useStore((s) => s.profiles[personId]?.leaves?.find((l) => l.date === date));
  if (!leave) return null;
  return (
    <span className={className} data-on-leave={date} title={leave.note}>
      <Badge tone="lavender">{leaveLabel(leave)}</Badge>
    </span>
  );
}

export default LeaveBadge;
