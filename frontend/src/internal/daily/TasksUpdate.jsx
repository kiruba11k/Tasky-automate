import { useEffect, useMemo, useState } from 'react';
import { Sunrise, Moon, Lock, Pencil } from 'lucide-react';
import {
  oe as cx,
  Se as useStore,
  rt as Card,
  Te as Button,
  qe as Badge,
  Ge as textareaClass,
  lt as guarded,
  Ye as toast,
  zw as computeDayHours,
  We as formatMinutes,
} from '@/internal/min';
import { leaveLabel, leaveOn } from '../lib/leave.js';
import { emptyDaily } from '../lib/domain.js';
import { dayCarryEdits, dayRowsWithAssigned } from '../lib/assigned.js';
import { assignedMinutesByProject, autoPlanBlocks } from '../lib/autoPlan.js';
import { changeProject } from '../lib/changeProject.js';
import { PROJECT_CHANGED } from './ProjectChanger';
import { isWeekday, lunchFor, todayKey } from '../lib/dates.js';
import { DatePicker } from './DatePicker';
import { MarkLeave } from './MarkLeave';
import { HoursStats } from './HoursStats';
import { UpdateCard } from './UpdateCard';
import { TaskSummary } from './TaskSummary';
import { TimeTable } from './TimeTable';
import { NoteLine } from './NoteLine';
import { CustomRowsEditor } from './CustomRowsEditor';
import { ProjectNumbersEditor } from './ProjectNumbersEditor';
import { EntriesLog } from './EntriesLog';
import { EntriesProgress } from './EntriesProgress';
import { PlanBuilder } from './PlanBuilder';
import { WeeklyUpdate } from './WeeklyUpdate';
import { WeeklyHours } from './WeeklyHours';
import { latestWorkday, formatShortDate } from './dateHelpers';
import { nonEmptyExtras } from './planHelpers';
import { blocksKey } from './planBlocks';

/** Member "Tasks update" page (route /daily). */
export function TasksUpdate() {
  const { me, tasks, daily, projects, saveDaily, profiles } = useStore();
  const [date, setDate] = useState(latestWorkday);
  const leave = leaveOn(profiles, me, date);
  const key = `${me}|${date}`;
  const record = daily[key] ?? emptyDaily();
  const [plan, setPlan] = useState(record.plan);
  const [extra, setExtra] = useState(record.extra ?? []);
  const [sodNote, setSodNote] = useState(record.sodNote);
  const [sodTargets, setSodTargets] = useState(record.sodTargets);
  const [sodCustom, setSodCustom] = useState(record.sodCustom ?? []);
  const [editingSod, setEditingSod] = useState(false);

  useEffect(() => {
    const r = useStore.getState().daily[`${me}|${date}`] ?? emptyDaily();
    setEditingSod(false);
    setPlan(r.plan);
    setExtra(r.extra ?? []);
    setSodCustom(r.sodCustom ?? []);
    setSodNote(r.sodNote);
    setSodTargets(r.sodTargets);
  }, [me, date]);

  /** Re-read plan and extra hours from the store after a save. */
  const syncPlanFromStore = () => {
    const r = useStore.getState().daily[`${me}|${date}`];
    if (r) {
      setPlan(r.plan);
      setExtra(r.extra ?? []);
    }
  };

  // The plan follows the assigned work: top it up with the minutes assigned per project that it does not hold yet. Only on the
  // owner's own editable day, and never over unsaved edits in the builder.
  const planLocked = !!record.planAt; // 'Save plan and times' locks the plan until Update is pressed
  const editable = date >= todayKey(0) && isWeekday(date) && !record.eodAt && !(leave && leave.kind !== 'half');
  useEffect(() => {
    if (!editable || planLocked) return; // a locked plan is never rewritten behind the person's back; the top-up runs again after Update
    const st = useStore.getState();
    const r = st.daily[`${me}|${date}`] ?? emptyDaily();
    const sameExtra = (a, b) => (a ?? []).map((x) => `${x.id}|${x.minutes}`).join() === (b ?? []).map((x) => `${x.id}|${x.minutes}`).join();
    const byStart = (l) => blocksKey([...l].sort((a, b) => a.start.localeCompare(b.start)));
    if (byStart(plan) !== byStart(r.plan ?? []) || !sameExtra(extra, r.extra)) return; // unsaved edits in the builder
    const assigned = assignedMinutesByProject(st.tasks, me, date, { projects: st.projects, carryEdits: dayCarryEdits(st.daily, me, date) });
    const names = Object.fromEntries(st.projects.map((p) => [p.id, p.name]));
    const res = autoPlanBlocks({
      plan: r.plan ?? [],
      extra: r.extra ?? [],
      autoPlanned: r.autoPlanned ?? {},
      assigned,
      lunch: lunchFor(st.daily, me, date, st.profiles),
      names,
    });
    if (!res) return;
    try {
      st.saveDaily(me, date, { plan: res.plan, extra: res.extra, autoPlanned: res.autoPlanned });
    } catch {
      return;
    }
    syncPlanFromStore();
    const total = Object.values(res.added).reduce((a, b) => a + b, 0);
    const first = Object.keys(res.added).length === 1 ? ` ${names[Object.keys(res.added)[0]] ?? ''}` : '';
    toast({ title: `Added ${formatMinutes(total)}${first} from tasks assigned to you`, tone: 'success' });
  }, [tasks, me, date, projects, profiles, editable, planLocked, record.plan, record.extra, record.autoPlanned, record.carryEdits, plan, extra]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Change the project of one block / extra row (or, with no id, of every block of `from`), also when the day is locked or sent.
   * Saves at once: the plan, the Daily update rows that follow it, the autoPlanned bookkeeping and, once sent, the eod snapshot.
   */
  const changeBlockProject = ({ lane, id, from, to }) =>
    guarded(() => {
      const st = useStore.getState();
      const r = st.daily[key] ?? emptyDaily();
      const res = changeProject({
        plan,
        extra: nonEmptyExtras(extra),
        entries: r.entries ?? [],
        autoPlanned: r.autoPlanned ?? {},
        assigned: assignedMinutesByProject(st.tasks, me, date, { projects: st.projects, carryEdits: dayCarryEdits(st.daily, me, date) }),
        projects: st.projects,
        from,
        to,
        ...(id ? (lane === 'extra' ? { extraId: id } : { blockId: id }) : {}),
      });
      if (!res) return;
      saveDaily(me, date, {
        plan: res.plan,
        extra: res.extra,
        entries: res.entries,
        autoPlanned: res.autoPlanned,
        ...(r.eodAt ? { eodAt: r.eodAt } : {}), // same time again: rebuilds the saved end-of-day snapshot, the day stays sent
      });
      syncPlanFromStore();
      if (res.movedEntries) window.dispatchEvent(new CustomEvent(PROJECT_CHANGED, { detail: { from, to } }));
      toast({ title: r.eodAt ? 'Project changed. Your sent update was refreshed.' : 'Project changed and saved', tone: 'success' });
    });
  const lockNote = record.eodAt
    ? 'Works after you sent the day; the sent update is refreshed.'
    : record.sodAt || record.entriesAt
      ? 'Works even though the day is locked.'
      : '';

  const dayTasks = useMemo(() => tasks.filter((t) => t.assigneeId === me && t.date === date), [tasks, me, date]);
  const eodSent = !!record.eodAt;
  // the day's rows include the assigned tasks, so the estimates and times agree with the Daily update tables
  const dayRows = useMemo(() => dayRowsWithAssigned(tasks, daily, me, date, { projects, carry: false }), [tasks, daily, me, date, projects]);
  const hours = computeDayHours({ plan, extra, eodAt: record.eodAt, entries: dayRows });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[16rem] flex-1">
          <h1 className="text-2xl font-bold">Tasks update</h1>
          <p className="text-sm text-muted">
            Plan your day and record the real time it took. Targets and actuals fill in from your tasks. Working hours 10am to 7pm, lunch 1pm to 2pm.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker date={date} onChange={setDate} personId={me} />
          <MarkLeave personId={me} date={date} />
        </div>
      </div>
      {leave && (
        <div
          className="flex items-center gap-2 rounded-2xl border border-lavender-strong/40 bg-lavender/40 px-4 py-3 text-sm"
          data-testid="leave-banner"
        >
          🌴 <b>{leaveLabel(leave)}</b> on {formatShortDate(date)}
          {leave.note ? ` · ${leave.note}` : ''}. Managers see this instead of missing updates.
        </div>
      )}
      <section id="plan-your-day" aria-label="Plan your day" className="scroll-mt-20">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">Plan your day</h2>
            <HoursStats t={hours} sent={eodSent} />
          </div>
          {(plan.some((b) => b.auto) || extra.some((x) => x.auto)) && (
            <p className="mb-2 text-xs text-muted" data-testid="auto-plan-note">
              Blocks marked Auto come from your assigned tasks. Change or delete them freely, they will not come back.
            </p>
          )}
          <div className={cx('relative', planLocked && 'pointer-events-none select-none opacity-70')} aria-disabled={planLocked}>
            <PlanBuilder
              plan={plan}
              setPlan={setPlan}
              extra={extra}
              setExtra={setExtra}
              personId={me}
              date={date}
              onChangeProject={changeBlockProject}
              lockNote={planLocked && !lockNote ? 'Works even though the plan is locked.' : lockNote}
            />
          </div>
          <div className="mt-4 flex justify-end">
            {planLocked ? (
              <span className="flex items-center gap-2" data-testid="plan-locked">
                <Badge tone="mint">
                  <Lock size={11} /> Locked {new Date(record.planAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Badge>
                <Button tone="ghost" className="border border-line" onClick={() => guarded(() => saveDaily(me, date, { planAt: undefined }))}>
                  <Pencil size={13} /> Update
                </Button>
              </span>
            ) : (
              <Button
                onClick={() =>
                  guarded(() => {
                    saveDaily(me, date, { plan, extra: nonEmptyExtras(extra), planAt: new Date().toISOString() });
                    syncPlanFromStore();
                    toast({ title: 'Plan and times saved and locked 🔒', tone: 'success' });
                  })
                }
              >
                <Lock size={13} /> Save plan and times
              </Button>
            )}
          </div>
        </Card>
      </section>
      <EntriesLog personId={me} date={date} plan={plan} extra={extra} onChangeProject={changeBlockProject} lockNote={lockNote} />
      <div className="border-t-2 border-dashed border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Auto-filled updates</h2>
          <DatePicker date={date} onChange={setDate} personId={me} />
        </div>
        <p className="text-sm text-muted">
          Built from the daily and weekly tasks above and your assigned tasks. Targets against what got achieved, updated as you go.
        </p>
      </div>
      <div className="grid grid-cols-1 items-start gap-6">
        <UpdateCard
          id="todays-targets"
          icon={<Sunrise size={18} className="text-butter-ink" />}
          tone="bg-butter/50"
          title="Today's targets"
          subtitle="Built from the tasks your project managers gave you"
          lockedAt={record.sodAt}
          editing={editingSod}
          view={
            <>
              <EntriesProgress personId={me} date={date} kind="day" />
              <TaskSummary tasks={dayTasks} mode="assigned" />
              <NoteLine label="Note" text={record.sodNote} />
            </>
          }
        >
          <EntriesProgress personId={me} date={date} kind="day" />
          <TaskSummary tasks={dayTasks} mode="assigned" />
          <CustomRowsEditor rows={sodCustom} onChange={setSodCustom} title="Custom targets" hint="anything else you're aiming for today" />
          <details className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Project numbers to hit <span className="font-normal text-muted">(optional: responses, calls, meetings)</span>
            </summary>
            <div className="mt-3">
              <ProjectNumbersEditor value={sodTargets} onChange={setSodTargets} />
            </div>
          </details>
          <label className="block text-sm font-semibold">
            Note <span className="font-normal text-muted">(optional)</span>
            <textarea
              rows={2}
              className={cx(textareaClass, 'mt-1')}
              value={sodNote}
              onChange={(e) => setSodNote(e.target.value)}
              placeholder="e.g. QBR deck first, then personalised L1s"
            />
          </label>
          <Button
            onClick={() =>
              guarded(() => {
                saveDaily(me, date, {
                  plan,
                  sodNote,
                  sodTargets,
                  sodCustom: sodCustom.filter((r) => r.label.trim()),
                  sodAt: new Date().toISOString(),
                });
                syncPlanFromStore();
                setEditingSod(false);
                toast({ title: "Today's targets locked 🎯", tone: 'success' });
              })
            }
          >
            <Lock size={13} /> Save & lock
          </Button>
        </UpdateCard>
        <section id="todays-hours" aria-label="Today's hours" className="overflow-hidden rounded-card bg-surface shadow-soft">
          <div className="flex items-center gap-3 bg-lavender/50 px-5 py-3">
            <Moon size={18} className="text-accent-ink" />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">Today&apos;s hours</h2>
              <p className="text-xs text-muted">Filled in from your day plan: blocks, actual time and extra hours</p>
            </div>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="rounded-xl bg-surface-2 px-3 py-2">
              <HoursStats t={hours} sent={eodSent} />
            </div>
            {plan.length || extra.length ? (
              <TimeTable plan={plan} extra={nonEmptyExtras(extra)} entries={dayRows} sent={eodSent} />
            ) : (
              <p className="text-sm text-muted">No plan for this day yet. Add blocks in Plan your day.</p>
            )}
          </div>
        </section>
      </div>
      <WeeklyUpdate personId={me} date={date} />
      <WeeklyHours personId={me} date={date} />
    </div>
  );
}

export default TasksUpdate;
