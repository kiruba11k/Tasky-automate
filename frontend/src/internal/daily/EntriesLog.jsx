import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, CalendarRange, Pencil, Plus, Save, Lock, Trash, Copy } from 'lucide-react';
import {
  oe as cx,
  Se as useStore,
  rt as Card,
  Te as Button,
  qe as Badge,
  lt as guarded,
  Ye as toast,
  We as formatMinutes,
  pu as projectColor,
  Mn as toMinutes,
} from '@/internal/min';
import { addDays, previousWeekday, weekStart } from '../lib/dates.js';
import { canManageProject, computeStandardMinutes, emptyDaily, emptyWeekly } from '../lib/domain.js';
import { WeekPlanner } from '../projects/WeekPlanner';
import { DurationInput } from './DurationInput';
import { formatDayClock } from './dateHelpers';
import { blockMinutes } from './planHelpers';
import { CUSTOM_TASK, blankEntry, entryName, newEntryId, parseQty, taskChoices, weeklyAchieved } from './entryHelpers';

/** Window event: "open the day's tasks for editing" (sent by the Edit button on the day's progress card). */
export const EDIT_DAY_TASKS = 'ls-edit-day-tasks';

const TEXT = 'focus-ring w-full rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink';
const isDone = (row, achieved) => (row.qty ? (achieved ?? 0) >= row.qty : (achieved ?? 0) > 0);
const NUMBER = 'focus-ring w-20 rounded-lg border border-line bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink';

/** The record (and previous one, to copy from) that holds a person's rows for a day or a week. */
function useEntriesRecord(personId, kind, date) {
  const { daily, weekly, saveDaily, saveWeekly } = useStore();
  const key = kind === 'day' ? date : weekStart(date);
  const record = kind === 'day' ? (daily[`${personId}|${key}`] ?? emptyDaily()) : (weekly[`${personId}|${key}`] ?? emptyWeekly());
  const prevKey = kind === 'day' ? previousWeekday(date) : addDays(key, -7);
  const previous = (kind === 'day' ? daily[`${personId}|${prevKey}`] : weekly[`${personId}|${prevKey}`])?.entries ?? [];
  return {
    key,
    record,
    previous,
    save: (patch) => (kind === 'day' ? saveDaily(personId, key, patch) : saveWeekly(personId, key, patch)),
  };
}

/**
 * One table per project for the day ("Daily update") or the week ("Weekly targets by project"): task, description, target,
 * estimated time, then (after locking) actual time, achieved and remarks. `readOnly` is the manager's view of someone else's.
 */
export function EntriesLog({ personId, date, plan, extra, readOnly, kind = 'day' }) {
  const { me, projects, daily } = useStore();
  const { key, record, previous, save } = useEntriesRecord(personId, kind, date);
  const stored = record.entries ?? [];
  const blocks = plan ?? (kind === 'day' ? record.plan : []);
  const extras = extra ?? (kind === 'day' ? (record.extra ?? []) : []);
  const [rows, setRows] = useState(stored);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setRows(stored);
    setUnlocked(false);
  }, [personId, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!unlocked) setRows(stored);
  }, [record.entries]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (readOnly || kind !== 'day') return undefined;
    const open = () => {
      setUnlocked(true);
      document.getElementById('daily-update')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener(EDIT_DAY_TASKS, open);
    return () => window.removeEventListener(EDIT_DAY_TASKS, open);
  }, [readOnly, kind]);

  const locked = !!record.entriesAt && !unlocked;
  const shown = readOnly ? stored : rows;
  const editable = !readOnly && !locked; // task, description, target and estimate can still change
  const noun = kind === 'day' ? 'day' : 'week';

  // Projects with a table, and the time planned for each (day: from the plan and extra hours; week: the hours per day times five).
  const groups = useMemo(() => {
    const planned = new Map();
    if (kind === 'day') {
      [...blocks]
        .sort((a, b) => a.start.localeCompare(b.start))
        .forEach((b) => {
          const pid = b.custom ? (b.custom.projectId ?? b.projectId) : b.projectId;
          if (pid) planned.set(pid, (planned.get(pid) ?? 0) + blockMinutes(b));
        });
      extras.forEach((x) => {
        const minutes = x.start && x.end && x.end > x.start ? toMinutes(x.end) - toMinutes(x.start) : x.minutes;
        if (x.projectId) planned.set(x.projectId, (planned.get(x.projectId) ?? 0) + (minutes || 0));
      });
    } else {
      projects
        .filter((p) => p.status === 'active' && (p.pmId === personId || p.teamIds.includes(personId) || p.admins?.includes(personId)))
        .forEach((p) => planned.set(p.id, Math.round((p.hours[personId] ?? 0) * 60 * 5)));
    }
    shown.forEach((r) => {
      if (!planned.has(r.projectId)) planned.set(r.projectId, 0);
    });
    return [...planned].map(([pid, minutes]) => ({ project: projects.find((p) => p.id === pid), pid, planned: minutes })).filter((g) => g.project);
  }, [kind, blocks, extras, shown, projects, personId]);

  const update = (id, patch) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  // The estimate follows the project's standard time for the task and target (per 10 prospects, per message...) until it is typed by hand.
  const standardFor = (row, qty) => {
    const project = projects.find((p) => p.id === row.projectId);
    if (!project || !row.task || row.task === CUSTOM_TASK || !(qty > 0)) return null;
    const builtIn = !row.task.startsWith('std:');
    return computeStandardMinutes(project, builtIn ? row.task : 'custom', qty, undefined, builtIn ? undefined : row.task.slice(4));
  };
  const reestimate = (row, patch) => {
    const next = { ...row, ...patch };
    if (next.estManual) return patch;
    const std = standardFor(next, next.qty);
    return std ? { ...patch, estMin: std, estAuto: true } : patch;
  };
  const fillFromPrevious = (pid) => {
    const source = previous.filter((r) => r.projectId === pid);
    if (!source.length) {
      toast({ title: `Nothing saved for this project ${kind === 'day' ? 'on the previous day' : 'last week'}`, tone: 'info' });
      return;
    }
    setRows((list) => [
      ...list.filter((r) => r.projectId !== pid || r.task),
      ...source.map((r) => ({ ...r, id: newEntryId(), actualMin: undefined, doneQty: undefined, achieved: '', remarks: '' })),
    ]);
    toast({ title: `Copied ${source.length} task${source.length > 1 ? 's' : ''} from ${kind === 'day' ? 'the previous day' : 'last week'}`, tone: 'success' });
  };
  const persist = (lock) =>
    guarded(() => {
      const kept = rows.filter((r) => r.task && (r.task !== CUSTOM_TASK || r.custom?.trim()));
      if (lock && !kept.length) throw new Error('Add at least one task before locking.');
      const at = new Date().toISOString();
      save({ entries: kept, ...(lock ? { entriesAt: at, ...(kind === 'day' && !record.sodAt ? { sodAt: at } : {}) } : {}) });
      setRows(kept);
      setUnlocked(false);
      toast({ title: lock ? `${kind === 'day' ? 'Daily' : 'Weekly'} tasks locked 🔒` : 'Saved ✓', tone: 'success' });
    });

  const totals = shown.reduce((t, r) => ({ est: t.est + r.estMin, act: t.act + (r.actualMin ?? 0) }), { est: 0, act: 0 });
  const plannedTotal = groups.reduce((sum, g) => sum + g.planned, 0);
  const monday = weekStart(date);
  const achievedOf = (r) => (kind === 'week' ? weeklyAchieved(r, personId, monday, daily) : r.doneQty);

  return (
    <Card className="!p-0">
      <div
        id={readOnly ? undefined : kind === 'day' ? 'daily-update' : 'weekly-update'}
        className="flex scroll-mt-20 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3"
      >
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            {kind === 'day' ? <ClipboardCheck size={17} className="text-accent-ink" /> : <CalendarRange size={17} className="text-accent-ink" />}
            {kind === 'day' ? 'Daily update' : 'Weekly targets by project'}
          </h2>
          <p className="text-xs text-muted">
            {readOnly
              ? `Tasks per project for the ${noun}.`
              : kind === 'day'
                ? 'One table for every project in your plan. Add the tasks with targets, lock them, then fill in actual time and how many got done.'
                : "Set the week's tasks and targets for each project. Achieved adds up from your daily updates unless you type it."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {record.entriesAt ? <Badge tone="mint">Locked {formatDayClock(record.entriesAt)}</Badge> : <Badge tone="grey">Not locked yet</Badge>}
          {!readOnly && locked && (
            <Button tone="ghost" className="border border-line" onClick={() => setUnlocked(true)}>
              <Pencil size={13} /> Update tasks
            </Button>
          )}
        </div>
      </div>
      {groups.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-muted">
          {readOnly
            ? `Nothing for this ${noun}.`
            : kind === 'day'
              ? 'Add time blocks to your plan above and a table opens here for each project.'
              : 'You are not on any project yet.'}
        </p>
      )}
      <div className="space-y-4 p-4">
        {groups.map(({ project, pid, planned }) => {
          const mine = shown.filter((r) => r.projectId === pid);
          const est = mine.reduce((s, r) => s + r.estMin, 0);
          const act = mine.reduce((s, r) => s + (r.actualMin ?? 0), 0);
          return (
            <section
              key={pid}
              data-project-log={pid}
              data-kind={kind}
              className="overflow-hidden rounded-xl border border-line"
              style={{ borderLeft: `5px solid ${projectColor(projects, pid)}` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-2/60 px-3 py-2">
                <p className="font-semibold">{project.name}</p>
                <span className="flex flex-wrap items-center gap-2">
                  {planned > 0 && (
                    <span className="text-xs text-muted">
                      Planned <b className="text-ink">{formatMinutes(planned)}</b>
                    </span>
                  )}
                  {editable && (
                    <button
                      className="focus-ring flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-accent-ink hover:bg-surface-2"
                      onClick={() => fillFromPrevious(pid)}
                    >
                      <Copy size={11} /> Fill from {kind === 'day' ? 'previous day' : 'last week'}
                    </button>
                  )}
                </span>
              </div>
              {kind === 'week' && !readOnly && canManageProject(project, me) && (
                <details className="border-b border-line px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-accent-ink">
                    Project number targets for the week (shows on the Projects tab)
                  </summary>
                  <div className="mt-2">
                    <WeekPlanner p={project} date={date} />
                  </div>
                </details>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm" aria-label={`${project.name} ${noun} tasks`}>
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                      <th className="w-48 px-2 py-1.5">Task</th>
                      <th className="px-2 py-1.5">
                        Description <span className="normal-case">(optional)</span>
                      </th>
                      <th className="w-20 px-2 py-1.5">Target</th>
                      <th className="w-24 px-2 py-1.5">Estimated</th>
                      <th className="w-24 px-2 py-1.5">Actual</th>
                      <th className="w-20 px-2 py-1.5">Done</th>
                      <th className="w-44 px-2 py-1.5">Remarks</th>
                      {editable && <th className="w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {mine.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-2 py-3 text-xs text-muted">
                          No tasks yet.
                        </td>
                      </tr>
                    )}
                    {mine.map((r) => {
                      const achieved = achievedOf(r);
                      return (
                        <tr key={r.id} data-entry={r.id} className="border-t border-line align-top">
                          <td className="px-2 py-1.5">
                            {editable ? (
                              <>
                                <select aria-label="Task" className={TEXT} value={r.task} onChange={(e) => update(r.id, reestimate(r, { task: e.target.value }))}>
                                  <option value="">Pick a task</option>
                                  {taskChoices(project).map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                  <option value={CUSTOM_TASK}>Custom...</option>
                                </select>
                                {r.task === CUSTOM_TASK && (
                                  <input
                                    aria-label="Custom task name"
                                    autoFocus
                                    className={cx(TEXT, 'mt-1')}
                                    placeholder="Task name"
                                    value={r.custom ?? ''}
                                    onChange={(e) => update(r.id, { custom: e.target.value })}
                                  />
                                )}
                              </>
                            ) : (
                              <span className="font-medium">{entryName(r, project)}</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {editable ? (
                              <input aria-label="Description" className={TEXT} placeholder="e.g. CFO list" value={r.desc} onChange={(e) => update(r.id, { desc: e.target.value })} />
                            ) : (
                              <span className="text-muted">{r.desc || '·'}</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {editable ? (
                              <input aria-label="Target" type="number" min={0} className={NUMBER} placeholder="30" value={r.qty ?? ''} onChange={(e) => update(r.id, reestimate(r, { qty: parseQty(e.target.value) }))} />
                            ) : (
                              <span className="tabular-nums">{r.qty ?? '·'}</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {editable ? (
                              <DurationInput label="Estimated time" className="w-24" placeholder="1h" value={r.estMin || undefined} onChange={(m) => update(r.id, { estMin: m ?? 0, estManual: m != null, estAuto: false })} />
                            ) : (
                              <span className="tabular-nums">{formatMinutes(r.estMin)}</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {readOnly ? (
                              <span className="tabular-nums">{r.actualMin != null ? formatMinutes(r.actualMin) : '·'}</span>
                            ) : (
                              <DurationInput label="Actual time" className="w-24" placeholder="..." value={r.actualMin} onChange={(m) => update(r.id, { actualMin: m ?? undefined })} />
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {(() => {
                              const finished = isDone(r, achieved);
                              const partial = !finished && achieved ? `${achieved}/${r.qty ?? '?'}` : '';
                              return readOnly ? (
                                <span className={finished ? 'font-semibold text-mint-ink' : 'tabular-nums text-muted'}>{finished ? '✓ Done' : partial || '·'}</span>
                              ) : (
                                <label className="flex items-center gap-2" title="Tick when this is done">
                                  <input
                                    aria-label="Achieved"
                                    type="checkbox"
                                    className="h-5 w-5 shrink-0" style={{ accentColor: "rgb(var(--c-accent))" }}
                                    checked={finished}
                                    onChange={(e) =>
                                      update(r.id, { doneQty: e.target.checked ? Math.max(r.qty ?? 1, 1) : kind === 'week' && achieved ? 0 : undefined })
                                    }
                                  />
                                  {partial && <span className="text-xs tabular-nums text-muted">{partial}</span>}
                                </label>
                              );
                            })()}
                          </td>
                          <td className="px-2 py-1.5">
                            {readOnly ? (
                              <span>{r.remarks || '·'}</span>
                            ) : (
                              <input aria-label="Remarks" className={TEXT} placeholder="Anything to note" value={r.remarks} onChange={(e) => update(r.id, { remarks: e.target.value })} />
                            )}
                          </td>
                          {editable && (
                            <td className="py-1.5">
                              <button
                                aria-label="Remove task"
                                className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink"
                                onClick={() => setRows((list) => list.filter((x) => x.id !== r.id))}
                              >
                                <Trash size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-surface-2/40 text-xs font-semibold">
                      <td className="px-2 py-2">
                        {editable && (
                          <button
                            className="focus-ring flex items-center gap-1 rounded-full border border-line px-3 py-1 text-accent-ink hover:bg-surface-2"
                            onClick={() => setRows((list) => [...list, blankEntry(pid)])}
                          >
                            <Plus size={12} /> Add task
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right text-muted" colSpan={2}>
                        Total
                      </td>
                      <td className="px-2 py-2 tabular-nums" data-testid="est-total">
                        {formatMinutes(est)}
                        {planned > 0 && est > planned && <span className="ml-1 text-coral-ink">over plan</span>}
                      </td>
                      <td className="px-2 py-2 tabular-nums" data-testid="act-total">
                        {formatMinutes(act)}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          );
        })}
      </div>
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
          <p className="text-sm">
            {kind === 'day' ? 'Day' : 'Week'} total: planned <b>{formatMinutes(plannedTotal)}</b> · estimated <b data-testid={`${kind}-est`}>{formatMinutes(totals.est)}</b> · actual{' '}
            <b data-testid={`${kind}-act`}>{formatMinutes(totals.act)}</b>
          </p>
          {!readOnly && (
            <span className="ml-auto flex gap-2">
              {locked ? (
                <Button onClick={() => persist(false)}>
                  <Save size={13} /> {kind === 'day' ? 'Save end of day' : 'Save end of week'}
                </Button>
              ) : (
                <Button onClick={() => persist(true)}>
                  <Lock size={13} /> {record.entriesAt ? 'Update and lock' : 'Lock tasks'}
                </Button>
              )}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

export default EntriesLog;
