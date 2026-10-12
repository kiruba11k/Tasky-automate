import { X, Plus } from 'lucide-react';
import { oe as cx } from '@/internal/min';

let customRowCounter = 0;
const fieldClass = 'focus-ring rounded-xl border border-line bg-surface px-2 py-1 text-sm text-ink';

export function CustomRowsEditor({ rows, onChange, title, hint, suggest }) {
  const add = (label = '') =>
    onChange([...rows, { id: `cr${Date.now().toString(36)}${++customRowCounter}`, label, qty: 0 }]);
  const suggestions = (suggest ?? []).filter((s) => s.label.trim() && !rows.some((r) => r.label === s.label));
  return (
    <div className="rounded-xl border border-dashed border-line p-3">
      <p className="text-sm font-semibold">
        {title} <span className="font-normal text-muted">· {hint}</span>
      </p>
      {rows.length > 0 && (
        <div className="mt-2 space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                aria-label="Custom item"
                className={cx(fieldClass, 'min-w-0 flex-1')}
                placeholder="e.g. Client call notes"
                value={row.label}
                onChange={(e) => onChange(rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))}
              />
              <input
                aria-label="Custom amount"
                type="number"
                min={0}
                className={cx(fieldClass, 'w-20 text-right')}
                value={row.qty || ''}
                placeholder="0"
                onChange={(e) =>
                  onChange(rows.map((r) => (r.id === row.id ? { ...r, qty: Math.max(0, +e.target.value || 0) } : r)))
                }
              />
              <button
                aria-label="Remove custom item"
                className="focus-ring rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-coral-ink"
                onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          className="focus-ring flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-semibold text-accent-ink hover:bg-surface-2"
          onClick={() => add()}
        >
          <Plus size={12} /> Add custom row
        </button>
        {suggestions.map((s) => (
          <button
            key={s.id}
            className="focus-ring rounded-full bg-surface-2 px-3 py-1 text-xs text-muted hover:text-ink"
            onClick={() => add(s.label)}
          >
            + {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CustomRowsEditor;
