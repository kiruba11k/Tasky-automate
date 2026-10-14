import React, { useState } from 'react';
import { Pencil, Lock, Copy, Plus, Trash } from 'lucide-react';
import { oe as clsx, Te as Button, qe as Badge, tc as tracksPeriod, Ye as toast } from '@/internal/min';
import {
  KindBadge,
  TABLE_INPUT_CLASS,
  TARGET_KINDS,
  newTargetId,
  targetKind,
} from './targetKinds';

/** The targets table of one week / month: project numbers plus custom Number / Milestone / Text targets. */
export function PeriodPlan({ p, api, period, ws, title, prevTitle, prev, onSave }) {
  const metrics = p.metrics.filter((m) => tracksPeriod(m, period));
  const saved = api.planned(ws);
  const plan = api.plan(ws);
  const text = api.text(ws);
  const [edit, setEdit] = useState(null);
  const off = edit?.off ?? api.off(ws);
  const shown = metrics.filter((m) => !off.includes(m.id));
  const hidden = metrics.filter((m) => off.includes(m.id));

  const startEdit = (numbers, rows, offIds = api.off(ws)) =>
    setEdit({
      c: Object.fromEntries(metrics.map((m) => [m.id, String(numbers[m.id] ?? 0)])),
      rows: rows.map((r) => ({ ...r })),
      off: [...offIds],
    });
  const patchRow = (id, patch) =>
    setEdit((e) => e && { ...e, rows: e.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const save = () => {
    if (!edit) return;
    const numbers = {};
    for (const m of shown) {
      const n = Number(edit.c[m.id] || 0);
      if (!Number.isFinite(n) || n < 0) {
        toast({ title: `${m.label}: type zero or more`, tone: 'info' });
        return;
      }
      numbers[m.id] = Math.round(n);
    }
    onSave(numbers, edit.rows, edit.off) &&
      (setEdit(null), toast({ title: `${title} targets saved and locked`, tone: 'success' }));
  };

  const prefill = () => {
    if (!prev) return;
    startEdit(
      api.plan(prev),
      api.text(prev).map((r, i) => ({
        ...r,
        id: newTargetId(i),
        actual: undefined,
        actualNum: undefined,
        status: undefined,
      })),
      api.off(prev),
    );
    toast({ title: `Filled in from ${prevTitle}. Change anything, then Save.`, tone: 'info' });
  };

  const rows = edit?.rows ?? text;
  return (
    <div className="rounded-xl border border-line" data-testid="week-plan">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="flex items-center gap-2 text-sm font-bold">
          {title} targets{' '}
          {edit ? (
            <Badge tone="butter">
              <Pencil size={11} /> Editing
            </Badge>
          ) : saved ? (
            <Badge tone="mint">
              <Lock size={11} /> Saved
            </Badge>
          ) : (
            <Badge tone="grey">Not planned yet</Badge>
          )}
        </p>
        <span className="flex flex-wrap gap-2">
          {prev && (
            <Button tone="ghost" className="border border-line" onClick={prefill}>
              <Copy size={13} /> Prefill from {prevTitle}
            </Button>
          )}
          {edit ? (
            <>
              <Button tone="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button onClick={save}>
                <Lock size={13} /> Save
              </Button>
            </>
          ) : (
            <Button onClick={() => startEdit(plan, text)}>
              <Pencil size={13} /> {saved || text.length ? 'Edit' : `Plan this ${period}`}
            </Button>
          )}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
            <th className="px-3 py-1.5">Target</th>
            <th className="w-36 px-2 py-1.5">Type</th>
            <th className="px-2 py-1.5">Goal</th>
            {edit && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {shown.map((m) => (
            <tr key={m.id} className="border-t border-line">
              <td className="px-3 py-1.5 font-medium">{m.label}</td>
              <td className="px-2 py-1.5">
                <KindBadge kind="number" />
              </td>
              <td className="px-2 py-1.5">
                {edit ? (
                  <input
                    aria-label={`${m.label} target`}
                    type="number"
                    min={0}
                    className={clsx(TABLE_INPUT_CLASS, 'w-28 text-right tabular-nums')}
                    value={edit.c[m.id] ?? ''}
                    onChange={(e) => setEdit({ ...edit, c: { ...edit.c, [m.id]: e.target.value } })}
                  />
                ) : (
                  <b className="tabular-nums">{plan[m.id] ?? 0}</b>
                )}
              </td>
              {edit && (
                <td className="py-1.5">
                  <button
                    aria-label={`Remove ${m.label}`}
                    className="rounded p-1 text-muted hover:text-coral-ink"
                    onClick={() => setEdit({ ...edit, off: [...edit.off, m.id] })}
                  >
                    <Trash size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {rows.map((r) => {
            const kind = targetKind(r);
            return (
              <tr key={r.id} className="border-t border-line" data-text-target={r.id}>
                <td className="px-3 py-1.5">
                  {edit ? (
                    <input
                      aria-label="Target name"
                      className={TABLE_INPUT_CLASS}
                      placeholder="e.g. Case study sign-off"
                      value={r.label}
                      onChange={(e) => patchRow(r.id, { label: e.target.value })}
                    />
                  ) : (
                    <span className="font-medium">{r.label}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {edit ? (
                    <select
                      aria-label="Target type"
                      className={TABLE_INPUT_CLASS}
                      value={kind}
                      onChange={(e) => patchRow(r.id, { kind: e.target.value })}
                    >
                      {TARGET_KINDS.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <KindBadge kind={kind} />
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {kind === 'number' ? (
                    edit ? (
                      <input
                        aria-label="Target goal"
                        type="number"
                        min={0}
                        className={clsx(TABLE_INPUT_CLASS, 'w-28 text-right tabular-nums')}
                        value={r.targetNum ?? ''}
                        onChange={(e) =>
                          patchRow(r.id, {
                            targetNum: e.target.value === '' ? undefined : Math.max(0, Math.round(+e.target.value)),
                          })
                        }
                      />
                    ) : (
                      <b className="tabular-nums">{r.targetNum ?? 0}</b>
                    )
                  ) : edit ? (
                    <input
                      aria-label="Target goal"
                      className={TABLE_INPUT_CLASS}
                      placeholder={kind === 'milestone' ? 'e.g. Client signs off' : 'e.g. Launch v2 to 200 contacts'}
                      value={r.target}
                      onChange={(e) => patchRow(r.id, { target: e.target.value })}
                    />
                  ) : (
                    r.target || '·'
                  )}
                </td>
                {edit && (
                  <td className="py-1.5">
                    <button
                      aria-label="Remove target"
                      className="rounded p-1 text-muted hover:text-coral-ink"
                      onClick={() => setEdit({ ...edit, rows: edit.rows.filter((x) => x.id !== r.id) })}
                    >
                      <Trash size={13} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {edit && (
        <div className="flex flex-wrap items-center border-t border-line px-3 py-2">
          <button
            className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-semibold text-accent-ink hover:bg-surface-2"
            onClick={() =>
              setEdit({
                ...edit,
                rows: [...edit.rows, { id: newTargetId(edit.rows.length), label: '', target: '', kind: 'number' }],
              })
            }
          >
            <Plus size={12} /> Add a target
          </button>
          {hidden.length > 0 && (
            <select
              aria-label="Add back a project number"
              className="ml-2 rounded-full border border-line bg-surface px-2 py-1 text-xs"
              value=""
              onChange={(e) => e.target.value && setEdit({ ...edit, off: edit.off.filter((id) => id !== e.target.value) })}
            >
              <option value="">Add back a project number...</option>
              {hidden.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

export default PeriodPlan;
