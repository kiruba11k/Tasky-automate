import React from 'react';
import { oe as cn } from '@/internal/min';

/** Radio-group style segmented control with arrow key navigation. (bundle: tk) */
export function SegmentedControl({ label, value, options, onChange, size = 'sm' }) {
  const handleKeyDown = (event) => {
    const index = options.findIndex((o) => o.id === value);
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    onChange(next.id);
    event.currentTarget.querySelector(`[data-value="${next.id}"]`)?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="inline-flex flex-wrap gap-0.5 rounded-2xl bg-surface-2 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          data-value={option.id}
          aria-checked={value === option.id}
          tabIndex={value === option.id ? 0 : -1}
          title={option.title}
          onClick={() => onChange(option.id)}
          className={cn(
            'focus-ring whitespace-nowrap rounded-xl font-semibold transition',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]',
            value === option.id
              ? 'bg-accent text-accent-on shadow-soft'
              : 'text-muted hover:bg-surface hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
