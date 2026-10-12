import React, { useState } from 'react';
import { Pencil, Lock, Check } from 'lucide-react';
import {
  Se as useStore,
  oe as clsx,
  Te as Button,
  qe as Badge,
  Yw as ProgressBar,
  Gw as progressTone,
  AR as countWeek,
  bV as weekDays,
  HV as endOfDayStatus,
  ea as canEditProject,
  df as weekTargetFor,
  tc as tracksPeriod,
  Mt as weekStart,
  $e as dayKey,
  be as firstName,
  lt as attempt,
  Ye as toast,
} from '@/internal/min';
import { formatClock, BIG_NUMBER_INPUT_CLASS } from './projectHelpers';

/** "This week's numbers" tab: locked read-only totals with an Edit mode for corrections. */
export function WeekNumbers({ p, canEdit }) {
  const { tasks, daily, setWeekValues, finalizeDay } = useStore();
  const week = weekStart(0);
  const today = dayKey(0);
  const { counts, auto } = countWeek(p, tasks, daily, { kind: 'week', key: week });
  const me = useStore((s) => s.me);
  const isDraft = !p.weekPlans?.[week] && !p.weekLocked;
  const targets = isDraft && !canEditProject(p, me) ? undefined : weekTargetFor(p, week);
  const endOfDaySentCount = (date) =>
    p.teamIds.filter((id) => !!daily[`${id}|${date}`]?.eodAt).length;
  const days = weekDays(p, week);
  const eod = endOfDayStatus(p, { daily }, today);
  const metrics = p.metrics.filter((m) => tracksPeriod(m, 'week'));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');
  const finalizedCount = days.filter((d) => d.finalized).length;

  const startEditing = () => {
    setDraft(Object.fromEntries(metrics.map((m) => [m.id, String(counts[m.id] ?? 0)])));
    setError('');
    setEditing(true);
  };

  const save = () => {
    const changes = {};
    for (const m of metrics) {
      const raw = (draft[m.id] ?? '').trim();
      const value = raw === '' ? 0 : Number(raw);
      const autoCounted = auto[m.id] ?? 0;
      if (!Number.isFinite(value) || value < 0) return setError(`${m.label}: type a number of zero or more.`);
      if (value < autoCounted)
        return setError(
          `${m.label} can't be lower than the ${autoCounted} already counted from submitted tasks and end-of-day updates.`,
        );
      Math.round(value) !== (counts[m.id] ?? 0) && (changes[m.id] = Math.round(value) - autoCounted);
    }
    attempt(() => {
      Object.keys(changes).length && setWeekValues(p.id, changes);
      finalizeDay(p.id, today);
    }, setError) &&
      (setEditing(false),
      toast({
        title: Object.keys(changes).length
          ? "This week's numbers saved and today finalised"
          : 'No changes, today is finalised',
        tone: 'success',
      }));
  };

  return (
    <div className="space-y-4" data-testid="week-numbers">
      <div
        className={clsx(
          'flex flex-wrap items-center gap-3 rounded-2xl border-2 p-3',
          editing ? 'border-butter-strong/70 bg-butter/25' : 'border-line bg-surface-2',
        )}
      >
        <span
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            editing ? 'bg-butter text-butter-ink' : 'bg-surface text-ink shadow-soft',
          )}
        >
          {editing ? <Pencil size={18} /> : <Lock size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-bold">
            <span>{editing ? "Editing this week's numbers" : 'Locked'}</span>
            {!editing && <Badge tone="mint">Read-only</Badge>}
          </p>
          <p className="text-xs text-muted">
            {editing
              ? "Type the correct totals, then Save. Saving finalises today's numbers again."
              : 'Filled in automatically from submitted tasks and end-of-day updates, and locked (auto-filled ones too). Each day finalises when end-of-day updates are sent.'}
          </p>
        </div>
        {canEdit &&
          (editing ? (
            <div className="flex gap-2">
              <Button
                tone="ghost"
                className="border border-line bg-surface"
                onClick={() => {
                  setEditing(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={save}>
                <Check size={14} /> Save and finalise
              </Button>
            </div>
          ) : (
            <Button tone="ghost" className="border border-line bg-surface text-ink" onClick={startEditing}>
              <Pencil size={13} /> Edit
            </Button>
          ))}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-coral-ink">
          {error}
        </p>
      )}
      <div>
        {isDraft && targets && (
          <p className="mb-2">
            <Badge tone="butter">Draft target</Badge>
          </p>
        )}
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
          Finalised days this week · {finalizedCount} of 5
        </p>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Finalised days">
          {days.map((d) => {
            const isToday = d.date === today;
            const isFuture = d.date > today;
            return (
              <li
                key={d.date}
                data-finalized={d.finalized ? 'yes' : 'no'}
                className={clsx(
                  'rounded-xl border px-3 py-2 text-sm',
                  d.finalized
                    ? 'border-mint-strong/50 bg-mint/30'
                    : isToday
                      ? 'border-butter-strong/60 bg-butter/25'
                      : 'border-line bg-surface',
                )}
              >
                <p className="flex items-center justify-between font-semibold">
                  {isToday ? `Today, ${d.label}` : d.label}
                  {d.finalized && <Check size={14} className="text-mint-ink" />}
                </p>
                <p className={clsx('text-xs', d.finalized ? 'text-mint-ink' : 'text-muted')}>
                  {d.finalized
                    ? `Finalised ${formatClock(d.at)}`
                    : isFuture
                      ? 'Upcoming'
                      : endOfDaySentCount(d.date) > 0 && p.teamIds.length > 0
                        ? `Partly finalised ${endOfDaySentCount(d.date)} of ${p.teamIds.length}`
                        : isToday
                          ? 'Waiting for end of day'
                          : 'Not finalised'}
                </p>
              </li>
            );
          })}
        </ol>
        {p.teamIds.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            End of day sent today:{' '}
            {eod.sent.length ? <b className="text-ink">{eod.sent.map(firstName).join(', ')}</b> : 'nobody yet'}
            {eod.pending.length > 0 && <> · waiting on {eod.pending.map(firstName).join(', ')}</>}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {metrics.map((m) => {
          const autoCounted = auto[m.id] ?? 0;
          const count = counts[m.id] ?? 0;
          const target = targets?.[m.id];
          const pct = target ? Math.round((count / target) * 100) : null;
          return (
            <div
              key={m.id}
              data-metric={m.label}
              className={clsx(
                'rounded-2xl border p-3',
                editing ? 'border-accent/50 bg-surface' : 'border-line bg-surface-2/60',
              )}
            >
              <p
                className="flex items-center gap-1 truncate text-[11px] font-bold uppercase tracking-wide text-muted"
                title={m.label}
              >
                {!editing && <Lock size={10} className="shrink-0" />}
                {m.label}
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                {editing ? (
                  <input
                    type="number"
                    min={autoCounted}
                    inputMode="numeric"
                    aria-label={`${m.label} this week`}
                    className={clsx(BIG_NUMBER_INPUT_CLASS, 'w-24')}
                    value={draft[m.id] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [m.id]: e.target.value })}
                  />
                ) : (
                  <span className="text-2xl font-extrabold tabular-nums" aria-label={`${m.label} this week`}>
                    {count}
                  </span>
                )}
                {target ? <span className="text-sm text-muted">/ {target}</span> : null}
              </div>
              {!editing && target ? (
                <ProgressBar className="mt-2 h-1.5" pct={pct ?? 0} tone={progressTone(pct)} />
              ) : null}
              {autoCounted > 0 && (
                <p className="mt-1 text-[10px] text-accent-ink">
                  {autoCounted} auto-counted{editing ? ' (minimum)' : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeekNumbers;
