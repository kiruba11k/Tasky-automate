import { useEffect, useRef, useState } from 'react';
import { oe as cx, We as formatMinutes } from '@/internal/min';
import { parseDuration } from './parseDuration';

const isValid = (n) => Number.isFinite(n) && n >= 0 && n <= 720;

export function DurationInput({ value, onChange, placeholder, label, className, disabled }) {
  const [text, setText] = useState(value != null ? formatMinutes(value) : '');
  const [invalid, setInvalid] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setText(value != null ? formatMinutes(value) : '');
      setInvalid(false);
    }
  }, [value]);

  return (
    <input
      aria-label={label}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      inputMode="text"
      placeholder={placeholder}
      title="Minutes or h:mm, e.g. 45m, 1h 30m or 1:30"
      className={cx(
        'focus-ring rounded-xl border bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink placeholder:text-muted/70 disabled:bg-surface-2 disabled:text-muted',
        invalid ? 'border-coral-strong' : 'border-line',
        className,
      )}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = parseDuration(e.target.value);
        if (parsed === null) {
          setInvalid(false);
          onChange(undefined);
          return;
        }
        const ok = isValid(parsed);
        setInvalid(!ok);
        if (ok) onChange(parsed);
      }}
      onBlur={() => {
        focused.current = false;
        const parsed = parseDuration(text);
        if (parsed != null && isValid(parsed)) setText(formatMinutes(parsed));
      }}
    />
  );
}

export default DurationInput;
