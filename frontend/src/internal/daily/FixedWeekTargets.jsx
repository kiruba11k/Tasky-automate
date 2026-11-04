import { useState } from 'react';
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { oe as cx, Se as useStore, Te as Button, Ye as toast, ea as canPlanFor, tc as tracksPeriod, lt as runAction } from '@/internal/min';
import { projectWeekStart, weekTargetFor } from '../lib/domain.js';
import { newTargetId, targetKind } from '../projects/targetKinds';

const FIELD = 'focus-ring rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink';
const KINDS = [
  ['number', '# Number'],
  ['milestone', '☑ Milestone'],
  ['text', '✎ Text'],
];

/** The week's fixed targets of a project as editable items: its numbers (with a goal, not switched off) and its own Number / Milestone / Text rows. */
function itemsOf(project, date) {
  const start = projectWeekStart(project, date);
  const off = project.weekOff?.[start] ?? [];
  const goals = weekTargetFor(project, date) ?? {};
  const numbers = (project.metrics ?? [])
    .filter((m) => tracksPeriod(m, 'week') && !off.includes(m.id) && (goals[m.id] ?? 0) > 0)
    .map((m) => ({ key: `m:${m.id}`, metric: m.id, label: m.label, kind: 'number', goal: String(goals[m.id]) }));
  const custom = (project.weekText?.[start] ?? [])
    .filter((r) => r.label?.trim())
    .map((r) => {
      const kind = targetKind(r);
      return { key: `t:${r.id}`, row: r, label: r.label, kind, goal: kind === 'number' ? String(r.targetNum ?? 0) : r.target ?? '' };
    });
  return { start, off, goals, items: [...numbers, ...custom] };
}

/**
 * Create, change and delete the weekly targets already fixed for the projects the person manages (owner, admin or leadership):
 * a project's numbers (goal only, a deleted one is switched off for the week) and its own Number / Milestone / Text targets.
 * Everyone on the project sees the change. Others see this section only as the table above.
 */
export function FixedWeekTargets({ personId, date }) {
  const { projects, saveWeekPlan, setWeekOff, setWeekText } = useStore();
  const plannable = projects.filter((p) => p.status === 'active' && canPlanFor(p, personId));
  const [adding, setAdding] = useState({ projectId: plannable[0]?.id ?? '', name: '', kind: 'number', goal: '' });
  const [editKey, setEditKey] = useState(null);
  const [draft, setDraft] = useState({});
  if (!plannable.length) return null;

  const textRows = (p) => (p.weekText?.[projectWeekStart(p, date)] ?? []).map((r) => ({ ...r }));
  const add = () => {
    const p = plannable.find((x) => x.id === adding.projectId);
    if (!p) return;
    if (!adding.name.trim()) return toast({ title: 'Type the target', tone: 'info' });
    if (adding.kind === 'number' && !(+adding.goal > 0)) return toast({ title: 'Type the goal number', tone: 'info' });
    const { start } = itemsOf(p, date);
    const row = { id: newTargetId(textRows(p).length), label: adding.name.trim(), kind: adding.kind, target: adding.kind === 'number' ? '' : adding.goal.trim(), ...(adding.kind === 'number' ? { targetNum: Math.round(+adding.goal) } : {}) };
    if (runAction(() => setWeekText(p.id, start, [...textRows(p), row]))) {
      setAdding({ ...adding, name: '', goal: '' });
      toast({ title: `Target added to ${p.name}`, tone: 'success' });
    }
  };
  const startEdit = (it) => {
    setEditKey(it.key);
    setDraft({ name: it.label, kind: it.kind, goal: it.goal });
  };
  const saveEdit = (p, it) => {
    const { start, goals } = itemsOf(p, date);
    const ok = it.metric
      ? runAction(() => {
          if (!(+draft.goal >= 0)) throw new Error('The goal must be a number.');
          const numbers = Object.fromEntries((p.metrics ?? []).map((m) => [m.id, goals[m.id] ?? 0]));
          saveWeekPlan(p.id, start, { ...numbers, [it.metric]: Math.round(+draft.goal) });
        })
      : runAction(() => {
          if (!draft.name.trim()) throw new Error('Type the target.');
          const number = draft.kind === 'number';
          setWeekText(
            p.id,
            start,
            textRows(p).map((r) =>
              r.id === it.row.id
                ? { ...r, label: draft.name.trim(), kind: draft.kind, target: number ? '' : draft.goal.trim(), targetNum: number ? Math.max(0, Math.round(+draft.goal || 0)) : undefined }
                : r,
            ),
          );
        });
    if (ok) {
      setEditKey(null);
      toast({ title: 'Target updated', tone: 'success' });
    }
  };
  const remove = (p, it) => {
    const { start, off } = itemsOf(p, date);
    const ok = runAction(() => (it.metric ? setWeekOff(p.id, start, [...off, it.metric]) : setWeekText(p.id, start, textRows(p).filter((r) => r.id !== it.row.id))));
    if (ok) toast({ title: 'Target removed from the week', tone: 'info' });
  };

  return (
    <div className="space-y-3 border-t border-line px-4 py-3" data-testid="fixed-week-targets">
      <div>
        <p className="text-sm font-bold">Targets fixed for your projects</p>
        <p className="text-xs text-muted">You manage these projects: add, change or remove their weekly targets. Everyone on the project sees the change.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-accent/40 bg-accent-soft/30 p-3" aria-label="Add a project target">
        <label className="text-xs font-semibold text-muted">
          Project
          <select aria-label="Project target project" className={cx(FIELD, 'mt-1 block w-44')} value={adding.projectId} onChange={(e) => setAdding({ ...adding, projectId: e.target.value })}>
            {plannable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[10rem] flex-1 text-xs font-semibold text-muted">
          Target
          <input aria-label="Project target name" className={cx(FIELD, 'mt-1 block w-full')} placeholder="e.g. Workflows built" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
        </label>
        <label className="text-xs font-semibold text-muted">
          Type
          <select aria-label="Project target type" className={cx(FIELD, 'mt-1 block w-32')} value={adding.kind} onChange={(e) => setAdding({ ...adding, kind: e.target.value })}>
            {KINDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Goal
          <input
            aria-label="Project target goal"
            type={adding.kind === 'number' ? 'number' : 'text'}
            min={0}
            className={cx(FIELD, 'mt-1 block', adding.kind === 'number' ? 'w-24 text-right' : 'w-44')}
            placeholder={adding.kind === 'number' ? '0' : 'e.g. Client signs off'}
            value={adding.goal}
            onChange={(e) => setAdding({ ...adding, goal: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
        </label>
        <Button onClick={add}>
          <Plus size={14} /> Add target
        </Button>
      </div>
      {plannable.map((p) => {
        const { items } = itemsOf(p, date);
        return (
          <div key={p.id} data-fixed-project={p.id}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{p.name}</p>
            {items.length === 0 ? (
              <p className="py-1 text-xs text-muted">No targets fixed for this week.</p>
            ) : (
              <ul className="divide-y divide-line" aria-label={`${p.name} targets`}>
                {items.map((it) => (
                  <li key={it.key} className="flex flex-wrap items-center gap-2 py-2 text-sm" data-fixed-target={it.key}>
                    {editKey === it.key ? (
                      <>
                        {it.metric ? (
                          <span className="min-w-[10rem] flex-1 font-medium">{it.label}</span>
                        ) : (
                          <>
                            <input aria-label="Edit project target name" className={cx(FIELD, 'min-w-[10rem] flex-1')} value={draft.name} onChange={(x) => setDraft({ ...draft, name: x.target.value })} />
                            <select aria-label="Edit project target type" className={cx(FIELD, 'w-32')} value={draft.kind} onChange={(x) => setDraft({ ...draft, kind: x.target.value })}>
                              {KINDS.map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        <input
                          aria-label="Edit project target goal"
                          type={draft.kind === 'number' ? 'number' : 'text'}
                          min={0}
                          className={cx(FIELD, draft.kind === 'number' ? 'w-24 text-right' : 'w-44')}
                          value={draft.goal}
                          onChange={(x) => setDraft({ ...draft, goal: x.target.value })}
                          onKeyDown={(x) => x.key === 'Enter' && saveEdit(p, it)}
                        />
                        <button type="button" aria-label="Save project target" className="focus-ring rounded-lg p-1.5 text-accent-ink hover:bg-surface-2" onClick={() => saveEdit(p, it)}>
                          <Check size={15} />
                        </button>
                        <button type="button" aria-label="Cancel edit" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => setEditKey(null)}>
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-[10rem] flex-1 font-medium">{it.label}</span>
                        <span className="text-xs text-muted">{KINDS.find(([v]) => v === it.kind)?.[1]}</span>
                        <span className="min-w-[4rem] tabular-nums">{it.goal || '·'}</span>
                        <button type="button" aria-label={`Edit ${it.label}`} title="Edit" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-accent-ink" onClick={() => startEdit(it)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" aria-label={`Delete ${it.label}`} title="Delete" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink" onClick={() => remove(p, it)}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default FixedWeekTargets;
