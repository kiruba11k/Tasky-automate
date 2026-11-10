import { useEffect, useMemo, useRef, useState } from 'react';
import { AutoText } from '@/internal/kit/AutoText';
import { Check, ChevronDown, Copy, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import {
  Se as useStore,
  rt as Card,
  Te as Button,
  oe as cx,
  Ye as toast,
  lt as runAction,
  ea as canPlanFor,
  tc as tracksPeriod,
  We as formatMinutes,
} from '@/internal/min';
import { projectWeekStart, projectWeeks, savedWeekPlan, weekTargetFor } from '../lib/domain.js';
import { addDays, formatOrdinalRange, weekStart } from '../lib/dates.js';
import { weekRows } from '../lib/entries.js';
import { CUSTOM_TASK, entryName, newEntryId, projectLabel, rowTime } from './entryHelpers';
import { OTHER_PREFIX, groupBlocks } from './planBlocks';
import { newTargetId, targetKind } from '../projects/targetKinds';
import { TargetSheet } from '../projects/TargetSheet';
import { sheetColorOf } from './sheetText';
import { DurationInput } from './DurationInput';
import { EntryKindSelect } from './EntryKindSelect';

const FIELD = 'focus-ring w-full rounded-md border border-line bg-surface px-1.5 py-1 text-sm text-ink';

/** A text box that saves when it loses focus or Enter is pressed. */
function CellText({ value, onSave, label, placeholder, type = 'text', className }) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }
  const common = {
    'aria-label': label,
    placeholder,
    value: text,
    onChange: (e) => setText(e.target.value),
    onBlur: () => text !== value && onSave(text),
    onKeyDown: (e) => e.key === 'Enter' && e.target.blur(),
  };
  // text wraps and grows so everything typed stays in view; numbers stay a plain box
  if (type !== 'number') return <AutoText {...common} className={cx(FIELD, className)} />;
  return <input {...common} type="number" min={0} className={cx(FIELD, 'text-right tabular-nums', className)} />;
}

/** "Fill from previous week" menu: the earlier weeks that have targets of their own, to copy into this week (what is already here is kept). */
function WeekFillPicker({ weeks, onPick }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  return (
    <span ref={root} className="relative inline-block">
      <Button tone="ghost" className="border border-line" data-testid="fill-weekly-targets" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} title="Copy targets from an earlier week into this week">
        <Copy size={13} /> Fill from previous week <ChevronDown size={11} />
      </Button>
      {open && (
        <div role="menu" aria-label="Earlier weeks" className="absolute right-0 z-30 mt-1 max-h-72 w-72 overflow-y-auto rounded-xl border border-line bg-surface p-1 text-left shadow-pop">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Copy from</p>
          {weeks.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted">No targets saved in earlier weeks yet.</p>
          ) : (
            weeks.map((w) => (
              <button key={w.monday} type="button" role="menuitem" data-source-week={w.monday} className="focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2" onClick={() => { setOpen(false); onPick(w.monday); }}>
                <b className="font-semibold">{formatOrdinalRange(w.monday, addDays(w.monday, 4))}</b>
                <span className="text-xs text-muted">{w.count} target{w.count === 1 ? '' : 's'}</span>
              </button>
            ))
          )}
        </div>
      )}
    </span>
  );
}

/** Every target row of the week as one list: a project's fixed targets, the person's own, and read-only plan / table work. */
function collectItems({ personId, date, projects, daily, weekly }) {
  const monday = weekStart(date);
  const weekRange = formatOrdinalRange(monday, addDays(monday, 4));
  const mineProjects = projects.filter((p) => p.status === 'active' && (p.pmId === personId || p.teamIds?.includes(personId) || p.admins?.includes(personId)));
  const items = [];
  mineProjects.forEach((p) => {
    const start = projectWeekStart(p, date);
    const wk = projectWeeks(p).find((w) => w.start === start);
    const range = formatOrdinalRange(start, wk?.end ?? addDays(start, 4)); // the project's own week
    const off = p.weekOff?.[start] ?? [];
    const goals = weekTargetFor(p, date) ?? {};
    const custom = (p.weekText?.[start] ?? []).filter((r) => r.label?.trim());
    if (!savedWeekPlan(p, date) && !custom.length) return;
    const editable = canPlanFor(p, personId);
    (p.metrics ?? [])
      .filter((m) => tracksPeriod(m, 'week') && !off.includes(m.id) && (goals[m.id] ?? 0) > 0)
      .forEach((m) => items.push({ src: 'project', key: `m:${p.id}:${m.id}`, range, project: p, projectName: p.name, start, goals, off, metric: m.id, label: m.label, kind: 'number', goal: String(goals[m.id]), editable }));
    custom.forEach((r) => {
      const kind = targetKind(r);
      items.push({ src: 'project', key: `t:${p.id}:${r.id}`, range, project: p, projectName: p.name, start, row: r, label: r.label, kind, goal: kind === 'number' ? String(r.targetNum ?? 0) : r.target ?? '', editable });
    });
  });
  // the targets the person added to the week themselves
  (weekly[`${personId}|${monday}`]?.entries ?? [])
    .filter((e) => e.task)
    .forEach((e) => {
      const p = projects.find((x) => x.id === e.projectId);
      const kind = e.kind ?? 'number';
      items.push({ src: 'mine', key: `e:${e.id}`, range: weekRange, projectName: p?.name ?? projectLabel(e.projectId, projects), entry: e, label: entryName(e, p), kind, goal: kind === 'number' ? String(e.qty ?? '') : e.targetText ?? '', time: rowTime(e), editable: true });
    });
  // company work typed into the day tables, and time planned for work that is no project (read only here)
  weekRows(personId, monday, daily, [], {}, [])
    .filter((r) => String(r.projectId).startsWith(OTHER_PREFIX) && (r.qty > 0 || r.targetText?.trim()))
    .forEach((r) => {
      const kind = r.kind ?? 'number';
      items.push({ src: 'day', key: `d:${r.id}`, range: weekRange, projectName: projectLabel(r.projectId, []), label: entryName(r), kind, goal: kind === 'number' ? String(r.qty) : (r.targetText ?? '').trim(), time: rowTime(r), editable: false });
    });
  const planned = new Map();
  const add = (name, minutes) => minutes > 0 && planned.set(name, (planned.get(name) ?? 0) + minutes);
  for (let i = 0; i < 5; i++) {
    const day = daily?.[`${personId}|${addDays(monday, i)}`];
    if (!day) continue;
    groupBlocks((day.plan ?? []).filter((b) => b.id !== 'lunch')).forEach((g) => {
      const pid = g.custom ? (g.custom.projectId ?? g.projectId) : g.projectId;
      if (projects.some((p) => p.id === pid)) return;
      add(String(pid).startsWith(OTHER_PREFIX) ? pid.slice(OTHER_PREFIX.length) : (g.custom?.title ?? 'Other work'), g.minutes);
    });
    (day.extra ?? []).forEach((x) => !projects.some((p) => p.id === x.projectId) && add(x.work || 'Other work', x.minutes));
  }
  planned.forEach((minutes, name) => items.push({ src: 'plan', key: `p:${name}`, range: weekRange, projectName: name, label: name, kind: 'number', goal: '', time: minutes, editable: false }));
  return { items, mineProjects, monday };
}

/**
 * "Weekly targets" on the Tasks update page: the fixed weekly targets of every project the person is on and the ones they set
 * themselves, as one sheet with Copy as image. Edit turns the table itself into an editor: change a target, its goal or time, delete a
 * row, add a row, or fill from last week. A project's fixed targets can be changed by the people who manage the project.
 */
export function WeeklyTargets({ personId, date }) {
  const { projects, daily, weekly, profiles, saveWeekly, saveWeekPlan, setWeekOff, setWeekText } = useStore();
  const [editing, setEditing] = useState(false);
  const { items, mineProjects, monday } = useMemo(() => collectItems({ personId, date, projects, daily, weekly }), [personId, date, projects, daily, weekly]);
  const plannable = mineProjects.filter((p) => canPlanFor(p, personId));
  const OTHER = 'other';
  const [adding, setAdding] = useState({ projectId: '', work: '', name: '', kind: 'number', goal: '', time: undefined, forProject: true });
  const addProjectId = adding.projectId || mineProjects[0]?.id || OTHER;
  const canFix = plannable.some((p) => p.id === addProjectId);
  const record = weekly[`${personId}|${monday}`];
  const color = sheetColorOf(profiles[personId], 'week');

  const saveMine = (entries) => saveWeekly(personId, monday, { entries });
  const rowFor = (base, { name, kind, goal, time }) => {
    const number = kind === 'number';
    return { ...base, task: CUSTOM_TASK, custom: name.trim(), kind, qty: number ? Math.max(0, Math.round(+goal || 0)) : undefined, doneQty: number ? base.doneQty : undefined, targetText: number ? undefined : (goal ?? '').trim(), desc: base.desc ?? '', estMin: time ?? 0, actualMin: time, remarks: base.remarks ?? '', achieved: base.achieved ?? '' };
  };
  const textRows = (p, start) => (p.weekText?.[start] ?? []).map((r) => ({ ...r }));
  const fail = (m) => {
    throw new Error(m);
  };

  /** Save one change to a row; `patch` has label / kind / goal / time. */
  const change = (it, patch) =>
    runAction(() => {
      const next = { label: it.label, kind: it.kind, goal: it.goal, time: it.time, ...patch };
      if (it.src === 'mine') {
        if (!next.label.trim()) fail('Type the target.');
        saveMine((record?.entries ?? []).map((x) => (x.id === it.entry.id ? rowFor(x, { name: next.label, kind: next.kind, goal: next.goal, time: next.time }) : x)));
      } else if (it.metric) {
        if (!(+next.goal >= 0)) fail('The goal must be a number.');
        const numbers = Object.fromEntries((it.project.metrics ?? []).map((m) => [m.id, it.goals[m.id] ?? 0]));
        saveWeekPlan(it.project.id, it.start, { ...numbers, [it.metric]: Math.round(+next.goal) });
      } else {
        if (!next.label.trim()) fail('Type the target.');
        const number = next.kind === 'number';
        setWeekText(it.project.id, it.start, textRows(it.project, it.start).map((r) => (r.id === it.row.id ? { ...r, label: next.label.trim(), kind: next.kind, target: number ? '' : (next.goal ?? '').trim(), targetNum: number ? Math.max(0, Math.round(+next.goal || 0)) : undefined } : r)));
      }
    });
  const remove = (it) => {
    const ok = runAction(() => {
      if (it.src === 'mine') saveMine((record?.entries ?? []).filter((x) => x.id !== it.entry.id));
      else if (it.metric) setWeekOff(it.project.id, it.start, [...it.off, it.metric]);
      else setWeekText(it.project.id, it.start, textRows(it.project, it.start).filter((r) => r.id !== it.row.id));
    });
    if (ok) toast({ title: 'Target removed', tone: 'info' });
  };
  /** Move a target to another project (a project's own text targets only between projects the person manages). */
  const moveTo = (it, pid) => {
    const ok = runAction(() => {
      if (it.src === 'mine') {
        const projectId = pid === OTHER ? `${OTHER_PREFIX}Other work` : pid;
        saveMine((record?.entries ?? []).map((x) => (x.id === it.entry.id ? { ...x, projectId } : x)));
      } else {
        const to = plannable.find((p) => p.id === pid);
        if (!to) fail('You can only move it to a project you manage.');
        const toStart = projectWeekStart(to, date);
        const rows = textRows(to, toStart);
        setWeekText(to.id, toStart, [...rows, { ...it.row, id: newTargetId(rows.length) }]); // add first, so nothing is lost if it is refused
        setWeekText(it.project.id, it.start, textRows(it.project, it.start).filter((r) => r.id !== it.row.id));
      }
    });
    if (ok) toast({ title: 'Target moved', tone: 'success' });
  };
  const add = () => {
    if (!adding.name.trim()) return toast({ title: 'Type the target', tone: 'info' });
    if (adding.kind === 'number' && !(+adding.goal > 0)) return toast({ title: 'Type the goal number', tone: 'info' });
    if (addProjectId === OTHER && !adding.work.trim()) return toast({ title: 'Type what the work is for', tone: 'info' });
    const p = mineProjects.find((x) => x.id === addProjectId);
    const ok = runAction(() => {
      if (p && canFix && adding.forProject) {
        const start = projectWeekStart(p, date);
        const rows = textRows(p, start);
        setWeekText(p.id, start, [...rows, { id: newTargetId(rows.length), label: adding.name.trim(), kind: adding.kind, target: adding.kind === 'number' ? '' : adding.goal.trim(), ...(adding.kind === 'number' ? { targetNum: Math.round(+adding.goal) } : {}) }]);
      } else {
        const projectId = addProjectId === OTHER ? `other:${adding.work.trim()}` : addProjectId;
        saveMine([...(record?.entries ?? []), rowFor({ id: newEntryId(), projectId }, { name: adding.name, kind: adding.kind, goal: adding.goal, time: adding.time })]);
      }
    });
    if (ok) {
      setAdding({ ...adding, name: '', goal: '', time: undefined });
      toast({ title: 'Target added', tone: 'success' });
    }
  };
  /** Earlier weeks (newest first, up to 8) that have targets of their own to copy. */
  const earlierWeeks = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((k) => addDays(monday, -7 * k))
    .map((mon) => ({ monday: mon, count: (weekly[`${personId}|${mon}`]?.entries ?? []).filter((e) => e.task).length }))
    .filter((w) => w.count > 0);
  const fillFromWeek = (from) => {
    const prev = (weekly[`${personId}|${from}`]?.entries ?? []).filter((e) => e.task);
    if (!prev.length) return toast({ title: 'No targets that week to copy', tone: 'info' });
    const same = (a, b) => a.projectId === b.projectId && (a.custom ?? a.task).trim().toLowerCase() === (b.custom ?? b.task).trim().toLowerCase() && (a.kind ?? 'number') === (b.kind ?? 'number');
    const fresh = prev.filter((e) => !(record?.entries ?? []).some((x) => same(x, e)));
    if (!fresh.length) return toast({ title: 'That week\'s targets are already here', tone: 'info' });
    saveMine([...(record?.entries ?? []), ...fresh.map((e) => ({ ...e, id: newEntryId(), doneQty: undefined, actualText: undefined, status: e.kind === 'milestone' ? 'Not started' : undefined }))]);
    toast({ title: `${fresh.length} target${fresh.length === 1 ? '' : 's'} copied from ${formatOrdinalRange(from, addDays(from, 4))}`, tone: 'success' });
  };

  if (!items.length && !editing && !mineProjects.length) return null;

  const sheetRows = items.map((it) => [it.range, it.projectName, it.label, it.goal || (it.src === 'plan' ? '' : '·'), it.time > 0 ? formatMinutes(it.time) : '']);
  const head = 'border border-white/20 px-3 py-2 text-center text-xs font-bold';
  const cell = 'border border-line px-2 py-1.5 align-middle';

  return (
    <div data-testid="weekly-targets">
      <Card className="!p-0">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Target size={17} className="text-accent-ink" /> Weekly targets
            </h2>
            <p className="text-xs text-muted">The targets fixed for your projects this week, plus the ones you set yourself, all in one table.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <WeekFillPicker weeks={earlierWeeks} onPick={(from) => { fillFromWeek(from); setEditing(true); }} />
            <Button tone="ghost" className="border border-line" data-testid="edit-weekly-targets" onClick={() => setEditing((v) => !v)}>
              {editing ? (
                <>
                  <Check size={13} /> Done
                </>
              ) : (
                <>
                  <Pencil size={13} /> Edit
                </>
              )}
            </Button>
          </div>
        </div>
        {!editing && items.length > 0 && (
          <TargetSheet title="Weekly targets" heading={`Week of ${formatOrdinalRange(monday, addDays(monday, 4))}`} columns={['Date', 'Project', 'Target', 'Goal', 'Time']} rows={sheetRows} group={2} filename="weekly-targets.png" testId="weekly-targets-sheet" />
        )}
        {!editing && items.length === 0 && <p className="px-4 py-4 text-sm text-muted">No targets for this week yet. Press Edit to add one.</p>}
        {editing && (
          <div className="overflow-x-auto px-3 pb-3 pt-2" data-testid="weekly-targets-editor">
            <table className="w-full min-w-[760px] border-collapse text-sm" aria-label="Edit weekly targets">
              <thead>
                <tr className="text-white" style={{ background: color }}>
                  {['Date', 'Project', 'Target', 'Goal', 'Time', ''].map((h, i) => (
                    <th key={i} className={cx(head, i === 5 && 'w-10')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const firstOfRange = i === 0 || items[i - 1].range !== it.range;
                  let dateSpan = 1;
                  while (i + dateSpan < items.length && items[i + dateSpan].range === it.range) dateSpan++;
                  const number = it.kind === 'number';
                  return (
                    <tr key={it.key} className={i % 2 ? 'bg-surface-2/40' : 'bg-surface'} data-target-row={it.key}>
                      {firstOfRange && (
                        <td rowSpan={dateSpan} className={`${cell} text-center align-middle font-semibold`}>
                          {it.range}
                        </td>
                      )}
                      <td className={`${cell} text-center align-middle font-semibold`}>
                        {it.editable && !it.metric ? (
                          <select
                            aria-label={`${it.label} project`}
                            className={cx(FIELD, 'font-semibold')}
                            value={it.src === 'mine' ? (String(it.entry.projectId).startsWith(OTHER_PREFIX) ? OTHER : it.entry.projectId) : it.project.id}
                            onChange={(e) => e.target.value !== (it.src === 'mine' ? it.entry.projectId : it.project.id) && moveTo(it, e.target.value)}
                          >
                            {(it.src === 'mine' ? mineProjects : plannable).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                            {it.src === 'mine' && <option value={OTHER}>{String(it.entry.projectId).startsWith(OTHER_PREFIX) ? it.projectName : 'Other work (not a project)'}</option>}
                          </select>
                        ) : (
                          it.projectName
                        )}
                      </td>
                      {it.editable ? (
                        <>
                          <td className={cell}>
                            {it.metric ? (
                              <span className="px-1.5 font-medium">{it.label}</span>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <EntryKindSelect compact value={it.kind} onChange={(k) => change(it, { kind: k })} />
                                <CellText label={`${it.label} target`} value={it.label} onSave={(v) => change(it, { label: v })} />
                              </span>
                            )}
                          </td>
                          <td className={cell}>
                            <CellText label={`${it.label} goal`} type={number ? 'number' : 'text'} value={it.goal} onSave={(v) => change(it, { goal: v })} />
                          </td>
                          <td className={`${cell} text-center`}>
                            {it.src === 'mine' ? <DurationInput label={`${it.label} time`} column="target-time" placeholder="..." value={it.time || undefined} onChange={(m) => change(it, { time: m })} /> : null}
                          </td>
                          <td className={`${cell} text-center`}>
                            <button type="button" aria-label={`Delete ${it.label}`} title="Delete" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink" onClick={() => remove(it)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`${cell} px-3`}>{it.label}</td>
                          <td className={`${cell} px-3 text-center`}>{it.goal}</td>
                          <td className={`${cell} text-center tabular-nums`}>{it.time > 0 ? formatMinutes(it.time) : ''}</td>
                          <td className={cell} />
                        </>
                      )}
                    </tr>
                  );
                })}
                <tr className="bg-accent-soft/30" data-testid="add-target-row">
                  <td className={cell} colSpan={2}>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <select aria-label="Target project" className={cx(FIELD, 'w-44')} value={addProjectId} onChange={(e) => setAdding({ ...adding, projectId: e.target.value })}>
                        {mineProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                        <option value={OTHER}>Other work (not a project)</option>
                      </select>
                      {addProjectId === OTHER && <AutoText aria-label="Target work" className={cx(FIELD, 'w-32')} placeholder="e.g. Hiring" value={adding.work} onChange={(e) => setAdding({ ...adding, work: e.target.value })} />}
                      {canFix && (
                        <select aria-label="Target for" className={cx(FIELD, 'w-36')} value={adding.forProject ? 'project' : 'me'} onChange={(e) => setAdding({ ...adding, forProject: e.target.value === 'project' })}>
                          <option value="project">Fix for the project</option>
                          <option value="me">Just for me</option>
                        </select>
                      )}
                    </span>
                  </td>
                  <td className={cell}>
                    <span className="flex items-center gap-1.5">
                      <EntryKindSelect compact value={adding.kind} onChange={(k) => setAdding({ ...adding, kind: k })} />
                      <AutoText aria-label="Target name" className={FIELD} placeholder="e.g. 200 prospects mapped" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
                    </span>
                  </td>
                  <td className={cell}>
                    <input aria-label="Target goal" type={adding.kind === 'number' ? 'number' : 'text'} min={0} className={cx(FIELD, adding.kind === 'number' && 'text-right')} placeholder={adding.kind === 'number' ? '0' : 'Goal'} value={adding.goal} onChange={(e) => setAdding({ ...adding, goal: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
                  </td>
                  <td className={`${cell} text-center`}>{!(canFix && adding.forProject) && <DurationInput label="Target time" column="add-target-time" placeholder="..." value={adding.time} onChange={(m) => setAdding({ ...adding, time: m })} />}</td>
                  <td className={`${cell} text-center`}>
                    <button type="button" aria-label="Add target" title="Add" className="focus-ring rounded-lg bg-accent p-1.5 text-accent-on hover:opacity-90" onClick={add}>
                      <Plus size={14} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default WeeklyTargets;
