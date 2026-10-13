import { ExternalLink, Link2, Plus, X } from 'lucide-react';
import { oe as cx, Ge as inputClass } from '@/internal/min';

/** One or more link boxes ("Paste the sheet or doc link") with add / remove. Keeps at least one empty box on screen. */
export function LinkInputs({ value, onChange }) {
  const rows = value.length ? value : [''];
  return (
    <div className="space-y-1.5">
      {rows.map((link, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Link2 size={14} className="shrink-0 text-muted" />
          <input
            aria-label={`Link ${i + 1}`}
            className={inputClass}
            placeholder="Paste the sheet or doc link"
            value={link}
            onChange={(e) => onChange(rows.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {rows.length > 1 && (
            <button
              type="button"
              aria-label="Remove link"
              className="focus-ring rounded-lg p-1 text-muted hover:text-coral-ink"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="focus-ring flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-accent-ink hover:bg-surface-2"
        onClick={() => onChange([...rows, ''])}
      >
        <Plus size={12} /> Add another link
      </button>
    </div>
  );
}

/** Saved links as small chips that open in a new tab. */
export function LinkChips({ links, className }) {
  if (!links?.length) return null;
  return (
    <p className={cx('flex flex-wrap gap-1.5', className)}>
      {links.map((href, i) => (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noreferrer"
          data-link
          className="focus-ring inline-flex max-w-[16rem] items-center gap-1 rounded-full bg-sky px-2.5 py-0.5 text-xs font-semibold text-sky-ink hover:underline"
        >
          <ExternalLink size={11} className="shrink-0" />
          <span className="truncate">{href.replace(/^https?:\/\/(www\.)?/, '')}</span>
        </a>
      ))}
    </p>
  );
}
