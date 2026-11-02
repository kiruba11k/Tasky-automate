import { useEffect, useRef, useState } from 'react';
import { oe as cx } from '@/internal/min';
import { parseDuration } from './parseDuration';

const MAX_MINUTES = 720;
/** 90 -> "1h 30m", 120 -> "2h", 45 -> "45m", undefined -> "". */
const fmt = (m) => (m == null ? '' : m < 60 ? `${m}m` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`);

const BOX =
  'focus-ring w-24 rounded-xl border border-line bg-surface px-2 py-1 text-center text-sm tabular-nums text-ink placeholder:text-muted/60 disabled:bg-surface-2 disabled:text-muted';

/**
 * One box for a duration in minutes (empty = undefined). Type it in one go: "1h 30", "1h30m", "90" (minutes), "1.5" (hours),
 * "1:30". It selects its text when focused, so typing replaces it; Enter or the down arrow moves to the same column of the next row,
 * the up arrow to the previous row. `column` names the column (boxes with the same name are stepped through together) and `copyFrom`
 * (minutes) is what the "=" key puts in, for "same as the estimate".
 */
export function DurationInput({ value, onChange, placeholder, label, className, disabled, column, copyFrom }) {
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);
  const ref = useRef(null);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (!focused.current) setText(fmt(value));
  }, [value]);

  const ghost = placeholder != null && placeholder !== '...' ? placeholder : '';

  const commit = () => {
    const t = text.trim();
    if (t === '') {
      if (value != null) onChange(undefined);
      setText('');
      return;
    }
    const m = parseDuration(t);
    if (m == null || !Number.isFinite(m)) {
      setText(fmt(value)); // not understood: back to what it was
      return;
    }
    const minutes = Math.min(MAX_MINUTES, Math.max(0, m));
    if (minutes !== value) onChange(minutes);
    setText(fmt(minutes));
    // the page may refuse the value (a plan block cannot be under 5 minutes): show what it kept
    setTimeout(() => {
      if (!focused.current) setText(fmt(latest.current));
    }, 0);
  };

  const step = (dir) => {
    const name = column ?? label;
    const all = [...document.querySelectorAll('input[data-dur]')].filter((el) => !el.disabled && el.getAttribute('data-dur') === name);
    const at = all.indexOf(ref.current);
    const next = all[at + dir];
    if (next) next.focus();
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="text"
      autoComplete="off"
      aria-label={label}
      data-dur={column ?? label}
      title="Type it in one go: 1h 30, 90 (minutes), 1.5 (hours) or 1:30. Enter or the arrows move to the next row."
      disabled={disabled}
      className={cx(BOX, className)}
      placeholder={ghost}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          commit();
          step(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          commit();
          step(-1);
        } else if (e.key === '=' && copyFrom > 0) {
          e.preventDefault();
          setText(fmt(copyFrom));
          if (copyFrom !== value) onChange(copyFrom);
          e.target.select();
        } else if (e.key === 'Escape') {
          setText(fmt(value));
          e.target.blur();
        }
      }}
    />
  );
}

export default DurationInput;
