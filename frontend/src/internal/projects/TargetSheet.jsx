import { useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Se as useStore, Ye as toast } from '@/internal/min';
import { copyElementAsImage } from '../lib/copyTableImage';
import { sheetColorOf } from '../daily/sheetText';

/**
 * A fixed set of targets (or the numbers against them) as a spreadsheet: coloured header, a grid of rows and columns, and a
 * "Copy as image" button, the same look as the day and week update tables. `rows` is an array of arrays of cell text.
 */
export function TargetSheet({ title, heading, columns, rows, filename = 'weekly-targets.png', testId = 'target-sheet' }) {
  const me = useStore((s) => s.me);
  const profile = useStore((s) => s.profiles[s.me]);
  const ref = useRef(null);
  const [copying, setCopying] = useState(false);
  const color = sheetColorOf(profile, 'week');
  const head = 'border border-white/20 px-3 py-2 text-center text-xs font-bold';
  const cell = 'border border-line px-3 py-2 align-middle';
  return (
    <div className="space-y-2" data-testid={testId} data-viewer={me}>
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <span className="text-sm font-bold">{heading}</span>
        <button
          type="button"
          data-testid="copy-target-sheet"
          title="Copy the whole table as one picture (every row and column)"
          disabled={copying}
          className="focus-ring flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted hover:bg-surface-2 disabled:opacity-60"
          onClick={async () => {
            if (!ref.current) return;
            setCopying(true);
            try {
              const how = await copyElementAsImage(ref.current, filename);
              toast({ title: how === 'copied' ? 'Table copied as an image' : 'Table saved as an image', tone: 'success' });
            } catch (err) {
              toast({ title: err.message || 'Could not copy the table', tone: 'info' });
            } finally {
              setCopying(false);
            }
          }}
        >
          <ImageIcon size={12} /> {copying ? 'Copying...' : 'Copy as image'}
        </button>
      </div>
      <div className="overflow-x-auto px-3 pb-3" ref={ref}>
        <table className="w-full min-w-[420px] border-collapse text-sm" aria-label={title}>
          <thead>
            <tr className="text-white" style={{ background: color }}>
              {columns.map((c) => (
                <th key={c} className={head}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 ? 'bg-surface-2/40' : 'bg-surface'}>
                {r.map((c, j) => (
                  <td key={j} className={`${cell} ${j === 0 ? 'font-medium' : 'text-center tabular-nums'}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TargetSheet;
