import { useEffect, useState } from 'react';
import { CalendarRange, CalendarCheck2, Lock } from 'lucide-react';
import {
  oe as cx,
  Se as useStore,
  Te as Button,
  Ge as textareaClass,
  lt as guarded,
  Ye as toast,
  be as firstName,
  mf as emptyWeekly,
  ft as addDays,
} from '@/internal/min';
import { UpdateCard } from './UpdateCard';
import { EntriesProgress } from './EntriesProgress';
import { TaskSummary } from './TaskSummary';
import { WeekProgressList } from './WeekProgressList';
import { PendingHint } from './PendingHint';
import { NoteLine } from './NoteLine';
import { CustomRowsEditor } from './CustomRowsEditor';
import { WeekHours } from './WeekHours';
import { buildWeekRows, countTargetsMet } from './progressRows';
import { formatWeekRange, weekdayRange } from './dateHelpers';

/** "Weekly targets" and "End of week update" cards for the week containing `date`. */
export function WeekCards({ personId, date }) {
  const { tasks, weekly, daily, projects, saveWeekly } = useStore();
  const [mon] = weekdayRange(date);
  const record = weekly[`${personId}|${mon}`] ?? emptyWeekly();
  const [targetsNote, setTargetsNote] = useState(record.targetsNote);
  const [targetsCustom, setTargetsCustom] = useState(record.targetsCustom);
  const [eowNote, setEowNote] = useState(record.eowNote);
  const [eowCustom, setEowCustom] = useState(record.eowCustom);
  const [editingTargets, setEditingTargets] = useState(false);
  const [editingEow, setEditingEow] = useState(false);

  useEffect(() => {
    const r = useStore.getState().weekly[`${personId}|${mon}`] ?? emptyWeekly();
    setTargetsNote(r.targetsNote);
    setTargetsCustom(r.targetsCustom);
    setEowNote(r.eowNote);
    setEowCustom(r.eowCustom);
    setEditingTargets(false);
    setEditingEow(false);
  }, [personId, mon]);

  const weekTasks = tasks.filter((t) => t.assigneeId === personId && t.date >= mon && t.date <= addDays(mon, 6));
  const progress = buildWeekRows(tasks, personId, mon, record, undefined, daily, projects);
  const taskRows = progress.rows.filter((r) => r.kind === 'task');
  const met = countTargetsMet(progress.rows);
  const rangeLabel = formatWeekRange(mon);
  const pendingHint = <PendingHint>Actuals fill in when you send your end of week</PendingHint>;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <UpdateCard
        id="weekly-targets"
        icon={<CalendarRange size={18} className="text-sky-ink" />}
        tone="bg-sky/40"
        title="Weekly targets"
        subtitle={`Week of ${rangeLabel} · from tasks assigned this week`}
        lockedAt={record.targetsAt}
        editing={editingTargets}
        onEdit={() => setEditingTargets(true)}
        view={
          <>
            <EntriesProgress personId={personId} date={date} kind="week" />
            <TaskSummary tasks={weekTasks} mode="assigned" />
            <WeekProgressList rows={progress.rows} sent={progress.sent} />
            {!progress.sent &&
              progress.rows.length > 0 &&
              (progress.soFar ? (
                <PendingHint>
                  So far, from sent end-of-day updates. Final numbers freeze when you send your end of week
                </PendingHint>
              ) : (
                pendingHint
              ))}
            <NoteLine label="Focus" text={record.targetsNote} />
          </>
        }
      >
        <EntriesProgress personId={personId} date={date} kind="week" />
        <TaskSummary tasks={weekTasks} mode="assigned" />
        <WeekProgressList rows={taskRows} sent={progress.sent} />
        {!progress.sent && taskRows.length > 0 && pendingHint}
        <label className="block text-sm font-semibold">
          Focus for the week
          <textarea
            rows={2}
            className={cx(textareaClass, 'mt-1')}
            value={targetsNote}
            onChange={(e) => setTargetsNote(e.target.value)}
            placeholder="e.g. 300 personalised L1s and 4 meetings booked"
          />
        </label>
        <CustomRowsEditor
          rows={targetsCustom}
          onChange={setTargetsCustom}
          title="Custom targets"
          hint="any other weekly goal"
        />
        <Button
          onClick={() =>
            guarded(() => {
              saveWeekly(personId, mon, {
                targetsNote,
                targetsCustom: targetsCustom.filter((r) => r.label.trim()),
                targetsAt: new Date().toISOString(),
              });
              setEditingTargets(false);
              toast({ title: 'Weekly targets locked 📅', tone: 'success' });
            })
          }
        >
          <Lock size={13} /> Save & lock
        </Button>
      </UpdateCard>
      <UpdateCard
        id="end-of-week"
        icon={<CalendarCheck2 size={18} className="text-mint-ink" />}
        tone="bg-mint/40"
        title="End of week update"
        subtitle={`Week of ${rangeLabel} · actuals fill in from tasks you submitted`}
        lockedAt={record.eowAt}
        lockedLabel="Sent"
        editing={editingEow}
        onEdit={() => setEditingEow(true)}
        view={
          <>
            {met.total > 0 && (
              <p className="text-sm">
                <b>
                  {met.met} of {met.total}
                </b>{' '}
                <span className="text-muted">weekly targets met</span>
              </p>
            )}
            <EntriesProgress personId={personId} date={date} kind="week" />
            <WeekHours personId={personId} mon={mon} />
            <NoteLine label="How it went" text={record.eowNote} />
          </>
        }
      >
        <EntriesProgress personId={personId} date={date} kind="week" />
        <WeekHours personId={personId} mon={mon} />
        <label className="block text-sm font-semibold">
          How did the week go?
          <textarea
            rows={2}
            className={cx(textareaClass, 'mt-1')}
            value={eowNote}
            onChange={(e) => setEowNote(e.target.value)}
            placeholder="Wins, blockers, what moves to next week"
          />
        </label>
        <CustomRowsEditor
          rows={eowCustom}
          onChange={setEowCustom}
          title="Custom results"
          hint="anything extra you did this week"
          suggest={targetsCustom}
        />
        <Button
          onClick={() =>
            guarded(() => {
              saveWeekly(personId, mon, {
                eowNote,
                eowCustom: eowCustom.filter((r) => r.label.trim()),
                eowAt: new Date().toISOString(),
              });
              setEditingEow(false);
              toast({
                title: `Week wrapped up, have a good weekend ${firstName(personId)} 🎉`,
                tone: 'success',
              });
            })
          }
        >
          <Lock size={13} /> Send & lock
        </Button>
      </UpdateCard>
    </div>
  );
}

export default WeekCards;
