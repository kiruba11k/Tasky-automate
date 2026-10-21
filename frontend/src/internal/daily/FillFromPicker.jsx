import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';
import { Se as useStore, We as formatMinutes } from '@/internal/min';
import { fillSources } from '../lib/fillSources';
import { formatShortDate } from './dateHelpers';

/**
 * "Fill from..." button that lists the earlier days that have something to copy (with what is saved on each), so a person can
 * copy from any previous day, not only yesterday. `kind` "plan" copies plan blocks, "rows" Daily update rows of `projectId`.
 */
export function FillFromPicker({ personId, date, kind = 'plan', projectId, onPick, label = 'Fill from previous day', className, testId }) {
  const daily = useStore((s) => s.daily);
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const sources = useMemo(() => fillSources(daily, personId, date, { kind, projectId }), [daily, personId, date, kind, projectId]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const noun = kind === 'plan' ? 'block' : 'task';
  return (
    <span ref={root} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={testId}
        className={className}
        onClick={() => setOpen((v) => !v)}
      >
        <Copy size={kind === 'plan' ? 13 : 11} /> {label} <ChevronDown size={11} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Earlier days"
          className="absolute right-0 z-30 mt-1 max-h-72 w-60 overflow-y-auto rounded-xl border border-line bg-surface p-1 text-left shadow-pop"
        >
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Copy from</p>
          {sources.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted">Nothing saved on earlier days yet.</p>
          ) : (
            sources.map((s) => (
              <button
                key={s.date}
                type="button"
                role="menuitem"
                data-source-date={s.date}
                className="focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
                onClick={() => {
                  setOpen(false);
                  onPick(s.date);
                }}
              >
                <b className="font-semibold">{formatShortDate(s.date)}</b>
                <span className="text-xs text-muted">
                  {s.count} {noun}
                  {s.count === 1 ? '' : 's'}
                  {s.minutes > 0 && ` · ${formatMinutes(s.minutes)}`}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </span>
  );
}

export default FillFromPicker;
