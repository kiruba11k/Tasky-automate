import React, { useState } from 'react';

/** Text that is cut to a few lines when it is long, with a Read more / Show less toggle. */
export function ReadMore({ text, limit = 180, className = '', buttonClassName = 'text-accent-ink', as: Tag = 'p' }) {
  const [open, setOpen] = useState(false);
  const long = (text ?? '').length > limit;
  const shown = long && !open ? `${text.slice(0, limit).trimEnd()}…` : text;
  return (
    <Tag className={className}>
      {shown}
      {long && (
        <>
          {' '}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`focus-ring rounded font-semibold underline-offset-2 hover:underline ${buttonClassName}`}
          >
            {open ? 'Show less' : 'Read more'}
          </button>
        </>
      )}
    </Tag>
  );
}

export default ReadMore;
