import React, { useState, useMemo, useEffect } from 'react';
import { Pencil, Lock, ChevronLeft, ChevronRight, Check, Copy } from 'lucide-react';
import {
  Se as useStore,
  oe as clsx,
  Te as Button,
  qe as Badge,
  $e as dayKey,
  DR as listPlanWeeks,
  df as weekTargetFor,
  tc as tracksPeriod,
  lt as attempt,
  Ye as toast,
} from '@/internal/min';
import { projectWeekStart, savedWeekPlan } from '@/internal/lib/domain';
import { BIG_NUMBER_INPUT_CLASS } from './projectHelpers';

/** Project number targets for one week (messages, responses, calls...). Weeks run in 7-day blocks from the project's start.
 *  `date` picks the week to open on (default: the current week). */
export function WeekPlanner({ p, date }) {
  const { saveWeekPlan, clearWeekPlan, weekly } = useStore();
  const weeks = useMemo(() => listPlanWeeks(p, 'plan'), [p]);
  const thisWeek = projectWeekStart(p, dayKey(0));
  const wanted = projectWeekStart(p, date ?? dayKey(0));
  const [selected, setSelected] = useState(() =>
    weeks.some((w) => w.start === wanted) ? wanted : (weeks[0]?.start ?? thisWeek),
  );
  useEffect(() => {
    if (weeks.some((w) => w.start === wanted)) setSelected(wanted);
  }, [wanted]); // eslint-disable-line react-hooks/exhaustive-deps
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const index = Math.max(
    0,
    weeks.findIndex((w) => w.start === selected),
  );
  const week = weeks[index];
  const savedPlan = savedWeekPlan(p, selected);
  const targets = weekTargetFor(p, selected, weekly) ?? {};
  const metrics = p.metrics.filter((m) => tracksPeriod(m, 'week'));
  const upcoming = weeks.filter((w) => w.start > thisWeek).slice(0, 4);

  useEffect(() => {
    setEditing(false);
  }, [selected]);

  const startEditing = (source = targets) => {
    setDraft(Object.fromEntries(metrics.map((m) => [m.id, String(source[m.id] ?? 0)])));
    setEditing(true);
  };

  const save = () => {
    const plan = { ...targets };
    for (const m of metrics) {
      const raw = (draft[m.id] ?? '').trim();
      const value = raw === '' ? 0 : Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        attempt(() => {
          throw new Error(`${m.label}: targets must be zero or more.`);
        });
        return;
      }
      plan[m.id] = Math.round(value);
    }
    attempt(() => saveWeekPlan(p.id, selected, plan)) &&
      (setEditing(false), toast({ title: `Week ${week?.n} plan saved and locked`, tone: 'success' }));
  };

  if (!week) return null;
  return (
    <div className="rounded-2xl border border-line p-4" data-testid="week-planner">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">📆 Plan targets week by week</p>
          <p className="text-xs text-muted">
            Pre-plan any week and save it. Saved weeks are locked; weeks without a plan use the default weekly
            target.
          </p>
        </div>
        {editing ? (
          <Badge tone="butter">
            <Pencil size={11} /> Editing
          </Badge>
        ) : savedPlan ? (
          <Badge tone="mint">
            <Lock size={11} /> Plan saved, locked
          </Badge>
        ) : (
          <Badge tone="grey">Using the default weekly target</Badge>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          aria-label="Previous week"
          disabled={index === 0}
          className="focus-ring rounded-lg border border-line bg-surface p-1.5 disabled:opacity-40"
          onClick={() => setSelected(weeks[index - 1].start)}
        >
          <ChevronLeft size={15} />
        </button>
        <select
          aria-label="Plan week"
          className="focus-ring min-w-0 max-w-full flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink sm:flex-none"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {weeks.map((w) => (
            <option key={w.start} value={w.start}>
              {w.label}
              {w.planned ? ' · plan saved' : ''}
            </option>
          ))}
        </select>
        <button
          aria-label="Next week"
          disabled={index >= weeks.length - 1}
          className="focus-ring rounded-lg border border-line bg-surface p-1.5 disabled:opacity-40"
          onClick={() => setSelected(weeks[index + 1].start)}
        >
          <ChevronRight size={15} />
        </button>
      </div>
      {upcoming.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Plan ahead">
          <span className="mr-1 font-semibold text-muted">Plan ahead:</span>
          {upcoming.map((w) => (
            <button
              key={w.start}
              onClick={() => setSelected(w.start)}
              className={clsx(
                'focus-ring inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold',
                selected === w.start
                  ? 'border-accent bg-accent-soft text-accent-ink'
                  : 'border-line bg-surface text-ink hover:border-accent/60',
              )}
            >
              Week {w.n}
              {w.planned ? (
                <Check size={12} className="text-mint-ink" aria-label="planned" />
              ) : (
                <span className="font-normal text-muted">not planned</span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <label
            key={m.id}
            className={clsx(
              'rounded-xl border px-3 py-2',
              editing
                ? 'border-accent/50 bg-surface'
                : savedPlan
                  ? 'border-mint-strong/40 bg-mint/15'
                  : 'border-line bg-surface',
            )}
          >
            <span
              className="block truncate text-[11px] font-bold uppercase tracking-wide text-muted"
              title={m.label}
            >
              {m.label}
            </span>
            {editing ? (
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`${m.label} target for week ${week.n}`}
                className={clsx(BIG_NUMBER_INPUT_CLASS, 'mt-1')}
                value={draft[m.id] ?? ''}
                onChange={(e) => setDraft({ ...draft, [m.id]: e.target.value })}
              />
            ) : (
              <span className="block text-xl font-extrabold tabular-nums">{targets[m.id] ?? 0}</span>
            )}
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Button onClick={save}>
              <Lock size={13} /> Save and lock week {week.n}
            </Button>
            {index > 0 && (
              <Button
                tone="ghost"
                className="border border-line"
                onClick={() => startEditing(weekTargetFor(p, weeks[index - 1].start, weekly))}
              >
                <Copy size={13} /> Copy week {weeks[index - 1].n}
              </Button>
            )}
            <Button tone="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              tone={savedPlan ? 'ghost' : 'primary'}
              className={savedPlan ? 'border border-line bg-surface' : ''}
              onClick={() => startEditing()}
            >
              <Pencil size={13} /> {savedPlan ? 'Edit this week' : `Plan week ${week.n}`}
            </Button>
            {savedPlan && (
              <Button
                tone="ghost"
                onClick={() =>
                  attempt(() => {
                    clearWeekPlan(p.id, selected);
                    toast({ title: `Week ${week.n} now uses the default weekly target`, tone: 'info' });
                  })
                }
              >
                Use the default target instead
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default WeekPlanner;
