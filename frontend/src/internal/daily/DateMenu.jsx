import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Se as useStore, Te as Button } from '@/internal/min';
import { leaveLabel, leaveOn } from '../lib/leave.js';
import { isWeekday } from '../lib/dates.js';
import { maxPlanDate, nextWorkingDay } from '../lib/moveRows.js';
import { formatShortDate } from './dateHelpers';

/** "Holiday" / "Leave" / "Weekend" next to a date, in the lavender marker colour (nothing for an ordinary working day). */
export function DayMarker({ personId, date, className = '' }) {
  const profiles = useStore((s) => s.profiles);
  if (!date) return null;
  const leave = personId ? leaveOn(profiles, personId, date) : undefined;
  const text = leave ? (leave.kind === 'half' ? 'Half day' : leave.kind === 'holiday' ? 'Holiday' : 'Leave') : isWeekday(date) ? '' : 'Weekend';
  if (!text) return null;
  return (
    <span
      data-day-marker={text}
      title={leave ? `${leaveLabel(leave)}${leave.note ? `: ${leave.note}` : ''}` : undefined}
      className={`rounded-full bg-lavender px-2 py-0.5 text-[10px] font-bold text-lavender-ink ${className}`}
    >
      {text}
    </span>
  );
}

/**
 * A popover that floats over the page (so tables and cards never clip it), opened by `trigger({ onClick, open })`, closed by Escape,
 * a click outside or `close()`. Styled like the "Fill from" menu. `children` is a function `(close) => node`.
 */
export function Popover({ trigger, title, testId, width = 288, onOpen, children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchor = useRef(null);
  const pop = useRef(null);
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return undefined;
    onOpen?.();
    const away = (e) => {
      if (e.type === 'keydown') {
        if (e.key === 'Escape') setOpen(false);
      } else if (!anchor.current?.contains(e.target) && !pop.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', away);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', away);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    setPos({ top: Math.min(r.bottom + 6, window.innerHeight - 24), left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)) });
  }, [open, width]);
  return (
    <span ref={anchor} className="relative inline-block">
      {trigger({ onClick: () => setOpen((v) => !v), open })}
      {open &&
        pos &&
        createPortal(
          <div
            ref={pop}
            role="dialog"
            aria-label={title}
            data-testid={testId}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width }}
            className="z-50 rounded-xl border border-line bg-surface p-3 text-left text-sm font-normal text-ink shadow-pop"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{title}</p>
            {children(close)}
          </div>,
          document.body,
        )}
    </span>
  );
}

/**
 * A small date popover that asks for a day and calls `onPick(day)`. Any day can be chosen, also weekends, holidays and past days,
 * up to 60 days ahead. `children` go above the date (for example a choice of which row to move).
 */
export function DateMenu({ personId, from, title, confirmLabel = 'Move', onPick, trigger, children, testId, hint }) {
  const profiles = useStore((s) => s.profiles);
  const [value, setValue] = useState('');
  const next = nextWorkingDay(profiles, personId, from);
  return (
    <Popover trigger={trigger} title={title} testId={testId} onOpen={() => setValue(next)}>
      {(close) => (
        <>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
          {children && <div className="mt-2">{children}</div>}
          <label className="mt-2 block text-xs font-semibold text-muted">
            Move to
            <input
              type="date"
              aria-label="Move to date"
              max={maxPlanDate()}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="focus-ring mt-1 block w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
            {value ? formatShortDate(value) : 'Pick a date'}
            <DayMarker personId={personId} date={value} />
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              data-testid="next-working-day"
              className="focus-ring rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-accent-ink hover:bg-surface-2"
              onClick={() => setValue(next)}
            >
              Next working day
            </button>
            <Button
              disabled={!value || value === from}
              data-testid="date-menu-confirm"
              onClick={() => {
                if (!value || value === from) return;
                close();
                onPick(value);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </>
      )}
    </Popover>
  );
}

export default DateMenu;
