import { Ye as toast } from '@/internal/min';

/** Task status -> label + badge tone (original: `mi`). */
export const STATUS_META = {
  todo: { label: 'To do', tone: 'grey' },
  in_progress: { label: 'In progress', tone: 'sky' },
  in_review: { label: 'In review', tone: 'lavender' },
  changes: { label: 'Feedback to address', tone: 'butter' },
  done: { label: 'Done', tone: 'mint' },
};

/** Minutes -> "1h 30m" / "45m" (original: `We`). */
export const formatMinutes = (e) =>
  e >= 60 ? `${Math.floor(e / 60)}h${e % 60 ? ` ${e % 60}m` : ''}` : `${e}m`;

/** ISO timestamp -> "5m ago" style text (original: `Uw`). */
export const timeAgo = (iso) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 6e4));
  return mins < 1
    ? 'just now'
    : mins < 60
      ? `${mins}m ago`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h ago`
        : `${Math.floor(mins / 1440)}d ago`;
};

/** Shared text-input class string (original: `Ge`). */
export const INPUT_CLASS =
  'focus-ring w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm';

/**
 * Runs `fn`; on error shows a toast (and calls `onError`) and returns false (original: `lt`).
 */
export function attempt(fn, onError) {
  try {
    fn();
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong, please try again.';
    onError?.(message);
    toast({ title: message, tone: 'info', emoji: '⚠️' });
    return false;
  }
}
