import { useEffect, useMemo, useState } from 'react';
import { Sunrise, Moon, Plus, Clock3, Star, Trash, Lock, WandSparkles } from 'lucide-react';
import {
  oe as cx,
  Se as useStore,
  rt as Card,
  Te as Button,
  Ge as textareaClass,
  lt as guarded,
  Ye as toast,
  be as firstName,
  We as formatMinutes,
  pu as projectColor,
  ar as emptyDaily,
  zw as computeDayHours,
  $R as DayTimeline,
  NR as planFromProjectHours,
  ri as LUNCH,
} from '@/internal/min';
import { DatePicker } from './DatePicker';
import { HoursStats } from './HoursStats';
import { DurationInput } from './DurationInput';
import { UpdateCard } from './UpdateCard';
import { TaskSummary } from './TaskSummary';
import { TargetsTable } from './TargetsTable';
import { TimeTable } from './TimeTable';
import { NoteLine } from './NoteLine';
import { PendingHint } from './PendingHint';
import { CustomRowsEditor } from './CustomRowsEditor';
import { ProjectNumbersEditor } from './ProjectNumbersEditor';
import { WeekCards } from './WeekCards';
import { buildDayRows } from './progressRows';
import { latestWorkday } from './dateHelpers';
import {
  TIME_SLOTS,
  LUNCH_BLOCK,
  FIELD_CLASS,
  nextIdSuffix,
  blockMinutes,
  spanMinutes,
  nonEmptyExtras,
  isSubmittedWithTime,
} from './planHelpers';

/** Member "Tasks update" page (route /daily). */
export function TasksUpdate() {
  const { me, projects, tasks, daily, saveDaily } = useStore();
  const [date, setDate] = useState(latestWorkday);
  const key = `${me}|${date}`;
  const record = daily[key] ?? emptyDaily();
  const [plan, setPlan] = useState(record.plan);
  const [extra, setExtra] = useState(record.extra ?? []);
  const [sodNote, setSodNote] = useState(record.sodNote);
  const [sodTargets, setSodTargets] = useState(record.sodTargets);
  const [eodNote, setEodNote] = useState(record.eodNote);
  const [eodActuals, setEodActuals] = useState(record.eodActuals);
  const [sodCustom, setSodCustom] = useState(record.sodCustom ?? []);
  const [eodCustom, setEodCustom] = useState(record.eodCustom ?? []);
  const [editingSod, setEditingSod] = useState(false);
  const [editingEod, setEditingEod] = useState(false);

  useEffect(() => {
    const r = useStore.getState().daily[`${me}|${date}`] ?? emptyDaily();
    setEditingSod(false);
    setEditingEod(false);
    setPlan(r.plan);
    setExtra(r.extra ?? []);
    setSodCustom(r.sodCustom ?? []);
    setEodCustom(r.eodCustom ?? []);
    setSodNote(r.sodNote);
    setSodTargets(r.sodTargets);
    setEodNote(r.eodNote);
    setEodActuals(r.eodActuals);
  }, [me, date]);

  /** Re-read plan and extra hours from the store after a save. */
  const syncPlanFromStore = () => {
    const r = useStore.getState().daily[`${me}|${date}`];
    if (r) {
      setPlan(r.plan);
      setExtra(r.extra ?? []);
    }
  };

  const myProjects = projects.filter(
    (p) => p.status === 'active' && (p.pmId === me || p.teamIds.includes(me) || p.admins?.includes(me)),
  );
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.assigneeId === me && t.date === date),
    [tasks, me, date],
  );
  const submittedTasks = useMemo(() => dayTasks.filter(isSubmittedWithTime), [dayTasks]);
  const eodSent = !!record.eodAt;
  const hours = computeDayHours({ plan, extra, eodAt: record.eodAt });
  const viewRows = useMemo(
    () => buildDayRows(tasks, projects, me, date, daily[key]),
    [tasks, projects, me, date, daily, key],
  );
  const editRows = useMemo(
    () => buildDayRows(tasks, projects, me, date, { ...record, plan }, ['task', 'block']),
    [tasks, projects, me, date, record, plan],
  );

  const updateBlock = (id, patch) => setPlan((blocks) => blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const updateCustom = (id, patch) =>
    setPlan((blocks) =>
      blocks.map((b) => (b.id === id && b.custom ? { ...b, custom: { ...b.custom, ...patch } } : b)),
    );
  const updateExtra = (id, patch) =>
    setExtra((items) =>
      items.map((x) => {
        if (x.id !== id) return x;
        const next = { ...x, ...patch };
        const span = spanMinutes(next.start, next.end);
        return span != null ? { ...next, minutes: span } : next;
      }),
    );

  const addBlock = () => {
    let start = [...plan].sort((a, b) => a.end.localeCompare(b.end)).at(-1)?.end ?? '10:00';
    if (start >= LUNCH.start && start < LUNCH.end) start = LUNCH.end;
    const endIndex = Math.min(
      TIME_SLOTS.length - 1,
      start < LUNCH.start ? TIME_SLOTS.indexOf(LUNCH.start) : TIME_SLOTS.indexOf(start) + 4,
    );
    if (start >= '19:00') {
      return toast({ title: 'Your day is already planned up to 7pm', tone: 'info' });
    }
    setPlan((blocks) => [
      ...blocks,
      {
        id: `nb${Date.now().toString(36)}${nextIdSuffix()}`,
        start,
        end: TIME_SLOTS[endIndex],
        projectId: myProjects[0]?.id ?? '',
        taskIds: [],
      },
    ]);
  };

  const addExtra = () =>
    setExtra((items) => [
      ...items,
      {
        id: `nx${Date.now().toString(36)}${nextIdSuffix()}`,
        minutes: 0,
        work: '',
        projectId: myProjects[0]?.id,
      },
    ]);

  const scrollToPlan = () =>
    document.getElementById('plan-your-day')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[16rem] flex-1">
          <h1 className="text-2xl font-bold">Tasks update</h1>
          <p className="text-sm text-muted">
            Plan your day and record the real time it took. Targets and actuals fill in from your tasks. Working hours
            10am to 7pm, lunch 1pm to 2pm.
          </p>
        </div>
        <DatePicker date={date} onChange={setDate} />
      </div>
      <section id="plan-your-day" aria-label="Plan your day" className="scroll-mt-20">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">Plan your day</h2>
            <HoursStats t={hours} sent={eodSent} />
          </div>
          <DayTimeline blocks={plan} loggedMinutes={submittedTasks.reduce((sum, t) => sum + (t.minutes ?? 0), 0)} />
          <div className="mt-5 space-y-2">
            {plan.length === 0 && (
              <p className="text-sm text-muted">
                {'Split your day into time blocks. Pick a project for each, or "★ Custom / priority" for anything urgent.'}
              </p>
            )}
            {plan.length > 0 && (
              <div
                className="hidden items-center gap-2 pl-4 pr-3 text-[11px] font-semibold uppercase tracking-wide text-muted sm:flex"
                aria-hidden
              >
                <span className="w-[5.5rem]">Start</span>
                <span className="w-4" />
                <span className="w-[5.5rem]">End</span>
                <span className="min-w-[12rem] flex-1">What</span>
                <span className="w-14 text-right">Planned</span>
                <span className="w-24 text-right">Actual</span>
                <span className="w-8" />
              </div>
            )}
            {[...plan, LUNCH_BLOCK]
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((block) => {
                if (block.id === 'lunch') {
                  return (
                    <div
                      key="lunch"
                      className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-surface-2 py-2 pl-4 pr-3 text-sm text-muted"
                    >
                      <span className="w-[12.5rem] font-semibold tabular-nums">13:00 to 14:00</span>
                      <span>🍽 Lunch break, every day</span>
                    </div>
                  );
                }
                const custom = block.custom;
                const color = custom ? (custom.priority ? '#DC2626' : '#64748B') : projectColor(projects, block.projectId);
                const planned = blockMinutes(block);
                return (
                  <div
                    key={block.id}
                    data-block={block.id}
                    className={cx(
                      'rounded-xl border py-2 pl-2.5 pr-3',
                      custom != null && custom.priority ? 'border-coral-strong/40 bg-coral/20' : 'border-line',
                    )}
                    style={{ borderLeft: `6px solid ${color}` }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Start"
                        className={cx(FIELD_CLASS, 'w-[5.5rem]')}
                        value={block.start}
                        onChange={(e) => updateBlock(block.id, { start: e.target.value })}
                      >
                        {TIME_SLOTS.slice(0, -1).map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <span className="w-4 text-center text-muted">→</span>
                      <select
                        aria-label="End"
                        className={cx(FIELD_CLASS, 'w-[5.5rem]')}
                        value={block.end}
                        onChange={(e) => updateBlock(block.id, { end: e.target.value })}
                      >
                        {TIME_SLOTS.slice(1).map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        aria-label="What"
                        className={cx(FIELD_CLASS, 'min-w-[12rem] flex-1')}
                        value={custom ? '__custom' : block.projectId}
                        onChange={(e) =>
                          e.target.value === '__custom'
                            ? updateBlock(block.id, {
                                projectId: '',
                                taskIds: [],
                                custom: { title: '', priority: true, targetQty: 0, unit: '' },
                              })
                            : updateBlock(block.id, { projectId: e.target.value, taskIds: [], custom: undefined })
                        }
                      >
                        <optgroup label="Projects">
                          {myProjects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Something else">
                          <option value="__custom">★ Custom / priority…</option>
                        </optgroup>
                      </select>
                      <span className="w-14 text-right text-sm tabular-nums text-muted" title="Planned time">
                        {formatMinutes(planned)}
                      </span>
                      <DurationInput
                        label="Actual time"
                        className="w-24"
                        placeholder={`e.g. ${formatMinutes(planned)}`}
                        value={block.actualMinutes}
                        onChange={(m) => updateBlock(block.id, { actualMinutes: m })}
                      />
                      <button
                        aria-label="Remove block"
                        className="focus-ring w-8 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink"
                        onClick={() => setPlan((blocks) => blocks.filter((b) => b.id !== block.id))}
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                    {custom && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          aria-label="Custom block title"
                          className={cx(FIELD_CLASS, 'min-w-[200px] flex-1')}
                          placeholder="What came up? e.g. Urgent client deck revision"
                          value={custom.title}
                          onChange={(e) => updateCustom(block.id, { title: e.target.value })}
                        />
                        <input
                          aria-label="Target quantity"
                          type="number"
                          min={0}
                          className={cx(FIELD_CLASS, 'w-20 text-right')}
                          value={custom.targetQty || ''}
                          placeholder="Target"
                          onChange={(e) => updateCustom(block.id, { targetQty: Math.max(0, +e.target.value || 0) })}
                        />
                        <input
                          aria-label="Target unit"
                          className={cx(FIELD_CLASS, 'w-28')}
                          placeholder="unit"
                          value={custom.unit}
                          onChange={(e) => updateCustom(block.id, { unit: e.target.value })}
                        />
                        <button
                          aria-pressed={custom.priority}
                          onClick={() => updateCustom(block.id, { priority: !custom.priority })}
                          className={cx(
                            'focus-ring flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold',
                            custom.priority ? 'border-coral-strong bg-coral text-coral-ink' : 'border-line text-muted',
                          )}
                        >
                          <Star size={12} fill={custom.priority ? 'currentColor' : 'none'} /> Priority
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button tone="soft" onClick={addBlock}>
              <Plus size={14} /> Add time block
            </Button>
            <Button
              tone="ghost"
              className="border border-line"
              onClick={() => setPlan(planFromProjectHours(projects, me))}
            >
              <WandSparkles size={14} /> Fill from my project hours
            </Button>
          </div>
          <div className="mt-6 border-t border-line pt-4" aria-label="Extra hours" role="group">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-bold">Extra hours</p>
              <p className="text-xs text-muted">
                Worked outside your plan? Add the time (start and end, or just how long) and what it was for.
              </p>
            </div>
            {extra.length > 0 && (
              <div className="mt-3 space-y-2">
                <div
                  className="hidden items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted sm:flex"
                  aria-hidden
                >
                  <span className="w-[7.75rem]">From</span>
                  <span className="w-[7.75rem]">To</span>
                  <span className="w-20 text-right">Time</span>
                  <span className="min-w-[12rem] flex-1">What you worked on</span>
                  <span className="w-44">Project</span>
                  <span className="w-8" />
                </div>
                {extra.map((x) => {
                  const hasSpan = spanMinutes(x.start, x.end) != null;
                  return (
                    <div
                      key={x.id}
                      data-extra={x.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2/60 p-1"
                    >
                      <input
                        aria-label="Extra start"
                        type="time"
                        step={300}
                        className={cx(FIELD_CLASS, 'w-[7.75rem]')}
                        value={x.start ?? ''}
                        onChange={(e) => updateExtra(x.id, { start: e.target.value || undefined })}
                      />
                      <input
                        aria-label="Extra end"
                        type="time"
                        step={300}
                        className={cx(FIELD_CLASS, 'w-[7.75rem]')}
                        value={x.end ?? ''}
                        onChange={(e) => updateExtra(x.id, { end: e.target.value || undefined })}
                      />
                      <DurationInput
                        label="Extra duration"
                        className="w-20"
                        placeholder="45m"
                        disabled={hasSpan}
                        value={x.minutes || undefined}
                        onChange={(m) => updateExtra(x.id, { minutes: m ?? 0 })}
                      />
                      <input
                        aria-label="Extra work"
                        className={cx(FIELD_CLASS, 'min-w-[12rem] flex-1')}
                        placeholder="e.g. Call list cleanup before the shift"
                        value={x.work}
                        onChange={(e) => updateExtra(x.id, { work: e.target.value })}
                      />
                      <select
                        aria-label="Extra project"
                        className={cx(FIELD_CLASS, 'w-44')}
                        value={x.projectId ?? ''}
                        onChange={(e) => updateExtra(x.id, { projectId: e.target.value || undefined })}
                      >
                        <option value="">No project</option>
                        {myProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        aria-label="Remove extra hours"
                        className="focus-ring w-8 rounded-lg p-1.5 text-muted hover:bg-surface hover:text-coral-ink"
                        onClick={() => setExtra((items) => items.filter((i) => i.id !== x.id))}
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button tone="soft" onClick={addExtra}>
                <Clock3 size={14} /> Add extra hours
              </Button>
              <Button
                className="ml-auto"
                onClick={() =>
                  guarded(() => {
                    saveDaily(me, date, { plan, extra: nonEmptyExtras(extra) });
                    syncPlanFromStore();
                    toast({ title: 'Plan and times saved', tone: 'success' });
                  })
                }
              >
                Save plan and times
              </Button>
            </div>
          </div>
        </Card>
      </section>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <UpdateCard
          id="todays-targets"
          icon={<Sunrise size={18} className="text-butter-ink" />}
          tone="bg-butter/50"
          title="Today's targets"
          subtitle="Built from the tasks your project managers gave you"
          lockedAt={record.sodAt}
          editing={editingSod}
          onEdit={() => setEditingSod(true)}
          view={
            <>
              <TaskSummary tasks={dayTasks} mode="assigned" />
              <TargetsTable
                rows={viewRows.rows}
                showTime
                label="Today's targets"
                empty="No tasks assigned for this day."
              />
              <NoteLine label="Note" text={record.sodNote} />
            </>
          }
        >
          <TaskSummary tasks={dayTasks} mode="assigned" />
          <TargetsTable
            rows={editRows.rows}
            showTime
            label="Today's targets"
            empty="No tasks assigned for this day yet."
          />
          <CustomRowsEditor
            rows={sodCustom}
            onChange={setSodCustom}
            title="Custom targets"
            hint="anything else you're aiming for today"
          />
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
        <UpdateCard
          id="end-of-day"
          icon={<Moon size={18} className="text-accent-ink" />}
          tone="bg-lavender/50"
          title="End of day update"
          subtitle="Actuals fill in from the tasks you submitted"
          lockedAt={record.eodAt}
          lockedLabel="Sent"
          editing={editingEod}
          onEdit={() => setEditingEod(true)}
          view={
            <>
              <TaskSummary tasks={submittedTasks} mode="submitted" />
              <TargetsTable
                rows={viewRows.rows}
                showActual
                label="End of day"
                empty="No tasks or targets for this day."
              />
              <TimeTable plan={record.plan} extra={record.extra ?? []} sent />
              <NoteLine label="How it went" text={record.eodNote} />
            </>
          }
        >
          <TaskSummary tasks={submittedTasks} mode="submitted" />
          <TargetsTable
            rows={viewRows.rows}
            showActual
            label="End of day"
            empty="No tasks or targets for this day."
          />
          {!eodSent && viewRows.rows.length > 0 && <PendingHint>Fills in when you send your end of day</PendingHint>}
          {plan.some((b) => b.custom) && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Custom blocks <span className="font-normal text-muted">· how much got done</span>
              </p>
              {plan
                .filter((b) => b.custom)
                .map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
                    style={{ borderLeft: `5px solid ${b.custom.priority ? '#DC2626' : '#64748B'}` }}
                  >
                    <span className="min-w-0 flex-1">
                      <b>
                        {b.custom.priority && '★ '}
                        {b.custom.title || 'Custom block'}
                      </b>
                      <span className="block text-xs text-muted">
                        {b.start} to {b.end} · target {b.custom.targetQty || 0} {b.custom.unit}
                      </span>
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      Achieved
                      <input
                        aria-label="Achieved"
                        type="number"
                        min={0}
                        className={cx(FIELD_CLASS, 'w-20 text-right')}
                        value={b.custom.achieved ?? ''}
                        placeholder="0"
                        onChange={(e) => updateCustom(b.id, { achieved: Math.max(0, +e.target.value || 0) })}
                      />
                    </label>
                  </div>
                ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <HoursStats t={hours} sent={eodSent} />
            <button
              className="focus-ring rounded-lg px-1 text-xs font-semibold text-accent-ink hover:underline"
              onClick={scrollToPlan}
            >
              Record actual time and extra hours
            </button>
          </div>
          <CustomRowsEditor
            rows={eodCustom}
            onChange={setEodCustom}
            title="Custom results"
            hint="anything extra you got done today"
            suggest={sodCustom}
          />
          <details className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Project numbers <span className="font-normal text-muted">(responses, calls, meetings)</span>
            </summary>
            <p className="mt-2 text-xs text-muted">Messages and decks are counted from your submitted tasks automatically.</p>
            <div className="mt-3">
              <ProjectNumbersEditor value={eodActuals} onChange={setEodActuals} />
            </div>
          </details>
          <label className="block text-sm font-semibold">
            How did today go?
            <textarea
              rows={2}
              className={cx(textareaClass, 'mt-1')}
              value={eodNote}
              onChange={(e) => setEodNote(e.target.value)}
              placeholder="Wins, blockers, what carries over to tomorrow"
            />
          </label>
          <Button
            onClick={() =>
              guarded(() => {
                saveDaily(me, date, {
                  plan,
                  extra: nonEmptyExtras(extra),
                  eodNote,
                  eodActuals,
                  eodCustom: eodCustom.filter((r) => r.label.trim()),
                  eodAt: new Date().toISOString(),
                });
                syncPlanFromStore();
                setEditingEod(false);
                toast({
                  title: `End of day sent, nice work ${firstName(me)} 🌙 Your numbers for the day are now final.`,
                  tone: 'success',
                });
              })
            }
          >
            <Lock size={13} /> Send & lock
          </Button>
        </UpdateCard>
      </div>
      <WeekCards personId={me} date={date} />
    </div>
  );
}

export default TasksUpdate;
