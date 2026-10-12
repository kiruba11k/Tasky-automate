import React, { useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import {
  Se as useStore,
  oe as clsx,
  Te as Button,
  Ge as INPUT_CLASS,
  lt as attempt,
  Ye as toast,
} from '@/internal/min';

const PERIODS = ['week', 'month'];

const periodsLabel = (metric) =>
  !metric.periods || metric.periods.length === 2
    ? 'Weekly + monthly'
    : metric.periods[0] === 'week'
      ? 'Weekly only'
      : 'Monthly only';

const togglePeriod = (list, period) =>
  list.includes(period) ? list.filter((x) => x !== period) : [...list, period];

/** "What this project tracks": list / rename / remove / add tracked numbers. */
export function MetricsEditor({ p }) {
  const { addMetric, removeMetric, renameMetric, setMetricPeriods } = useStore();
  const [editing, setEditing] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPeriods, setNewPeriods] = useState(['week', 'month']);

  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold">What this project tracks</p>
          <p className="text-xs text-muted">
            Choose the numbers, and whether each has a weekly target, a monthly target, or both.
          </p>
        </div>
        <Button
          tone={editing ? 'primary' : 'ghost'}
          className="border border-line"
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil size={13} /> {editing ? 'Done' : 'Edit'}
        </Button>
      </div>
      {editing ? (
        <>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {p.metrics.map((m) => {
              const periods = m.periods ?? ['week', 'month'];
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <input
                    aria-label={`Rename ${m.label}`}
                    className={clsx(INPUT_CLASS, 'max-w-[240px] flex-1 py-1 text-ink')}
                    defaultValue={m.label}
                    onBlur={(e) =>
                      e.target.value !== m.label && attempt(() => renameMetric(p.id, m.id, e.target.value))
                    }
                  />
                  {PERIODS.map((period) => (
                    <label key={period} className="flex items-center gap-1 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={periods.includes(period)}
                        onChange={() => attempt(() => setMetricPeriods(p.id, m.id, togglePeriod(periods, period)))}
                      />{' '}
                      {period === 'week' ? 'Weekly' : 'Monthly'}
                    </label>
                  ))}
                  <button
                    aria-label={`Remove ${m.label}`}
                    className="focus-ring ml-auto rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink"
                    onClick={() => attempt(() => removeMetric(p.id, m.id))}
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              attempt(() => addMetric(p.id, newLabel, newPeriods)) &&
                (setNewLabel(''), toast({ title: 'Now tracking it', tone: 'success' }));
            }}
          >
            <input
              className={clsx(INPUT_CLASS, 'min-w-[220px] flex-1 text-ink')}
              placeholder="New number, e.g. Connections accepted"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            {PERIODS.map((period) => (
              <label key={period} className="flex items-center gap-1 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={newPeriods.includes(period)}
                  onChange={() => setNewPeriods((list) => togglePeriod(list, period))}
                />{' '}
                {period === 'week' ? 'Weekly' : 'Monthly'}
              </label>
            ))}
            <Button type="submit">
              <Plus size={14} /> Add
            </Button>
          </form>
        </>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {p.metrics.map((m) => (
            <li key={m.id} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-sm">
              {m.label} <span className="text-xs text-muted">· {periodsLabel(m)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MetricsEditor;
