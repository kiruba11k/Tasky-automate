import { useEffect, useRef, useState } from 'react';
import { oe as cx } from '@/internal/min';
import { parseDuration } from './parseDuration';

const MAX_MINUTES = 720;
const toParts = (minutes) =>
  minutes != null ? { h: String(Math.floor(minutes / 60)), m: String(minutes % 60) } : { h: '', m: '' };

const INPUT_CLASS =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-9 bg-transparent py-1 text-right text-sm tabular-nums text-ink outline-none placeholder:text-muted/60 disabled:text-muted';

/** Hours and minutes boxes for a duration in minutes (empty = undefined). `placeholder` like "1h 30m" shows as the ghost value. */
export function DurationInput({ value, onChange, placeholder, label, className, disabled }) {
  const [parts, setParts] = useState(() => toParts(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setParts(toParts(value));
  }, [value]);

  const hint = placeholder != null && placeholder !== '...' ? parseDuration(placeholder) : null;
  const ghost = hint != null && Number.isFinite(hint) ? toParts(hint) : { h: '0', m: '0' };

  const update = (next) => {
    setParts(next);
    if (next.h.trim() === '' && next.m.trim() === '') {
      onChange(undefined);
      return;
    }
    const total = Math.max(0, Math.round(+next.h || 0)) * 60 + Math.max(0, Math.round(+next.m || 0));
    onChange(Math.min(MAX_MINUTES, total));
  };

  return (
    <span
      role="group"
      aria-label={label}
      title="Hours and minutes"
      className={cx(
        'inline-flex shrink-0 items-center rounded-xl border border-line bg-surface px-1.5 focus-within:ring-2 focus-within:ring-accent/40',
        disabled && 'bg-surface-2',
        className,
        '!w-auto',
      )}
    >
      <input
        aria-label={`${label} hours`}
        type="number"
        min={0}
        max={12}
        inputMode="numeric"
        disabled={disabled}
        className={INPUT_CLASS}
        placeholder={ghost.h}
        value={parts.h}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
        }}
        onChange={(e) => update({ ...parts, h: e.target.value })}
      />
      <span className="px-0.5 text-xs font-semibold text-muted">h</span>
      <input
        aria-label={`${label} minutes`}
        type="number"
        min={0}
        max={59}
        step={5}
        inputMode="numeric"
        disabled={disabled}
        className={INPUT_CLASS}
        placeholder={ghost.m}
        value={parts.m}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          const minutes = +parts.m || 0;
          if (minutes > 59) setParts({ h: String((+parts.h || 0) + Math.floor(minutes / 60)), m: String(minutes % 60) });
        }}
        onChange={(e) => update({ ...parts, m: e.target.value })}
      />
      <span className="pl-0.5 pr-1 text-xs font-semibold text-muted">m</span>
    </span>
  );
}

export default DurationInput;
