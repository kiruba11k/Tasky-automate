import { useEffect, useState } from 'react';
import { CalendarRange, Pencil, Send } from 'lucide-react';
import { Se as useStore, rt as Card, Te as Button, qe as Badge, lt as guarded, Ye as toast, We as formatMinutes } from '@/internal/min';
import { weekStart } from '../lib/dates.js';
import { weekRows } from '../lib/entries.js';
import { weekAssignedRows } from '../lib/assigned.js';
import { AddToWeek } from './AddToWeek';
import { EDIT_WEEK, EntriesProgress } from './EntriesProgress';
import { formatClock, formatDayClock, formatWeekRange } from './dateHelpers';

/**
 * "Weekly update" card: the week's rows added up from the daily updates (plus anything added to the week), with estimated and
 * taken time, an Edit mode to type over the numbers, and "Submit end of week". `readOnly` is the manager's view.
 */
export function WeeklyUpdate({ personId, date, readOnly }) {
  const { daily, weekly, tasks, projects, saveWeekly } = useStore();
  const mon = weekStart(date);
  const record = weekly[`${personId}|${mon}`];
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setEditing(false);
  }, [personId, mon]);
  useEffect(() => {
    if (readOnly) return undefined;
    const open = () => {
      setEditing(true);
      setTimeout(() => document.getElementById('weekly-update')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };
    window.addEventListener(EDIT_WEEK, open);
    return () => window.removeEventListener(EDIT_WEEK, open);
  }, [readOnly]);

  const rows = weekRows(personId, mon, daily, record?.entries ?? [], undefined, weekAssignedRows(tasks, daily, personId, mon, { projects }));
  const estimated = rows.reduce((sum, r) => sum + r.estMin, 0);
  const taken = rows.reduce((sum, r) => sum + (r.actualMin ?? 0), 0);
  const submit = () =>
    guarded(() => {
      const at = new Date().toISOString();
      saveWeekly(personId, mon, {
        entries: record?.entries ?? [],
        entriesDoneAt: at,
        eowAt: at,
        ...(record?.targetsAt ? {} : { targetsAt: at }),
      });
      setEditing(false);
      toast({ title: `End of week submitted at ${formatClock(at)} 🎉`, tone: 'success' });
    });

  return (
    <Card className="!p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <CalendarRange size={17} className="text-accent-ink" />
            Weekly update
          </h2>
          <p className="text-xs text-muted">
            {formatWeekRange(mon)} · fills in from your daily updates. The same task on different days adds up in one row.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">
            Estimated <b className="text-ink">{formatMinutes(estimated)}</b> · taken <b className="text-ink">{formatMinutes(taken)}</b>
          </span>
          {record?.entriesDoneAt ? (
            <span data-testid="week-done-time">
              <Badge tone="lavender">
                <Send size={11} /> End of week {formatDayClock(record.entriesDoneAt)}
              </Badge>
            </span>
          ) : (
            <Badge tone="grey">End of week not sent</Badge>
          )}
          {!readOnly && (
            <Button tone="ghost" className="border border-line" onClick={() => setEditing((v) => !v)}>
              <Pencil size={13} /> {editing ? 'Close edit' : 'Edit'}
            </Button>
          )}
          {!readOnly && (
            <Button onClick={submit}>
              <Send size={13} /> {record?.entriesDoneAt ? 'Submit again' : 'Submit end of week'}
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-3 p-4">
        {editing && !readOnly && <AddToWeek personId={personId} mon={mon} />}
        <EntriesProgress personId={personId} date={date} kind="week" editable={editing && !readOnly} />
      </div>
    </Card>
  );
}

export default WeeklyUpdate;
