import { useState } from 'react';
import { CalendarOff, Plus, Trash } from 'lucide-react';
import {
  Se as useStore,
  rt as Card,
  dt as CardTitle,
  qe as Badge,
  Te as Button,
  Ye as toast,
  oe as cn,
} from '@/internal/min';
import { addDays, formatDayMonth, isWeekday, parseDateKey, todayKey, WEEKDAY_SHORT } from '../lib/dates';

const FIELD_CLASS = 'focus-ring rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink';

/** Profile "Leave" card: add full / half day leave (weekends are skipped) and see upcoming and past leave. (original: `EH`) */
export function LeaveSection({ personId }) {
  const { profiles, setProfile } = useStore();
  const leaves = [...(profiles[personId]?.leaves ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const [from, setFrom] = useState(todayKey(0));
  const [to, setTo] = useState(todayKey(0));
  const [kind, setKind] = useState('full');
  const [note, setNote] = useState('');

  const addLeave = () => {
    if (!from) return;
    const last = to && to >= from ? to : from;
    const days = [];
    for (let day = from; day <= last && days.length < 60; day = addDays(day, 1)) if (isWeekday(day)) days.push(day);
    if (!days.length) {
      toast({ title: 'Those days are all weekends', tone: 'info' });
      return;
    }
    const kept = leaves.filter((l) => !days.includes(l.date));
    setProfile(personId, {
      leaves: [...kept, ...days.map((date) => ({ date, kind, note: note.trim() || undefined }))],
    });
    setNote('');
    toast({
      title: days.length === 1 ? `Leave added for ${formatDayMonth(days[0])}` : `Leave added for ${days.length} days`,
      tone: 'success',
    });
  };
  const removeLeave = (date) => setProfile(personId, { leaves: leaves.filter((l) => l.date !== date) });

  const today = todayKey(0);
  const upcoming = leaves.filter((l) => l.date >= today);
  const past = leaves
    .filter((l) => l.date < today)
    .reverse()
    .slice(0, 10);

  const renderLeave = (leave) => (
    <li key={leave.date} className="flex items-center gap-2 py-1.5 text-sm" data-leave={leave.date}>
      <span className="w-28 font-medium">
        {WEEKDAY_SHORT[parseDateKey(leave.date).getDay()]} {formatDayMonth(leave.date)}
      </span>
      <Badge tone={leave.kind === 'half' ? 'sky' : 'lavender'}>{leave.kind === 'holiday' ? 'Holiday' : leave.kind === 'full' ? 'Full day' : 'Half day'}</Badge>
      <span className="min-w-0 flex-1 truncate text-xs text-muted">{leave.note}</span>
      <button
        aria-label={`Remove leave on ${leave.date}`}
        className="focus-ring rounded p-1 text-muted hover:text-coral-ink"
        onClick={() => removeLeave(leave.date)}
      >
        <Trash size={13} />
      </button>
    </li>
  );

  return (
    <Card>
      <CardTitle>
        <CalendarOff size={17} className="mr-1.5 inline text-lavender-ink" />
        Leave
      </CardTitle>
      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-2/60 p-3" data-testid="leave-form">
        <label className="text-xs font-semibold text-muted">
          From
          <input
            type="date"
            aria-label="Leave from"
            className={cn(FIELD_CLASS, 'mt-1 block')}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              if (!to || e.target.value > to) setTo(e.target.value);
            }}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          To
          <input
            type="date"
            aria-label="Leave to"
            min={from}
            className={cn(FIELD_CLASS, 'mt-1 block')}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Type
          <select
            aria-label="Leave type"
            className={cn(FIELD_CLASS, 'mt-1 block')}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="full">Full day</option>
            <option value="half">Half day</option>
            <option value="holiday">Holiday</option>
          </select>
        </label>
        <label className="min-w-[10rem] flex-1 text-xs font-semibold text-muted">
          Note (optional)
          <input
            aria-label="Leave note"
            className={cn(FIELD_CLASS, 'mt-1 block w-full')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Family function"
          />
        </label>
        <Button onClick={addLeave}>
          <Plus size={14} /> Add leave
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Weekends are skipped. Leave shows on your daily update, the team view and your page for managers.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Upcoming</p>
          {upcoming.length ? (
            <ul className="divide-y divide-line">{upcoming.map(renderLeave)}</ul>
          ) : (
            <p className="mt-1 text-sm text-muted">No leave planned.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Past</p>
          {past.length ? (
            <ul className="divide-y divide-line">{past.map(renderLeave)}</ul>
          ) : (
            <p className="mt-1 text-sm text-muted">None yet.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default LeaveSection;
