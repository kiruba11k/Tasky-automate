import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Trash, Plus, WandSparkles, Undo2 } from 'lucide-react';
import {
  Se as useStore,
  oe as clsx,
  Te as Button,
  be as firstName,
  lt as attempt,
  Ye as toast,
} from '@/internal/min';
import { Modal } from '../kit/Modal';
import { weekTargetFor } from '@/internal/lib/domain';
import { MONTH_SHORT, addDays, formatDayMonth, parseDateKey, todayKey, weekStart } from '@/internal/lib/dates';
import { PeriodPlan } from './PeriodPlan';
import { sortedWeeks } from './targetKinds';

const PILL_COLORS = ['#1D3FA0', '#0E9F6E', '#D97706', '#7C3AED', '#DC2626', '#0891B2'];

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

/** Monday to Friday of the week containing `key`. */
const monFri = (key) => {
  const start = weekStart(key);
  return { start, end: addDays(start, 4) };
};

/** First to last day of the month containing `key`. */
const wholeMonth = (key) => {
  const d = parseDateKey(key);
  const y = d.getFullYear();
  const m = d.getMonth();
  return { start: dateKey(y, m, 1), end: dateKey(y, m, new Date(y, m + 1, 0).getDate()) };
};

/** Move a record's value from one key to another (when a period's start date changes). */
const rekey = (record, from, to) => {
  const out = { ...record };
  if (from && from !== to && out[from] !== undefined) {
    out[to] = out[from];
    delete out[from];
  }
  return out;
};

/** Reads and writes of one project's weeks or months, behind one shape. */
function usePeriodApi(p, period) {
  const store = useStore();
  if (period === 'week') {
    return {
      list: sortedWeeks(p),
      setDates: (from, to) => store.setWeekDates(p.id, from, to),
      remove: (start) => store.binPeriod(p.id, 'week', start),
      plan: (start) => weekTargetFor(p, start),
      planned: (start) => !!p.weekPlans?.[start],
      text: (start) => p.weekText?.[start] ?? [],
      off: (start) => p.weekOff?.[start] ?? [],
      save: (start, numbers, rows, off) => {
        store.saveWeekPlan(p.id, start, numbers);
        store.setWeekText(p.id, start, rows);
        store.setWeekOff(p.id, start, off);
      },
    };
  }
  const list = [...(p.customMonths ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  return {
    list,
    setDates: (from, to) => {
      if (!to.start || !to.end || to.end < to.start) throw new Error('A month must end on or after the day it starts.');
      const others = list.filter((m) => m.start !== from);
      if (others.some((m) => m.start <= to.end && to.start <= m.end))
        throw new Error('Those days are already in another month.');
      store.setMonthData(p.id, {
        customMonths: [...others, to],
        monthPlans: rekey(p.monthPlans, from, to.start),
        monthText: rekey(p.monthText, from, to.start),
        monthOff: rekey(p.monthOff, from, to.start),
      });
    },
    remove: (start) => store.binPeriod(p.id, 'month', start),
    plan: (start) => p.monthPlans?.[start] ?? p.monthTarget,
    planned: (start) => !!p.monthPlans?.[start],
    text: (start) => p.monthText?.[start] ?? [],
    off: (start) => p.monthOff?.[start] ?? [],
    save: (start, numbers, rows, off) => {
      const clean = rows
        .map((r) => ({ ...r, label: r.label.trim(), target: (r.target ?? '').trim() }))
        .filter((r) => r.label || r.target || r.targetNum != null);
      store.setMonthData(p.id, {
        monthPlans: { ...p.monthPlans, [start]: numbers },
        monthText: { ...p.monthText, [start]: clean },
        monthOff: { ...p.monthOff, [start]: off },
      });
    },
  };
}

/** Weeks (or months) of a project: tabs, add / change dates / delete (to the bin), and the targets of the open one. */
export function PeriodManager({ p, period = 'week' }) {
  const api = usePeriodApi(p, period);
  const list = api.list;
  const Label = period === 'week' ? 'Week' : 'Month';
  const label = Label.toLowerCase();
  const titleOf = (i, item) =>
    period === 'month'
      ? `${MONTH_SHORT[parseDateKey(item.start).getMonth()]} ${parseDateKey(item.start).getFullYear()}`
      : `Week ${i + 1}`;
  const today = todayKey(0);
  const initial = list.find((x) => x.start <= today && today <= x.end)?.start ?? list[list.length - 1]?.start ?? null;
  const [selected, setSelected] = useState(initial);
  const startsKey = list.map((x) => x.start).join(',');
  useEffect(() => {
    if (!selected || !list.some((x) => x.start === selected)) setSelected(list[list.length - 1]?.start ?? null);
  }, [startsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const index = list.findIndex((x) => x.start === selected);
  const current = list[index];
  const { restorePeriod, purgePeriod } = useStore();
  const bin = (p.periodBin ?? []).filter((b) => b.period === period);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [binOpen, setBinOpen] = useState(false);
  const [purgeId, setPurgeId] = useState(null);

  const doDelete = () => {
    if (!current) return;
    const title = titleOf(index, current);
    attempt(() => api.remove(current.start)) &&
      (setConfirmDelete(false),
      toast({ title: `${title} moved to the bin. You can bring it back from Bin.`, tone: 'info' }));
  };
  const add = () => {
    const last = list[list.length - 1];
    const range =
      period === 'week'
        ? monFri(last ? addDays(last.end, 3) : todayKey(0))
        : wholeMonth(last ? addDays(last.end, 1) : todayKey(0));
    attempt(() => api.setDates(null, range)) &&
      (setSelected(range.start),
      toast({
        title: `${titleOf(list.length, range)} added: ${formatDayMonth(range.start)} to ${formatDayMonth(range.end)}`,
        tone: 'success',
      }));
  };
  const setDates = (range) =>
    attempt(() => api.setDates(current?.start ?? null, range)) &&
    (setSelected(range.start),
    toast({
      title: `${Label} ${index + 1}: ${formatDayMonth(range.start)} to ${formatDayMonth(range.end)}`,
      tone: 'success',
    }));

  return (
    <div className="rounded-2xl border border-line p-4" data-testid={`${label}-manager`}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 font-bold">
          <CalendarDays size={16} className="text-accent-ink" /> {Label}s and targets
        </p>
        <button
          onClick={() => setBinOpen(true)}
          data-testid={`${label}-bin`}
          title={`Deleted ${label}s`}
          className="focus-ring relative flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-ink"
        >
          <Trash size={13} /> Bin
          {bin.length > 0 && (
            <span className="rounded-full bg-coral px-1.5 text-[10px] font-bold text-coral-ink">{bin.length}</span>
          )}
        </button>
      </div>
      <p className="text-xs text-muted">
        Add a {label}, pick its start and end date, then plan its targets. Add the next {label} whenever you want to
        plan ahead.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="tablist" aria-label={`${Label}s`}>
        {list.map((item, i) => (
          <button
            key={item.start}
            role="tab"
            aria-selected={selected === item.start}
            onClick={() => setSelected(item.start)}
            className={clsx(
              'focus-ring relative flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              selected === item.start
                ? 'border-transparent text-white'
                : 'border-line bg-surface text-ink hover:border-accent/50',
            )}
          >
            {selected === item.start && (
              <motion.span
                layoutId={`${label}-pill`}
                className="absolute inset-0 rounded-full"
                style={{ background: PILL_COLORS[i % PILL_COLORS.length] }}
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            <span className="relative">{titleOf(i, item)}</span>
            {item.start <= today && today <= item.end && (
              <span className="relative rounded-full bg-white/80 px-1.5 text-[9px] text-ink">now</span>
            )}
          </button>
        ))}
        <Button tone="soft" onClick={add}>
          <Plus size={13} /> {period === 'week' ? `Add week ${list.length + 1}` : 'Add month'}
        </Button>
      </div>
      {current ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-2">
            <span className="h-3 w-3 rounded-full" style={{ background: PILL_COLORS[index % PILL_COLORS.length] }} />
            <b>{titleOf(index, current)}</b>
            <span className="sr-only" data-testid={`${label}-dates`}>
              {formatDayMonth(current.start)} to {formatDayMonth(current.end)}
            </span>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              Start date
              <input
                type="date"
                aria-label={`${Label} start date`}
                className="focus-ring rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
                value={current.start}
                onChange={(e) =>
                  e.target.value &&
                  setDates({ start: e.target.value, end: e.target.value > current.end ? e.target.value : current.end })
                }
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              End date
              <input
                type="date"
                aria-label={`${Label} end date`}
                min={current.start}
                className="focus-ring rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
                value={current.end}
                onChange={(e) =>
                  e.target.value &&
                  setDates({ start: current.start, end: e.target.value < current.start ? current.start : e.target.value })
                }
              />
            </label>
            <span className="ml-auto flex flex-wrap gap-2">
              <Button
                tone="ghost"
                className="border border-line bg-surface"
                onClick={() => setDates(period === 'week' ? monFri(current.start) : wholeMonth(current.start))}
              >
                <WandSparkles size={13} /> {period === 'week' ? 'Mon to Fri' : 'Whole month'}
              </Button>
              <Button tone="ghost" className="text-coral-ink" onClick={() => setConfirmDelete(true)}>
                <Trash size={13} /> Delete
              </Button>
            </span>
          </div>
          <PeriodPlan
            key={period + current.start}
            p={p}
            api={api}
            period={period}
            ws={current.start}
            title={titleOf(index, current)}
            prevTitle={index > 0 ? titleOf(index - 1, list[index - 1]) : undefined}
            prev={list[index - 1]?.start}
            onSave={(numbers, rows, off) => attempt(() => api.save(current.start, numbers, rows, off))}
          />
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          {period === 'week' ? (
            <>
              No weeks yet. Press <b>Add week 1</b> to start with this week (Monday to Friday), then change the days if
              you need to.
            </>
          ) : (
            <>
              No months yet. Press <b>Add month</b> to start with this month, then change the days if you need to.
            </>
          )}
        </p>
      )}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${current ? titleOf(index, current) : ''}?`}
        size="sm"
        footer={
          <>
            <Button tone="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button className="!bg-coral-strong !text-white" onClick={doDelete}>
              <Trash size={13} /> Yes, delete
            </Button>
          </>
        }
      >
        <p className="text-sm" data-testid="confirm-delete">
          {current && (
            <>
              {formatDayMonth(current.start)} to {formatDayMonth(current.end)} and its targets will move to the bin. You
              can bring it back from <b>Bin</b> any time.
            </>
          )}
        </p>
      </Modal>
      <Modal
        open={binOpen}
        onClose={() => {
          setBinOpen(false);
          setPurgeId(null);
        }}
        title={`Deleted ${label}s`}
        description="Bring a deleted one back with its targets"
        size="md"
      >
        {bin.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">The bin is empty.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="bin-list">
            {bin.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <b>
                    {period === 'month'
                      ? `${MONTH_SHORT[parseDateKey(b.week.start).getMonth()]} ${parseDateKey(b.week.start).getFullYear()}`
                      : `${formatDayMonth(b.week.start)} to ${formatDayMonth(b.week.end)}`}
                  </b>
                  <span className="block text-xs text-muted">
                    {period === 'month' ? `${formatDayMonth(b.week.start)} to ${formatDayMonth(b.week.end)} · ` : ''}
                    deleted by {firstName(b.by)}{' '}
                    {new Date(b.deletedAt).toLocaleString([], {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {b.plan || b.text?.length ? ' · targets kept' : ''}
                  </span>
                </span>
                {purgeId === b.id ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-coral-ink">Delete for good?</span>
                    <Button tone="ghost" onClick={() => setPurgeId(null)}>
                      No
                    </Button>
                    <Button
                      className="!bg-coral-strong !text-white"
                      onClick={() => {
                        attempt(() => purgePeriod(p.id, b.id)) &&
                          (setPurgeId(null), toast({ title: 'Deleted for good', tone: 'info' }));
                      }}
                    >
                      Yes
                    </Button>
                  </span>
                ) : (
                  <span className="flex gap-2">
                    <Button
                      tone="soft"
                      onClick={() => {
                        attempt(() => restorePeriod(p.id, b.id)) &&
                          (setSelected(b.week.start),
                          toast({ title: 'Brought back with its targets', tone: 'success' }));
                      }}
                    >
                      <Undo2 size={13} /> Restore
                    </Button>
                    <Button tone="ghost" className="text-coral-ink" onClick={() => setPurgeId(b.id)}>
                      Delete for good
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

export default PeriodManager;
