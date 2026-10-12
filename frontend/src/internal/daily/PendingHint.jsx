import { Clock } from 'lucide-react';

export function PendingHint({ children }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted" data-testid="pending-hint">
      <Clock size={12} className="shrink-0" />
      {children}
    </p>
  );
}

export default PendingHint;
