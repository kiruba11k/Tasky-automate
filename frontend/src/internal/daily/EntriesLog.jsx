import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ClipboardList, Lock, Pencil, Plus, Save, Send, Star, Trash, X, Check } from 'lucide-react';
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
  nt as personName,
  be as firstName,
  Mn as toMinutes,
} from '@/internal/min';
import { computeStandardMinutes, emptyDaily } from '../lib/domain.js';
import { splitEstimates } from '../lib/estimateSplit.js';
import { assignedDay } from '../lib/assigned.js';
import { eodStatusText, reopenedProjects } from '../lib/eodReview.js';
import { DurationInput } from './DurationInput';
import { EntryKindSelect } from './EntryKindSelect';
import { TaskMenuSettings, useTaskMenu } from './TaskMenuSettings';
import { ProjectChanger, PROJECT_CHANGED } from './ProjectChanger';
import { moveEntries } from '../lib/changeProject.js';
import { formatClock, formatDayClock, formatShortDate } from './dateHelpers';
import { FillFromPicker } from './FillFromPicker';
import { DateMenu } from './DateMenu';
import { moveWork } from './moveActions';
import { canReschedule } from '../lib/moveRows.js';
import { blockMinutes } from './planHelpers';
import {
  CUSTOM_TASK,
  ROW_STATUSES,
  STATUS_CLASS,
  blankEntry,
  entryName,
  newEntryId,
  parseQty,
  projectLabel,
  MY_PREFIX,
  taskChoices,
} from './entryHelpers';

/** Window event: "open the day's tasks for editing" (sent by the Edit button on the day's progress card). */
export const EDIT_DAY_TASKS = 'ls-edit-day-tasks';

const OTHER = 'other:';
const FIELD = 'focus-ring w-full rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink';

const assignerText = (r) =>
  r.assignedBy?.length ? `assigned by ${r.assignedBy.map((id) => personName(id).split(' ')[0]).join(', ')}` : 'assigned to you';

const STATUS_LABEL = { todo: 'To do', in_progress: 'In progress', in_review: 'In review', changes: 'Changes asked', done: 'Done' };

/**
 * A task assigned to the person, in the project's day table. The row comes from the task itself (never saved with the day's rows);
 * what the person types on it, the time taken and a note, is kept in the day record's `asg`.
 */
function AssignedRow({ r, project, showRemoveCell, locked, onType, canChange, onChange, onRemove, personId, date, canMove, onReschedule }) {
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState({});
  const carried = !!r.carriedFrom;
  const startEdit = () => {
    setDraft({ qty: r.qty ?? 0, estMin: r.estMin, desc: r.titles.filter((t) => t && t !== r.label).join('; ') });
    setAsking(false);
    setEditing(true);
  };
  const saveEdit = () => {
    onChange({ qty: Number(draft.qty) >= 0 ? Number(draft.qty) : 0, estMin: draft.estMin > 0 ? draft.estMin : 0, desc: draft.desc?.trim() || null });
    setEditing(false);
  };
  const by = r.assignedBy.map((id) => personName(id).split(' ')[0]).join(', ');
  const titles = r.titles.filter((t) => t && t !== r.label);
  const status = [...new Set(r.statuses.map((s) => STATUS_LABEL[s] ?? s))].join(', ');
  const badgeTitle = [by ? `Assigned by ${by}` : '', status].filter(Boolean).join(' · ') || undefined;
  return (
    <tr data-entry={r.id} data-assigned="true" className="border-t border-line align-middle">
      <td className="px-3 py-2">
        <span className="mb-1 flex flex-wrap gap-1">
          {r.carriedFrom ? (
            <span className="rounded bg-butter px-1.5 py-px text-[10px] font-bold text-butter-ink" data-testid="carried-badge" title={badgeTitle}>
              From yesterday's tasks
            </span>
          ) : (
            <span className="rounded bg-sky px-1.5 py-px text-[10px] font-bold text-sky-ink" data-testid="assigned-badge" title={badgeTitle}>
              Assigned
            </span>
          )}
          {r.priority && <Star size={11} className="self-center fill-butter-ink text-butter-ink" aria-label="Priority" />}
        </span>
        <span className="font-medium">
          {entryName(r, project)}
          {!editing && titles.length > 0 && <span className="block text-xs font-normal text-muted">{titles.join('; ')}</span>}
        </span>
        {editing && (
          <input aria-label="Task description" className={cx(FIELD, 'mt-1')} placeholder="Description (today only)" value={draft.desc ?? ''} onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))} />
        )}
        {r.edited && !editing && (
          <span className="mt-0.5 block text-[10px] text-muted" data-testid="carry-edited" title="Changed for today only. Earlier days keep the original.">
            edited for today only
          </span>
        )}
        {asking && (
          <span className="mt-1 flex items-center gap-1.5 text-xs" data-testid="carry-confirm">
            Remove from today?
            <button className="focus-ring rounded-full border border-line px-2 py-0.5 font-semibold text-coral-ink hover:bg-surface-2" onClick={onRemove}>
              Yes
            </button>
            <button className="focus-ring rounded-full border border-line px-2 py-0.5 font-semibold hover:bg-surface-2" onClick={() => setAsking(false)}>
              No
            </button>
          </span>
        )}
      </td>
      <td className="px-2 py-2">
        <EntryKindSelect value="number" disabled />
      </td>
      <td className="px-2 py-2">
        {editing ? (
          <input aria-label="Target" type="number" min={0} className={cx(FIELD, 'w-24')} value={draft.qty} onChange={(e) => setDraft((d) => ({ ...d, qty: e.target.value }))} />
        ) : (
          <span className="tabular-nums">{r.qty || '·'}</span>
        )}
      </td>
      <td className="px-2 py-2">
        {locked ? (
          <span className="tabular-nums" title="Fills in with the approved number, or the number you typed">
            {r.doneQty ?? 0}
            <span className="ml-1 text-[10px] text-muted">{r.approved ? 'approved' : r.typedDone ? 'typed by you' : 'awaiting approval'}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <input
              aria-label="Actual done"
              type="number"
              min={0}
              className={cx(FIELD, 'w-20')}
              placeholder={String(r.doneQty ?? 0)}
              value={r.typedDone ?? ''}
              onChange={(e) => onType({ doneQty: e.target.value === '' ? undefined : Math.max(0, Math.round(+e.target.value)) })}
            />
            <span className="text-[10px] text-muted">{r.approved ? 'approved' : r.typedDone ? 'typed by you' : 'awaiting approval'}</span>
          </span>
        )}
      </td>
      <td className="px-2 py-2">
        {editing ? (
          <DurationInput label="Estimated time" placeholder="..." value={draft.estMin} onChange={(m) => setDraft((d) => ({ ...d, estMin: m ?? 0 }))} />
        ) : (
          <span className="tabular-nums">{formatMinutes(r.estMin)}</span>
        )}
      </td>
      <td className="px-2 py-2">
        {locked ? (
          <span className="tabular-nums">{r.actualMin != null ? formatMinutes(r.actualMin) : '·'}</span>
        ) : (
          <DurationInput label="Actual time" placeholder={r.estMin > 0 ? formatMinutes(r.estMin) : '...'} value={r.actualMin} onChange={(m) => onType({ actualMin: m ?? undefined })} />
        )}
      </td>
      <td className="px-2 py-2">
        {locked ? (
          <span>{r.remarks || '·'}</span>
        ) : (
          <input aria-label="Notes" className={FIELD} placeholder="Add note..." value={r.remarks ?? ''} onChange={(e) => onType({ remarks: e.target.value })} />
        )}
      </td>
      {showRemoveCell && (
        <td className="whitespace-nowrap py-2 pr-2">
          {canMove && !editing && (
            <DateMenu
              personId={personId}
              from={date}
              title="Reschedule task"
              confirmLabel="Reschedule"
              hint="Changes the day of the task itself, so it moves on the Dashboard and everywhere else."
              testId="reschedule-popover"
              onPick={onReschedule}
              trigger={({ onClick }) => (
                <button aria-label="Reschedule" title="Reschedule: change the task's date" data-testid="reschedule-task" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-accent-ink" onClick={onClick}>
                  <CalendarDays size={14} />
                </button>
              )}
            />
          )}
          {carried && canChange && editing && (
            <>
              <button aria-label="Save task" title="Save (today only)" className="focus-ring rounded-lg p-1.5 text-accent-ink hover:bg-surface-2" onClick={saveEdit}>
                <Check size={14} />
              </button>
              {r.edited && (
                <button
                  aria-label="Reset task"
                  title="Back to the original task numbers"
                  className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2"
                  onClick={() => {
                    onChange({ qty: null, estMin: null, desc: null });
                    setEditing(false);
                  }}
                >
                  Reset
                </button>
              )}
              <button aria-label="Cancel edit" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2" onClick={() => setEditing(false)}>
                <X size={14} />
              </button>
            </>
          )}
          {carried && canChange && !editing && (
            <>
              <button aria-label="Edit task" title="Edit for today only" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-accent-ink" onClick={startEdit}>
                <Pencil size={14} />
              </button>
              <button aria-label="Delete task" title="Remove from today" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink" onClick={() => setAsking(true)}>
                <Trash size={14} />
              </button>
            </>
          )}
        </td>
      )}
    </tr>
  );
}

/**
 * "Daily update": one table per project in the day's plan (and any extra project added here) with the tasks, their type
 * (number, milestone or text), target and actual, estimated and taken time and notes. Two locks: first the targets, then the
 * actuals; "Send end of day" is available once the actuals are locked. `readOnly` is the manager's view of someone else's.
 */
export function EntriesLog({ personId, date, plan, extra, readOnly, onChangeProject, lockNote }) {
  const { projects, daily, tasks, saveDaily } = useStore();
  const taskMenu = useTaskMenu(personId);
  const key = date;
  const record = daily[`${personId}|${key}`] ?? emptyDaily();
  const save = (patch) => saveDaily(personId, key, patch);
  const stored = record.entries ?? [];
  const blocks = plan ?? record.plan;
  const extras = extra ?? record.extra ?? [];
  const [rows, setRows] = useState(stored);
  const [asg, setAsg] = useState(record.asg ?? {}); // time and notes typed on assigned rows, saved with the actuals
  const [unlocked, setUnlocked] = useState(false);
  const [actualsOpen, setActualsOpen] = useState(false); // a sent day: only the actuals (time taken, done, notes) are open for editing
  const [added, setAdded] = useState([]); // projects (or "other:" work) added below the tables
  const [pick, setPick] = useState('');
  const [otherName, setOtherName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [changing, setChanging] = useState(null); // pid of the table whose project is being changed

  useEffect(() => {
    setRows(stored);
    setAsg(record.asg ?? {});
    setUnlocked(false);
    setActualsOpen(false);
    setAdded([]);
  }, [personId, key]); // eslint-disable-line react-hooks/exhaustive-deps
  // Edits are saved as they are typed (see the effect below). When the saved rows change underneath (another save, a refresh from
  // the server) the local rows are only replaced if they hold no edits of their own, so typing is never reset to the old values.
  const seenEntries = useRef(JSON.stringify(stored));
  const seenAsg = useRef(JSON.stringify(record.asg ?? {}));
  useEffect(() => {
    const before = seenEntries.current;
    seenEntries.current = JSON.stringify(stored);
    if (!unlocked && JSON.stringify(rows) === before) setRows(stored);
  }, [record.entries]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const before = seenAsg.current;
    seenAsg.current = JSON.stringify(record.asg ?? {});
    if (!unlocked && JSON.stringify(asg) === before) setAsg(record.asg ?? {});
  }, [record.asg]); // eslint-disable-line react-hooks/exhaustive-deps
  // Auto-save: whatever is typed in the day's tables is saved a moment later, so Today's targets, the hours and the manager views
  // follow it live and nothing is lost if the page refreshes. Locking still stamps the lock times.
  useEffect(() => {
    if (readOnly) return undefined;
    const valid = (r) => r.task && (r.task !== CUSTOM_TASK || r.custom?.trim());
    const kept = rows.filter(valid);
    const entriesChanged = JSON.stringify(kept) !== JSON.stringify(stored.filter(valid));
    const asgChanged = JSON.stringify(asg) !== JSON.stringify(record.asg ?? {}) && (Object.keys(asg).length > 0 || !!record.asg);
    if (!entriesChanged && !asgChanged) return undefined;
    const timer = setTimeout(() => {
      try {
        save({ ...(entriesChanged ? { entries: kept } : {}), ...(asgChanged ? { asg } : {}), ...(actualsOpen && record.eodAt ? { eodAt: record.eodAt } : {}) }); // the same sending time again refreshes the sent report
      } catch {
        /* a refused save (for example a locked day) leaves the typed values as they are */
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [rows, asg, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (readOnly) return undefined;
    const open = () => {
      setUnlocked(true);
      document.getElementById('daily-update')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener(EDIT_DAY_TASKS, open);
    return () => window.removeEventListener(EDIT_DAY_TASKS, open);
  }, [readOnly]);

  // A project change saved from the plan (or from a table header): rows still being edited here follow it too.
  useEffect(() => {
    if (readOnly) return undefined;
    const follow = (e) => {
      const { from, to } = e.detail ?? {};
      setRows((list) => moveEntries(list, from, to, useStore.getState().projects));
      setAdded((list) => (list.includes(from) ? [...new Set(list.map((p) => (p === from ? to : p)))] : list));
    };
    window.addEventListener(PROJECT_CHANGED, follow);
    return () => window.removeEventListener(PROJECT_CHANGED, follow);
  }, [readOnly]);

  const reopenedPids = useMemo(() => reopenedProjects(record), [record.eodReviews]); // eslint-disable-line react-hooks/exhaustive-deps
  const targetsLocked = !!record.entriesAt && !unlocked;
  const actualsAt = record.actualsAt ?? record.entriesDoneAt;
  const actualsLocked = !!actualsAt && !unlocked;
  const actualsReadOnly = readOnly || (actualsLocked && !actualsOpen);
  const canSend =
    !!record.entriesAt && !!actualsAt && !unlocked && (!record.entriesDoneAt || (record.actualsAt ?? '') > record.entriesDoneAt || reopenedPids.size > 0);
  const shown = readOnly ? stored : rows;
  const targetsEditable = !readOnly && !targetsLocked;
  // Tasks assigned to this person for the day (and unfinished ones carried over to today): read-only rows next to the logged ones.
  const shownAsg = readOnly ? (record.asg ?? {}) : asg;
  const assignedNow = useMemo(() => assignedDay(tasks, personId, date, { projects, logged: shown, asg: shownAsg, carryEdits: record.carryEdits, defaultTaken: !!record.eodAt }), [tasks, personId, date, projects, shown, shownAsg, record.carryEdits]);
  /** Today-only changes to a carried-over row (patch: qty / estMin / desc, null removes one; hidden: true removes the row from today). Saved at once. */
  const changeCarried = (rowId, patch) => {
    // saveDaily replaces a field as a whole, so send the whole map (read fresh, not from this render): changing one row must keep the
    // other rows' edits.
    const all = { ...(useStore.getState().daily[`${personId}|${key}`]?.carryEdits ?? {}) };
    const merged = { ...(all[rowId] ?? {}), ...patch };
    const empty = Object.values(merged).every((v) => v == null || v === false);
    if (empty) delete all[rowId];
    else all[rowId] = Object.fromEntries(Object.entries(merged).filter(([, v]) => v != null && v !== false));
    save({ carryEdits: all });
  };
  const assignedPids = useMemo(() => new Set(assignedNow.rows.map((r) => r.projectId)), [assignedNow]);

  // Projects with a table, and the time planned for each (from the plan and the extra hours).
  const groups = useMemo(() => {
    const planned = new Map();
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
    const fromPlan = new Set(planned.keys());
    shown.forEach((r) => {
      if (!planned.has(r.projectId)) planned.set(r.projectId, 0);
    });
    added.forEach((pid) => {
      if (!planned.has(pid)) planned.set(pid, 0);
    });
    assignedPids.forEach((pid) => {
      if (!planned.has(pid)) planned.set(pid, 0);
    });
    return [...planned]
      .map(([pid, minutes]) => ({
        project: projects.find((p) => p.id === pid),
        pid,
        planned: minutes,
        name: projectLabel(pid, projects),
        added: !fromPlan.has(pid) && !assignedPids.has(pid),
      }))
      .filter((g) => g.project || g.pid.startsWith(OTHER));
  }, [blocks, extras, shown, projects, added, assignedPids]);

  // While the targets are editable, each project's planned time is shared out over its rows that were not typed by hand.
  useEffect(() => {
    if (!targetsEditable) return;
    const split = splitEstimates(rows, groups);
    if (split !== rows) setRows(split);
  }, [rows, groups, targetsEditable]);

  const removeGroup = (pid, name) => {
    if (shown.some((r) => r.projectId === pid && (r.task || r.desc)) && !window.confirm(`Remove ${name} and its tasks from this day?`)) return;
    setRows((list) => list.filter((r) => r.projectId !== pid));
    setAdded((list) => list.filter((p) => p !== pid));
    if (stored.some((r) => r.projectId === pid)) save({ entries: stored.filter((r) => r.projectId !== pid) });
    toast({ title: `${name} removed`, tone: 'info' });
  };
  const saveRename = () => {
    if (!renaming) return;
    const name = renaming.name.trim();
    if (!name) {
      toast({ title: 'Type a name', tone: 'info' });
      return;
    }
    const next = `${OTHER}${name}`;
    if (next !== renaming.pid && groups.some((g) => g.pid === next)) {
      toast({ title: `${name} is already in the list`, tone: 'info' });
      return;
    }
    const rename = (list) => list.map((r) => (r.projectId === renaming.pid ? { ...r, projectId: next } : r));
    setRows(rename);
    setAdded((list) => [...list.filter((p) => p !== renaming.pid), next]);
    if (stored.some((r) => r.projectId === renaming.pid)) save({ entries: rename(stored) });
    setRenaming(null);
  };
  /** Change a table's project: plan blocks and saved rows move together (saved straight away, also when locked or sent). */
  const changeTableProject = (pid, to) => {
    setChanging(null);
    if (to === pid) return;
    const inPlan = blocks.some((b) => (b.custom ? (b.custom.projectId ?? b.projectId) : b.projectId) === pid) || extras.some((x) => x.projectId === pid || (!x.projectId && `${OTHER}${x.work}` === pid));
    if (inPlan && onChangeProject) {
      onChangeProject({ from: pid, to });
      return;
    }
    const next = to; // rows join the table of the new project when it already exists
    setRows((list) => moveEntries(list, pid, next, projects));
    setAdded((list) => [...new Set(list.map((p) => (p === pid ? next : p)))]);
    if (stored.some((r) => r.projectId === pid))
      save({ entries: moveEntries(stored, pid, next, projects), ...(record.eodAt ? { eodAt: record.eodAt } : {}) });
  };
  const addable = projects.filter((p) => p.status === 'active' && !groups.some((g) => g.pid === p.id));
  const addProject = (value) => {
    if (!value) return;
    let pid = value;
    if (value === OTHER) {
      const name = otherName.trim();
      if (!name) {
        toast({ title: 'Type what the extra work was', tone: 'info' });
        return;
      }
      pid = `${OTHER}${name}`;
    }
    setAdded((list) => [...list, pid]);
    setUnlocked(true);
    setRows((list) => [...list, blankEntry(pid)]);
    setOtherName('');
    setPick('');
  };

  const update = (id, patch) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  // Moving work to another date: the target day is saved first, then this day; the tasks behind assigned rows change their own day.
  const validRow = (r) => r.task && (r.task !== CUSTOM_TASK || r.custom?.trim());
  const moveRowsTo = (ids, to, taskIds = []) =>
    guarded(() => {
      const picked = rows.filter((r) => ids.includes(r.id));
      if (picked.some((r) => !validRow(r))) throw new Error('Pick a task for the row first.');
      moveWork({ personId, from: key, to, ids: picked.length ? picked.map((r) => r.id) : [], taskIds, fromRows: rows.filter(validRow) });
      setRows((list) => list.filter((r) => !ids.includes(r.id)));
    });
  const canMoveTask = (taskId) => canReschedule(tasks.find((t) => t.id === taskId), useStore.getState().me);
  const typeOnAssigned = (row, patch) =>
    setAsg((all) => {
      const next = { ...(all[row.id] ?? { projectId: row.projectId, task: row.task, custom: row.custom }), ...patch };
      const empty = !(next.actualMin > 0) && !(next.doneQty > 0) && !next.remarks;
      const { [row.id]: _gone, ...rest } = all; // eslint-disable-line no-unused-vars
      return empty ? rest : { ...rest, [row.id]: next };
    });
  // The estimate follows the project's standard time for the task and target (per 10 prospects, per message...) until it is typed by hand.
  const standardFor = (row, qty) => {
    const project = projects.find((p) => p.id === row.projectId);
    if (!project || !row.task || row.task === CUSTOM_TASK || row.task.startsWith(MY_PREFIX) || !(qty > 0)) return null;
    const builtIn = !row.task.startsWith('std:');
    return computeStandardMinutes(project, builtIn ? row.task : 'custom', qty, undefined, builtIn ? undefined : row.task.slice(4));
  };
  const reestimate = (row, patch) => {
    const next = { ...row, ...patch };
    if (next.estManual) return patch;
    const std = standardFor(next, next.qty);
    return std ? { ...patch, estMin: std, estAuto: true } : patch;
  };
  const fillFromPrevious = (pid, from) => {
    const source = (daily[`${personId}|${from}`]?.entries ?? []).filter((r) => r.projectId === pid);
    if (!source.length) {
      toast({ title: `Nothing saved for this project on ${formatShortDate(from)}`, tone: 'info' });
      return;
    }
    setRows((list) => [
      ...list.filter((r) => r.projectId !== pid || r.task),
      ...source.map((r) => ({
        ...r,
        id: newEntryId(),
        actualMin: undefined,
        doneQty: undefined,
        status: undefined,
        actualText: undefined,
        achieved: '',
        remarks: '',
      })),
    ]);
    toast({ title: `Copied ${source.length} task${source.length > 1 ? 's' : ''} from ${formatShortDate(from)}`, tone: 'success' });
  };
  const lock = (which) =>
    guarded(() => {
      const kept = rows.filter((r) => r.task && (r.task !== CUSTOM_TASK || r.custom?.trim()));
      if (!kept.length && !assignedNow.rows.length) throw new Error('Add at least one task before locking.');
      const at = new Date().toISOString();
      const withActuals = which === 'actuals' || !!actualsAt;
      save({
        entries: kept,
        ...(Object.keys(asg).length || record.asg ? { asg } : {}),
        ...(which === 'targets' ? { entriesAt: at, ...(!record.sodAt ? { sodAt: at } : {}) } : {}),
        ...(withActuals ? { actualsAt: at } : {}),
      });
      setRows(kept);
      setUnlocked(false);
      toast({
        title:
          which === 'actuals'
            ? 'Actuals locked 🔒 You can send your end of day now.'
            : withActuals
              ? 'Updated and locked 🔒 Send it again when ready.'
              : 'Targets locked 🔒 Fill in the actuals as you go.',
        tone: 'success',
      });
    });
  const sendEndOfDay = () =>
    guarded(() => {
      const at = new Date().toISOString();
      save({ entries: stored, entriesDoneAt: at, eodAt: at });
      toast({ title: `End of day sent at ${formatClock(at)} 🌙`, tone: 'success' });
    });
  const sendHint = record.entriesAt
    ? actualsAt
      ? unlocked
        ? 'Finish updating first'
        : record.entriesDoneAt && !canSend
          ? 'Already sent. Press Update to change something.'
          : 'Send your end of day'
      : 'Fill in the actuals and lock them first'
    : 'Lock your targets first';

  const totals = [...shown, ...assignedNow.rows].reduce((t, r) => ({ est: t.est + (r.estMin ?? 0), act: t.act + (r.actualMin ?? 0) }), { est: 0, act: 0 });
  const plannedTotal = groups.reduce((sum, g) => sum + g.planned, 0);

  return (
    <Card className="!p-0">
      <div
        id={readOnly ? undefined : 'daily-update'}
        className="flex scroll-mt-20 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3"
      >
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <ClipboardList size={17} className="text-accent-ink" />
            Daily update
          </h2>
          <p className="text-xs text-muted">
            {readOnly
              ? 'Tasks per project for the day.'
              : 'One table for every project in your plan. Add the tasks with targets, lock them, then fill in actual time and how many got done.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {record.entriesAt ? (
            <span data-testid="targets-time">
              <Badge tone="mint">
                <Lock size={11} /> Targets {formatClock(record.entriesAt)}
              </Badge>
            </span>
          ) : (
            <Badge tone="grey">Targets not locked yet</Badge>
          )}
          {record.entriesDoneAt ? (
            <span data-testid="done-time">
              <Badge tone="lavender">
                <Send size={11} /> End of day {formatClock(record.entriesDoneAt)}
              </Badge>
            </span>
          ) : (
            record.entriesAt && <Badge tone="grey">End of day not sent</Badge>
          )}
          {!readOnly && <TaskMenuSettings personId={personId} />}
          {!readOnly && targetsLocked && record.entriesDoneAt && (
            <Button
              tone="ghost"
              className="border border-line"
              data-testid="edit-actuals"
              title="Change the time taken, how many got done or the notes of a sent day. Targets stay locked."
              onClick={() => setActualsOpen((v) => !v)}
            >
              <Pencil size={13} /> {actualsOpen ? 'Done editing actuals' : 'Edit actuals'}
            </Button>
          )}
          {!readOnly && targetsLocked && (
            <Button tone="ghost" className="border border-line" onClick={() => setUnlocked(true)}>
              <Pencil size={13} /> Update
            </Button>
          )}
          {!readOnly && (
            <span title={sendHint} data-testid="send-eod-wrap">
              <Button disabled={!canSend} onClick={sendEndOfDay} data-testid="send-eod">
                <Send size={13} /> {record.entriesDoneAt ? 'Send end of day again' : 'Send end of day'}
              </Button>
            </span>
          )}
        </div>
      </div>
      {groups.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-muted">
          {readOnly ? 'Nothing for this day.' : 'Add time blocks to your plan above and a table opens here for each project.'}
        </p>
      )}
      <div className="space-y-4 p-4">
        {groups.map(({ project, pid, planned, name, added: isAdded }) => {
          // a project whose end of day was sent back opens again by itself; the other tables stay as they are
          const reopened = !readOnly && reopenedPids.has(pid);
          const tableEditable = targetsEditable || reopened;
          const tableReadOnly = actualsReadOnly && !reopened;
          const choices = taskChoices(project, taskMenu);
          const mine = shown.filter((r) => r.projectId === pid);
          const assignedMine = assignedNow.rows.filter((r) => r.projectId === pid);
          const est = [...mine, ...assignedMine].reduce((s, r) => s + (r.estMin ?? 0), 0);
          const act = [...mine, ...assignedMine].reduce((s, r) => s + (r.actualMin ?? 0), 0);
          return (
            <section
              key={pid}
              data-project-log={pid}
              data-kind="day"
              className="overflow-hidden rounded-xl border border-line"
              style={{ borderLeft: `5px solid ${project ? projectColor(projects, pid) : '#64748B'}` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-2/60 px-3 py-2">
                {renaming?.pid === pid ? (
                  <span className="flex items-center gap-1.5">
                    <input
                      aria-label="New name"
                      autoFocus
                      className="focus-ring w-52 rounded-lg border border-line bg-surface px-2 py-1 text-sm"
                      value={renaming.name}
                      onChange={(e) => setRenaming({ pid, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename();
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                    />
                    <Button tone="soft" onClick={saveRename}>
                      <Check size={13} /> Save
                    </Button>
                    <button aria-label="Cancel rename" className="focus-ring rounded-lg p-1 text-muted hover:text-ink" onClick={() => setRenaming(null)}>
                      <X size={14} />
                    </button>
                  </span>
                ) : changing === pid ? (
                  <ProjectChanger current={pid} projects={projects} label="Table project" onCancel={() => setChanging(null)} onSave={(to) => changeTableProject(pid, to)} />
                ) : (
                  <p className="flex items-center gap-1.5 font-semibold">
                    {name}
                    {!project && <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold text-muted">OTHER WORK</span>}
                    {!readOnly && !assignedPids.has(pid) && (
                      <button
                        aria-label={`Change project of ${name}`}
                        title={lockNote ? `Change project. ${lockNote}` : 'Change project'}
                        data-testid="change-table-project"
                        className="focus-ring flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent-ink hover:bg-surface-2"
                        onClick={() => setChanging(pid)}
                      >
                        <Pencil size={11} /> Change project
                      </button>
                    )}
                    {!readOnly && tableEditable && (mine.some(validRow) || assignedMine.some((r) => r.taskIds.some(canMoveTask))) && (
                      <DateMenu
                        personId={personId}
                        from={key}
                        title="Move whole table"
                        hint={`Moves this table's rows (and reschedules its assigned tasks) to another day.`}
                        testId="move-table-popover"
                        onPick={(to) => moveRowsTo(mine.filter(validRow).map((r) => r.id), to, assignedMine.flatMap((r) => r.taskIds))}
                        trigger={({ onClick }) => (
                          <button
                            aria-label={`Move ${name} to another date`}
                            title="Move this table to another date"
                            data-testid="move-table-date"
                            className="focus-ring flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent-ink hover:bg-surface-2"
                            onClick={onClick}
                          >
                            <CalendarDays size={11} /> Move table
                          </button>
                        )}
                      />
                    )}
                    {!readOnly && isAdded && !project && (
                      <button
                        aria-label={`Rename ${name}`}
                        title="Rename"
                        className="focus-ring rounded-lg p-1 text-muted hover:bg-surface hover:text-accent-ink"
                        onClick={() => setRenaming({ pid, name })}
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    {!readOnly && isAdded && (
                      <button
                        aria-label={`Remove ${name}`}
                        title="Remove"
                        className="focus-ring rounded-lg p-1 text-muted hover:bg-surface hover:text-coral-ink"
                        onClick={() => removeGroup(pid, name)}
                      >
                        <Trash size={12} />
                      </button>
                    )}
                  </p>
                )}
                <span className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const review = record.eodReviews?.[pid];
                    const st = review && eodStatusText(review, firstName(project?.pmId ?? review.reviewerId), firstName(review.by ?? review.reviewerId));
                    return st ? (
                      <span data-testid="eod-status" data-status={review.status} title={review.status === 'changes' ? 'Edit the rows and send your end of day again.' : undefined}>
                        <Badge tone={st.tone}>{st.text}</Badge>
                      </span>
                    ) : null;
                  })()}
                  {planned > 0 && (
                    <span className="text-xs text-muted">
                      Planned <b className="text-ink">{formatMinutes(planned)}</b>
                    </span>
                  )}
                  {tableEditable && (
                    <FillFromPicker
                      personId={personId}
                      date={date}
                      kind="rows"
                      projectId={pid}
                      testId={`fill-rows-${pid}`}
                      className="focus-ring flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-accent-ink hover:bg-surface-2"
                      onPick={(from) => fillFromPrevious(pid, from)}
                    />
                  )}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-sm" aria-label={`${name} day tasks`}>
                  <thead>
                    <tr className="bg-surface-2/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                      <th className="w-48 px-3 py-2">Task</th>
                      <th className="w-36 px-2 py-2">Type</th>
                      <th className="w-40 px-2 py-2">
                        Target <span className="font-normal normal-case">(today)</span>
                      </th>
                      <th className="w-40 px-2 py-2">
                        Actual <span className="font-normal normal-case">(today)</span>
                      </th>
                      <th className="w-28 px-2 py-2">Estimated</th>
                      <th className="w-28 px-2 py-2">Time taken</th>
                      <th className="min-w-[11rem] px-2 py-2">
                        Notes <span className="font-normal normal-case">(optional)</span>
                      </th>
                      {tableEditable && <th className="w-28" />}
                    </tr>
                  </thead>
                  <tbody>
                    {mine.length === 0 && assignedMine.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-3 text-xs text-muted">
                          No tasks yet.
                        </td>
                      </tr>
                    )}
                    {mine.map((r) => {
                      const kind = r.kind ?? 'number';
                      return (
                        <tr key={r.id} data-entry={r.id} className="border-t border-line align-middle">
                          <td className="px-3 py-2">
                            {tableEditable ? (
                              <>
                                <select
                                  aria-label="Task"
                                  className={FIELD}
                                  value={r.task}
                                  onChange={(e) => update(r.id, reestimate(r, { task: e.target.value }))}
                                >
                                  <option value="">Pick a task</option>
                                  {choices.map((t) => (
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
                                    className={cx(FIELD, 'mt-1')}
                                    placeholder="Task name"
                                    value={r.custom ?? ''}
                                    onChange={(e) => update(r.id, { custom: e.target.value })}
                                  />
                                )}
                              </>
                            ) : (
                              <span className="font-medium">
                                {entryName(r, project)}
                                {r.desc && <span className="block text-xs font-normal text-muted">{r.desc}</span>}
                              </span>
                            )}
                            {assignedNow.covers.has(r.id) && (
                              <span className="mt-0.5 block text-[11px] font-normal text-muted" data-testid="covers-assigned">
                                Covers the task {assignerText(assignedNow.covers.get(r.id))}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <EntryKindSelect value={kind} disabled={!tableEditable} onChange={(k) => update(r.id, { kind: k })} />
                          </td>
                          <td className="px-2 py-2">
                            {kind === 'number' ? (
                              tableEditable ? (
                                <input
                                  aria-label="Target"
                                  type="number"
                                  min={0}
                                  className={cx(FIELD, 'tabular-nums')}
                                  placeholder="30"
                                  value={r.qty ?? ''}
                                  onChange={(e) => update(r.id, reestimate(r, { qty: parseQty(e.target.value) }))}
                                />
                              ) : (
                                <span className="tabular-nums">{r.qty ?? '·'}</span>
                              )
                            ) : tableEditable ? (
                              <input
                                aria-label="Target"
                                className={FIELD}
                                placeholder={kind === 'milestone' ? 'e.g. Prepare agenda and notes' : 'e.g. Refresh lookalike model'}
                                value={r.targetText ?? ''}
                                onChange={(e) => update(r.id, { targetText: e.target.value })}
                              />
                            ) : (
                              <span>{r.targetText || '·'}</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {kind === 'number' ? (
                              tableReadOnly ? (
                                <span className="tabular-nums">{r.doneQty ?? '·'}</span>
                              ) : (
                                <input
                                  aria-label="Actual"
                                  type="number"
                                  min={0}
                                  className={cx(FIELD, 'tabular-nums')}
                                  placeholder="0"
                                  value={r.doneQty ?? ''}
                                  onChange={(e) => update(r.id, { doneQty: parseQty(e.target.value) })}
                                />
                              )
                            ) : kind === 'milestone' ? (
                              <select
                                aria-label="Actual"
                                disabled={tableReadOnly}
                                className={cx(FIELD, 'font-medium', STATUS_CLASS[r.status ?? 'Not started'])}
                                value={r.status ?? 'Not started'}
                                onChange={(e) => update(r.id, { status: e.target.value })}
                              >
                                {ROW_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            ) : tableReadOnly ? (
                              <span>{r.actualText || '·'}</span>
                            ) : (
                              <input
                                aria-label="Actual"
                                className={FIELD}
                                placeholder="What got done"
                                value={r.actualText ?? ''}
                                onChange={(e) => update(r.id, { actualText: e.target.value })}
                              />
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {tableEditable ? (
                              <DurationInput
                                label="Estimated time"
                                placeholder="1h"
                                value={r.estMin || undefined}
                                onChange={(m) => update(r.id, { estMin: m ?? 0, estManual: m != null, estAuto: false })}
                              />
                            ) : (
                              <span className="tabular-nums">{formatMinutes(r.estMin)}</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {tableReadOnly ? (
                              <span className="tabular-nums">{r.actualMin != null ? formatMinutes(r.actualMin) : '·'}</span>
                            ) : (
                              <DurationInput
                                label="Actual time"
                                placeholder="..."
                                value={r.actualMin}
                                onChange={(m) => update(r.id, { actualMin: m ?? undefined })}
                              />
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {tableReadOnly ? (
                              <span>{r.remarks || '·'}</span>
                            ) : (
                              <input
                                aria-label="Notes"
                                className={FIELD}
                                placeholder="Add note..."
                                value={r.remarks}
                                onChange={(e) => update(r.id, { remarks: e.target.value })}
                              />
                            )}
                          </td>
                          {tableEditable && (
                            <td className="whitespace-nowrap py-2">
                              {!readOnly && (
                                <DateMenu
                                  personId={personId}
                                  from={key}
                                  title="Move to another date"
                                  hint="Moves this row. Its target stays; the results are cleared unless the day has passed."
                                  testId="move-row-popover"
                                  onPick={(to) => moveRowsTo([r.id], to)}
                                  trigger={({ onClick }) => (
                                    <button aria-label="Change date" title="Move to another date" data-testid="change-row-date" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-accent-ink" onClick={onClick}>
                                      <CalendarDays size={14} />
                                    </button>
                                  )}
                                />
                              )}
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
                    {assignedMine.map((r) => (
                      <AssignedRow
                        key={r.id}
                        r={r} project={project} showRemoveCell={tableEditable} locked={tableReadOnly} onType={(patch) => typeOnAssigned(r, patch)}
                        canChange={tableEditable}
                        personId={personId}
                        date={date}
                        canMove={!readOnly && r.taskIds.some(canMoveTask)}
                        onReschedule={(to) => guarded(() => moveWork({ personId, from: key, to, ids: [], taskIds: r.taskIds }))}
                        onChange={(patch) => changeCarried(r.id, patch)}
                        onRemove={() => {
                          changeCarried(r.id, { hidden: true });
                          toast({ title: 'Removed from today. The task stays assigned.', tone: 'info' });
                        }}
                      />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-surface-2/40 text-xs font-semibold">
                      <td className="px-2 py-2">
                        {tableEditable && (
                          <button
                            className="focus-ring flex items-center gap-1 rounded-full border border-line px-3 py-1 text-accent-ink hover:bg-surface-2"
                            onClick={() => setRows((list) => [...list, blankEntry(pid)])}
                          >
                            <Plus size={12} /> Add task
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right text-muted" colSpan={3}>
                        Total
                      </td>
                      <td className="px-2 py-2 tabular-nums" data-testid="est-total">
                        {formatMinutes(est)}
                        {planned > 0 && est > planned && <span className="ml-1 text-coral-ink">over plan</span>}
                      </td>
                      <td className="px-2 py-2 tabular-nums" data-testid="act-total">
                        {formatMinutes(act)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          );
        })}
      </div>
      {assignedNow.hidden.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 text-xs" data-testid="carry-removed">
          <span className="font-semibold text-muted">Removed from today ({assignedNow.hidden.length})</span>
          {assignedNow.hidden.map((h) => (
            <span key={h.id} className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2/60 py-0.5 pl-2.5 pr-1">
              {h.titles.filter(Boolean)[0] ?? h.label}
              {!readOnly && targetsEditable && (
                <button
                  aria-label={`Restore ${h.titles.filter(Boolean)[0] ?? h.label}`}
                  className="focus-ring rounded-full px-2 py-0.5 font-semibold text-accent-ink hover:bg-surface"
                  onClick={() => changeCarried(h.id, { hidden: false })}
                >
                  Restore
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3" aria-label="Add a project">
          <span className="text-sm font-semibold">Worked on something else?</span>
          <select
            aria-label="Add project"
            className="focus-ring rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
            value={pick}
            onChange={(e) => {
              setPick(e.target.value);
              if (e.target.value !== OTHER) addProject(e.target.value);
            }}
          >
            <option value="">Add a project...</option>
            {addable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={OTHER}>Other work (not a project)...</option>
          </select>
          {pick === OTHER && (
            <>
              <input
                aria-label="Other work name"
                autoFocus
                className="focus-ring w-56 rounded-lg border border-line bg-surface px-2 py-1 text-sm"
                placeholder="e.g. Hiring, internal training"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addProject(OTHER)}
              />
              <Button tone="soft" onClick={() => addProject(OTHER)}>
                <Plus size={13} /> Add
              </Button>
            </>
          )}
        </div>
      )}
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
          <p className="text-sm">
            Day total: planned <b>{formatMinutes(plannedTotal)}</b> · estimated <b data-testid="day-est">{formatMinutes(totals.est)}</b> · actual{' '}
            <b data-testid="day-act">{formatMinutes(totals.act)}</b>
          </p>
          {!readOnly && (
            <span className="ml-auto flex gap-2">
              {targetsLocked ? (
                actualsLocked ? (
                  <span className="text-xs text-muted">
                    {record.entriesDoneAt && !canSend
                      ? 'Sent. Press Update at the top to change anything.'
                      : 'Targets and actuals locked. Send it from the top.'}
                  </span>
                ) : (
                  <Button onClick={() => lock('actuals')}>
                    <Save size={13} /> Lock actuals
                  </Button>
                )
              ) : (
                <Button onClick={() => lock('targets')}>
                  <Lock size={13} /> {record.entriesAt ? 'Update and lock' : 'Lock targets'}
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
