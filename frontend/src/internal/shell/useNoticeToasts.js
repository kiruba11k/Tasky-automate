import { useEffect, useRef } from 'react';
import { Se as useStore, Ye as toast, uU as systemNotify } from '@/internal/min';

/**
 * Shows a toast + browser notification for notices that arrive for the current
 * person after the initial load / after switching person (original: `iue`).
 */
export function useNoticeToasts() {
  const { me, notices } = useStore();
  const seen = useRef(new Set());
  const lastMe = useRef(null);
  useEffect(() => {
    const mine = notices.filter((n) => n.to === me);
    if (lastMe.current !== me) {
      lastMe.current = me;
      seen.current = new Set(mine.map((n) => n.id));
      return;
    }
    mine
      .filter((n) => !seen.current.has(n.id))
      .forEach((n) => {
        seen.current.add(n.id);
        if (!n.read) {
          toast({ title: n.text, tone: 'info', emoji: '🔔' });
          systemNotify(n.text);
        }
      });
  }, [notices, me]);
}

export default useNoticeToasts;
