import { useState } from 'react';
import { Plus } from 'lucide-react';
import { oe as cx, Se as useStore, Te as Button, Ye as toast } from '@/internal/min';
import { rowKey } from '../lib/entries.js';
import { useTaskMenu } from './TaskMenuSettings';
import { CUSTOM_TASK, ROW_STATUSES, newEntryId, taskChoices } from './entryHelpers';

const FIELD = 'focus-ring rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink';

/** Form above the week's table to add a task straight to the week (a number, a milestone or a text target). */
export function AddToWeek({ personId, mon }) {
  const { projects, weekly, saveWeekly } = useStore();
  const mine = projects.filter(
    (p) => p.status === 'active' && (p.pmId === personId || p.teamIds.includes(personId) || p.admins?.includes(personId)),
  );
  const options = mine.length ? mine : projects.filter((p) => p.status === 'active');
  const [projectId, setProjectId] = useState(options[0]?.id ?? '');
  const [task, setTask] = useState('');
  const [custom, setCustom] = useState('');
  const [target, setTarget] = useState('');
  const [achieved, setAchieved] = useState('');
  const [kind, setKind] = useState('number');
  const [targetText, setTargetText] = useState('');
  const [actualText, setActualText] = useState('');
  const [status, setStatus] = useState('Not started');
  const taskMenu = useTaskMenu(personId);
  const choices = taskChoices(projects.find((p) => p.id === projectId), taskMenu);

  const add = () => {
    if (!task) {
      toast({ title: 'Pick a task', tone: 'info' });
      return;
    }
    if (task === CUSTOM_TASK && !custom.trim()) {
      toast({ title: 'Type the task name', tone: 'info' });
      return;
    }
    const record = weekly[`${personId}|${mon}`];
    const base = {
      id: newEntryId(),
      projectId,
      task,
      custom: task === CUSTOM_TASK ? custom.trim() : undefined,
      desc: '',
      estMin: 0,
      achieved: '',
      remarks: '',
      kind,
    };
    const row =
      kind === 'number'
        ? { ...base, qty: target ? Math.max(0, Math.round(+target)) : undefined, doneQty: achieved ? Math.max(0, Math.round(+achieved)) : undefined }
        : kind === 'milestone'
          ? { ...base, targetText: targetText.trim(), status }
          : { ...base, targetText: targetText.trim(), actualText: actualText.trim() };
    // a number typed over this row in the table is bumped by what is added now
    const key = rowKey(row);
    const typed = record?.overrides?.[key];
    const overrides = typed
      ? {
          ...record.overrides,
          [key]: {
            ...typed,
            hidden: false, // adding a task that was removed from the week brings it back
            qty: typed.qty != null ? typed.qty + (row.qty ?? 0) : undefined,
            doneQty: typed.doneQty != null ? typed.doneQty + (row.doneQty ?? 0) : undefined,
          },
        }
      : record?.overrides;
    saveWeekly(personId, mon, { entries: [...(record?.entries ?? []), row], overrides });
    setTarget('');
    setAchieved('');
    setCustom('');
    setTargetText('');
    setActualText('');
    setStatus('Not started');
    toast({ title: 'Added to the week', tone: 'success' });
  };

  return (
    <div
      className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-accent/40 bg-accent-soft/30 p-3"
      aria-label="Add to the week"
    >
      <label className="text-xs font-semibold text-muted">
        Project
        <select aria-label="Week project" className={cx(FIELD, 'mt-1 block w-48')} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-muted">
        Task
        <select aria-label="Week task" className={cx(FIELD, 'mt-1 block w-48')} value={task} onChange={(e) => setTask(e.target.value)}>
          <option value="">Pick a task</option>
          {choices.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value={CUSTOM_TASK}>Custom...</option>
        </select>
      </label>
      {task === CUSTOM_TASK && (
        <label className="text-xs font-semibold text-muted">
          Name
          <input
            aria-label="Week custom task"
            autoFocus
            className={cx(FIELD, 'mt-1 block w-40')}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Task name"
          />
        </label>
      )}
      <label className="text-xs font-semibold text-muted">
        Type
        <select aria-label="Week type" className={cx(FIELD, 'mt-1 block w-32')} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="number"># Number</option>
          <option value="milestone">☑ Milestone</option>
          <option value="text">✎ Text</option>
        </select>
      </label>
      {kind === 'number' ? (
        <>
          <label className="text-xs font-semibold text-muted">
            Target
            <input
              aria-label="Week target"
              type="number"
              min={0}
              className={cx(FIELD, 'mt-1 block w-20 text-right')}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Achieved
            <input
              aria-label="Week achieved"
              type="number"
              min={0}
              className={cx(FIELD, 'mt-1 block w-20 text-right')}
              value={achieved}
              onChange={(e) => setAchieved(e.target.value)}
              placeholder="0"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
          </label>
        </>
      ) : (
        <>
          <label className="text-xs font-semibold text-muted">
            Target
            <input
              aria-label="Week target text"
              className={cx(FIELD, 'mt-1 block w-48')}
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder={kind === 'milestone' ? 'e.g. Proposal signed' : 'e.g. Refresh the model'}
            />
          </label>
          {kind === 'milestone' ? (
            <label className="text-xs font-semibold text-muted">
              Status
              <select aria-label="Week status" className={cx(FIELD, 'mt-1 block w-36')} value={status} onChange={(e) => setStatus(e.target.value)}>
                {ROW_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="text-xs font-semibold text-muted">
              Actual
              <input
                aria-label="Week actual text"
                className={cx(FIELD, 'mt-1 block w-48')}
                value={actualText}
                onChange={(e) => setActualText(e.target.value)}
                placeholder="What got done"
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
            </label>
          )}
        </>
      )}
      <Button onClick={add}>
        <Plus size={14} /> Add
      </Button>
      <p className="w-full text-[11px] text-muted">Click any number below to change it.</p>
    </div>
  );
}

export default AddToWeek;
