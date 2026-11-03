import { useState } from 'react';
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { oe as cx, Se as useStore, Te as Button, Ye as toast } from '@/internal/min';
import { CUSTOM_TASK, entryName, newEntryId, projectLabel } from './entryHelpers';

const FIELD = 'focus-ring rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink';
const KINDS = [
  ['number', '# Number'],
  ['milestone', '☑ Milestone'],
  ['text', '✎ Text'],
];
const OTHER = 'other';

/** The goal text of a week row: its number, or its target text. */
const goalOf = (e) => ((e.kind ?? 'number') === 'number' ? String(e.qty ?? '') : (e.targetText ?? ''));

/**
 * The person's own targets for the week, with create, edit and delete. They are the rows added to the week (`weekly.entries`),
 * so they appear in the Weekly update table and the end of week too. Anyone can set their own; the project's fixed targets above
 * stay with its managers.
 */
export function MyWeekTargets({ personId, mon }) {
  const { projects, weekly, saveWeekly } = useStore();
  const record = weekly[`${personId}|${mon}`];
  const entries = (record?.entries ?? []).filter((e) => e.task);
  const mine = projects.filter((p) => p.status === 'active' && (p.pmId === personId || p.teamIds?.includes(personId) || p.admins?.includes(personId)));
  const options = mine.length ? mine : projects.filter((p) => p.status === 'active');
  const [adding, setAdding] = useState({ projectId: options[0]?.id ?? OTHER, work: '', name: '', kind: 'number', goal: '' });
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});

  const save = (next) => saveWeekly(personId, mon, { entries: next });
  const rowFrom = (base, { name, kind, goal }) => {
    const number = kind === 'number';
    const qty = number ? Math.max(0, Math.round(+goal || 0)) : undefined;
    return { ...base, task: CUSTOM_TASK, custom: name.trim(), kind, qty, doneQty: number ? base.doneQty : undefined, targetText: number ? undefined : goal.trim(), desc: base.desc ?? '', estMin: base.estMin ?? 0, remarks: base.remarks ?? '', achieved: base.achieved ?? '' };
  };

  const add = () => {
    const name = adding.name.trim();
    if (!name) return toast({ title: 'Type the target', tone: 'info' });
    if (adding.projectId === OTHER && !adding.work.trim()) return toast({ title: 'Type what the work is for', tone: 'info' });
    if (adding.kind === 'number' && !(+adding.goal > 0)) return toast({ title: 'Type the goal number', tone: 'info' });
    const projectId = adding.projectId === OTHER ? `other:${adding.work.trim()}` : adding.projectId;
    save([...(record?.entries ?? []), rowFrom({ id: newEntryId(), projectId }, adding)]);
    setAdding({ ...adding, name: '', goal: '' });
    toast({ title: 'Target added to the week', tone: 'success' });
  };
  const startEdit = (e) => {
    setEditId(e.id);
    setDraft({ name: entryName(e, projects.find((p) => p.id === e.projectId)), kind: e.kind ?? 'number', goal: goalOf(e) });
  };
  const saveEdit = (e) => {
    if (!draft.name.trim()) return toast({ title: 'Type the target', tone: 'info' });
    if (draft.kind === 'number' && !(+draft.goal >= 0)) return toast({ title: 'The goal must be a number', tone: 'info' });
    save((record?.entries ?? []).map((x) => (x.id === e.id ? rowFrom(x, draft) : x)));
    setEditId(null);
    toast({ title: 'Target updated', tone: 'success' });
  };
  const remove = (e) => {
    save((record?.entries ?? []).filter((x) => x.id !== e.id));
    toast({ title: 'Target removed', tone: 'info' });
  };

  return (
    <div className="space-y-3 border-t border-line px-4 py-3" data-testid="my-week-targets">
      <div>
        <p className="text-sm font-bold">Your targets this week</p>
        <p className="text-xs text-muted">Add, change or remove your own targets. They also show in your Weekly update.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-accent/40 bg-accent-soft/30 p-3" aria-label="Add a weekly target">
        <label className="text-xs font-semibold text-muted">
          Project
          <select aria-label="Target project" className={cx(FIELD, 'mt-1 block w-44')} value={adding.projectId} onChange={(e) => setAdding({ ...adding, projectId: e.target.value })}>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={OTHER}>Other work (not a project)</option>
          </select>
        </label>
        {adding.projectId === OTHER && (
          <label className="text-xs font-semibold text-muted">
            Work
            <input aria-label="Target work" className={cx(FIELD, 'mt-1 block w-36')} placeholder="e.g. Hiring" value={adding.work} onChange={(e) => setAdding({ ...adding, work: e.target.value })} />
          </label>
        )}
        <label className="min-w-[10rem] flex-1 text-xs font-semibold text-muted">
          Target
          <input aria-label="Target name" className={cx(FIELD, 'mt-1 block w-full')} placeholder="e.g. 200 prospects mapped" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
        </label>
        <label className="text-xs font-semibold text-muted">
          Type
          <select aria-label="Target type" className={cx(FIELD, 'mt-1 block w-32')} value={adding.kind} onChange={(e) => setAdding({ ...adding, kind: e.target.value })}>
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
            aria-label="Target goal"
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
      {entries.length === 0 ? (
        <p className="text-xs text-muted">No targets of your own for this week yet.</p>
      ) : (
        <ul className="divide-y divide-line" aria-label="Your targets">
          {entries.map((e) => {
            const project = projects.find((p) => p.id === e.projectId);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-2 py-2 text-sm" data-my-target={e.id}>
                {editId === e.id ? (
                  <>
                    <span className="w-40 shrink-0 text-xs font-semibold text-muted">{projectLabel(e.projectId, projects)}</span>
                    <input aria-label="Edit target name" className={cx(FIELD, 'min-w-[10rem] flex-1')} value={draft.name} onChange={(x) => setDraft({ ...draft, name: x.target.value })} />
                    <select aria-label="Edit target type" className={cx(FIELD, 'w-32')} value={draft.kind} onChange={(x) => setDraft({ ...draft, kind: x.target.value })}>
                      {KINDS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Edit target goal"
                      type={draft.kind === 'number' ? 'number' : 'text'}
                      min={0}
                      className={cx(FIELD, draft.kind === 'number' ? 'w-24 text-right' : 'w-44')}
                      value={draft.goal}
                      onChange={(x) => setDraft({ ...draft, goal: x.target.value })}
                      onKeyDown={(x) => x.key === 'Enter' && saveEdit(e)}
                    />
                    <button type="button" aria-label="Save target" className="focus-ring rounded-lg p-1.5 text-accent-ink hover:bg-surface-2" onClick={() => saveEdit(e)}>
                      <Check size={15} />
                    </button>
                    <button type="button" aria-label="Cancel edit" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => setEditId(null)}>
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-40 shrink-0 text-xs font-semibold text-muted">{projectLabel(e.projectId, projects)}</span>
                    <span className="min-w-[10rem] flex-1 font-medium">{entryName(e, project)}</span>
                    <span className="text-xs text-muted">{KINDS.find(([v]) => v === (e.kind ?? 'number'))?.[1]}</span>
                    <span className="min-w-[4rem] tabular-nums">{goalOf(e) || '·'}</span>
                    <button type="button" aria-label={`Edit ${entryName(e, project)}`} title="Edit" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-accent-ink" onClick={() => startEdit(e)}>
                      <Pencil size={14} />
                    </button>
                    <button type="button" aria-label={`Delete ${entryName(e, project)}`} title="Delete" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink" onClick={() => remove(e)}>
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MyWeekTargets;
