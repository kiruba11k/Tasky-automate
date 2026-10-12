import { Repeat } from 'lucide-react';
import { qe as Badge } from '@/internal/min';

/** "Resubmitted Nx" chip, hidden for tasks that were never resubmitted. */
export function ResubmitBadge({ task }) {
  const count = task.resubmits ?? 0;
  if (count < 1) return null;
  return (
    <span data-testid="resubmits">
      <Badge tone="peach">
        <Repeat size={11} /> Resubmitted {count}x
      </Badge>
    </span>
  );
}

export default ResubmitBadge;
