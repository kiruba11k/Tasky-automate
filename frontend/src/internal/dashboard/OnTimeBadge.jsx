import { qe as Badge, We as formatMinutes, cU as minutesAheadOfTarget } from '@/internal/min';

/** "On time" / "over target" badge for a finished task (nothing while no timing exists). */
export function OnTimeBadge({ task }) {
  const delta = minutesAheadOfTarget(task);
  if (delta == null) return null;
  return delta >= 0 ? (
    <Badge tone="mint">✓ On time{delta > 0 ? ` · ${formatMinutes(delta)} faster` : ''}</Badge>
  ) : (
    <Badge tone="butter">{formatMinutes(-delta)} over target</Badge>
  );
}

export default OnTimeBadge;
