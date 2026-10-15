import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { oe as cx, Se as useStore, Rh as ProgressBar, pu as projectColor, nt as personName } from '@/internal/min';
import { weekStart } from '../lib/dates.js';
import { rowKey, weekRows } from '../lib/entries.js';
import { dayRowsWithAssigned, weekAssignedRows } from '../lib/assigned.js';
import { EDIT_DAY_TASKS } from './EntriesLog';
import { ROW_STATUSES, entryName, projectLabel, rowDone, rowTarget } from './entryHelpers';

/** Window event: "open the week's table for editing" (sent by the Edit button on the week's progress card). */
export const EDIT_WEEK = 'ls-edit-week';

const percentOf = (done, target) => (target ? Math.round((done / target) * 100) : 0);
const toneOf = (pct) => (pct >= 100 ? 'mint' : pct >= 60 ? 'sky' : 'peach');

/** A whole-number box that saves when it loses focus or Enter is pressed. */
function NumberBox({ value, onSave, label }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(String(value));
  }, [value]);
  const commit = () => {
    const next = Math.max(0, Math.round(+text || 0));
    if (next !== value) onSave(next);
    else setText(String(value));
  };
  return (
    <input
      aria-label={label}
      type="number"
      min={0}
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
      className="focus-ring w-14 rounded-md border border-line bg-surface px-1.5 py-0.5 text-right text-xs font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

/** A text box that saves when it loses focus or Enter is pressed. */
function TextBox({ value, onSave, label }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);
  return (
    <input
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onSave(text)}
      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
      placeholder="What got done"
      className="focus-ring w-full rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs"
    />
  );
}

/**
 * Progress of a day's (or week's) rows against their targets, per project. For the week the rows are the days' rows added up;
 * with `editable` the week's numbers and statuses can be typed over right here.
 */
export function EntriesProgress({ personId, date, kind, editable }) {
  const { projects, daily, weekly, tasks, saveWeekly } = useStore();
  const monday = weekStart(date);
  const record = weekly[`${personId}|${monday}`];
  const rows =
    kind === 'day'
      ? dayRowsWithAssigned(tasks, daily, personId, date, { projects })
      : weekRows(personId, monday, daily, record?.entries ?? [], record?.overrides, weekAssignedRows(tasks, daily, personId, monday, { projects }));
  const override = (row, patch) => {
    const key = rowKey(row);
    saveWeekly(personId, monday, {
      overrides: { ...record?.overrides, [key]: { ...record?.overrides?.[key], qty: row.qty, doneQty: row.doneQty, ...patch } },
    });
  };
  const withTarget = rows.filter((r) => rowTarget(r) > 0);
  const projectIds = [...new Set(rows.map((r) => r.projectId))];
  const sum = (list) => list.reduce((t, r) => ({ t: t.t + rowTarget(r), d: t.d + Math.min(rowDone(r), rowTarget(r)) }), { t: 0, d: 0 });
  const all = sum(withTarget);
  const editButton = (
    <button
      type="button"
      className="focus-ring flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-accent-ink hover:bg-surface-2"
      onClick={() => (kind === 'day' ? window.dispatchEvent(new Event(EDIT_DAY_TASKS)) : window.dispatchEvent(new Event(EDIT_WEEK)))}
    >
      <Pencil size={11} /> Edit
    </button>
  );
  if (!rows.length) {
    return (
      <div
        className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted"
        data-progress={kind}
      >
        {kind === 'day' ? 'No daily tasks entered yet.' : 'Nothing yet this week. Tasks from your daily updates add up here.'}
        {editButton}
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-line p-3" data-progress={kind}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{kind === 'day' ? 'Today' : 'This week'}</span>
        <b className="tabular-nums" data-testid={`${kind}-progress`}>
          {all.d}/{all.t}
        </b>
        <span className="flex-1">
          <ProgressBar value={all.d} max={all.t} tone={toneOf(percentOf(all.d, all.t))} />
        </span>
        <b className="w-10 text-right text-sm tabular-nums">{percentOf(all.d, all.t)}%</b>
        {editButton}
      </div>
      {projectIds.map((pid) => {
        const project = projects.find((p) => p.id === pid);
        const mine = rows.filter((r) => r.projectId === pid);
        const projectTotal = sum(mine.filter((r) => rowTarget(r) > 0));
        return (
          <div key={pid} className="rounded-lg bg-surface-2/40 p-2" style={{ borderLeft: `4px solid ${project ? projectColor(projects, pid) : '#64748B'}` }}>
            <p className="mb-1 flex items-center justify-between text-xs font-semibold">
              <span>{projectLabel(pid, projects)}</span>
              <span className="tabular-nums">
                {projectTotal.d}/{projectTotal.t} · {percentOf(projectTotal.d, projectTotal.t)}%
              </span>
            </p>
            <ul className="space-y-1">
              {mine.map((r) => {
                const done = rowDone(r);
                const target = rowTarget(r);
                const name = entryName(r, project);
                return (
                  <li
                    key={r.id}
                    className={cx(
                      'grid items-center gap-2 text-xs',
                      editable ? 'grid-cols-[minmax(0,1fr)_8.5rem_minmax(4rem,8rem)_2.5rem]' : 'grid-cols-[minmax(0,1fr)_5rem_minmax(4rem,8rem)_2.5rem]',
                    )}
                  >
                    <span className="truncate" title={r.desc}>
                      {name}
                      {r.assigned && (
                        <span className="text-muted">
                          {' · '}
                          {r.assignedBy?.length ? `assigned by ${r.assignedBy.map((id) => personName(id).split(' ')[0]).join(', ')}` : 'assigned'}
                          {r.carriedFrom ? ' · carried over' : ''}
                        </span>
                      )}
                      {r.desc && <span className="text-muted"> · {r.desc}</span>}
                    </span>
                    {editable && r.kind === 'milestone' ? (
                      <select
                        aria-label={`${name} status`}
                        className="focus-ring rounded-md border border-line bg-surface px-1 py-0.5 text-xs font-semibold"
                        value={r.status ?? 'Not started'}
                        onChange={(e) => override(r, { status: e.target.value })}
                      >
                        {ROW_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    ) : editable && r.kind === 'text' ? (
                      <TextBox label={`${name} actual`} value={r.actualText ?? ''} onSave={(text) => override(r, { actualText: text })} />
                    ) : editable && (r.kind ?? 'number') === 'number' ? (
                      <span className="flex items-center justify-end gap-0.5" data-edit-row={r.id}>
                        <NumberBox label={`${name} achieved`} value={r.doneQty ?? 0} onSave={(n) => override(r, { doneQty: n })} />
                        <span className="text-muted">/</span>
                        <NumberBox label={`${name} target`} value={r.qty ?? 0} onSave={(n) => override(r, { qty: n })} />
                      </span>
                    ) : (
                      <span className="text-right font-semibold tabular-nums">
                        {r.kind === 'milestone'
                          ? (r.status ?? 'Not started')
                          : r.kind === 'text'
                            ? r.actualText || '·'
                            : target
                              ? `${done}/${target}`
                              : done || '·'}
                      </span>
                    )}
                    <ProgressBar value={done} max={target} tone={toneOf(percentOf(done, target))} />
                    <span className="text-right tabular-nums text-muted">{target ? `${percentOf(done, target)}%` : ''}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default EntriesProgress;
