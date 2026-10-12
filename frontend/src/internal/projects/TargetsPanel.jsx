import React from 'react';
import { Pencil, Lock } from 'lucide-react';
import {
  Se as useStore,
  oe as clsx,
  Te as Button,
  tc as tracksPeriod,
  lt as attempt,
  Ye as toast,
} from '@/internal/min';

/** Default weekly / monthly target editor for one project, with lock/unlock. */
export function TargetsPanel({ p, period }) {
  const { setTarget, setLock } = useStore();
  const targetKey = period === 'week' ? 'weekTarget' : 'monthTarget';
  const locked = period === 'week' ? p.weekLocked : p.monthLocked;
  return (
    <div
      className={clsx(
        'rounded-2xl border-2 p-4',
        locked ? 'border-mint-strong/50 bg-mint/20' : 'border-dashed border-butter-strong/60 bg-butter/20',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{period === 'week' ? '📅 Default weekly target' : '🗓️ Monthly targets'}</p>
          <p className="text-xs text-muted">
            {period === 'week' ? 'Used for any week without its own plan. ' : ''}
            {locked
              ? 'Locked: visible to the team and management.'
              : 'Draft: only project admins see these until you lock them.'}
          </p>
        </div>
        {locked ? (
          <Button
            tone="ghost"
            className="shrink-0 border border-line bg-surface"
            onClick={() => attempt(() => setLock(p.id, period, false))}
          >
            <Pencil size={13} /> Edit
          </Button>
        ) : (
          <Button
            className="shrink-0"
            onClick={() =>
              attempt(() => {
                setLock(p.id, period, true);
                toast({
                  title: `${period === 'week' ? 'Default weekly' : 'Monthly'} targets locked, management can see them`,
                  tone: 'success',
                });
              })
            }
          >
            <Lock size={13} /> Lock targets
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {p.metrics
          .filter((m) => tracksPeriod(m, period))
          .map((m) => (
            <label key={m.id} className="rounded-xl border border-line bg-surface px-3 py-2">
              <span
                className="block truncate text-[11px] font-bold uppercase tracking-wide text-muted"
                title={m.label}
              >
                {m.label}
              </span>
              {locked ? (
                <span className="block text-xl font-extrabold tabular-nums">{p[targetKey][m.id] ?? 0}</span>
              ) : (
                <input
                  type="number"
                  min={0}
                  aria-label={`${m.label} ${period} target`}
                  className="w-full bg-transparent text-xl font-extrabold tabular-nums text-ink outline-none focus:underline"
                  value={p[targetKey][m.id] ?? 0}
                  onChange={(e) => attempt(() => setTarget(p.id, targetKey, m.id, +e.target.value))}
                />
              )}
            </label>
          ))}
      </div>
    </div>
  );
}

export default TargetsPanel;
