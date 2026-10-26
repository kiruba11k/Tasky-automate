import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Lock } from 'lucide-react';
import {
  Se as useStore,
  Te as Button,
  qe as Badge,
  AR as countWeek,
  tc as tracksPeriod,
  lt as attempt,
  Ye as toast,
} from '@/internal/min';
import { ProgressBar } from '../ui/ProgressBar';
import { weekTargetFor } from '@/internal/lib/domain';
import { formatDayMonth, todayKey } from '@/internal/lib/dates';
import { TargetSheet } from './TargetSheet';
import { TABLE_INPUT_CLASS, MILESTONE_STATUSES, sortedWeeks, targetKind } from './targetKinds';

const ACHIEVED_INPUT_CLASS =
  'focus-ring w-24 rounded-lg border border-line bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink';

const STATUS_TONES = { Completed: 'mint', Blocked: 'coral', 'In progress': 'sky' };

/** Goal / achieved bar of one row. */
function AchievedBar({ value, goal }) {
  return (
    <span className="flex items-center gap-2">
      <ProgressBar value={value} max={goal} tone={goal && value >= goal ? 'mint' : 'sky'} />
      <span className="w-10 text-right text-xs tabular-nums text-muted">
        {goal ? `${Math.round((value / goal) * 100)}%` : ''}
      </span>
    </span>
  );
}

/** "This week's numbers" tab: pick a week, fill in what was achieved against each goal, Save or Lock. */
function WeekNumbersTable({ p, canEdit }) {
  const { tasks, daily } = useStore();
  const saveWeekActuals = useStore((s) => s.saveWeekActuals);
  const weeks = sortedWeeks(p);
  const today = todayKey(0);
  const initial = (weeks.find((w) => w.start <= today && today <= w.end) ?? weeks[weeks.length - 1])?.start;
  const [selected, setSelected] = useState(initial);
  const index = weeks.findIndex((w) => w.start === selected);
  const week = weeks[index];
  const isThisWeek = !!week && week.start <= today && today <= week.end;
  const off = (week && p.weekOff?.[week.start]) || [];
  const metrics = p.metrics.filter((m) => tracksPeriod(m, 'week') && !off.includes(m.id));
  const goals = week ? weekTargetFor(p, week.start) : {};
  const actuals = (week && p.weekActuals?.[week.start]) || {};
  const textRows = (week && p.weekText?.[week.start]) || [];
  const lockedAt = week ? p.weekDoneAt?.[week.start] : undefined;
  const [draft, setDraft] = useState(null);
  useEffect(() => {
    setDraft(null);
  }, [selected]);
  const editable = canEdit && (!!draft || !lockedAt);
  // what the team's day tables, submitted tasks and counters add up to for the chosen week (a week not yet begun has nothing)
  const derived = useMemo(
    () => (week && week.start <= today ? countWeek(p, tasks, daily, { kind: 'week', key: week.start, end: week.end }).counts : {}),
    [p, tasks, daily, week, today],
  );
  const startValue = (id) => String(actuals[id] ?? derived[id] ?? 0);
  const current = draft ?? {
    m: Object.fromEntries(metrics.map((m) => [m.id, startValue(m.id)])),
    rows: textRows.map((r) => ({ ...r })),
  };
  const patch = (changes) => setDraft({ ...current, ...changes });
  const patchRow = (id, changes) =>
    patch({ rows: current.rows.map((r) => (r.id === id ? { ...r, ...changes } : r)) });

  const save = (lock) => {
    if (!week) return;
    const numbers = {};
    metrics.forEach((m) => {
      numbers[m.id] = Math.max(0, Math.round(+current.m[m.id] || 0));
    });
    attempt(() => saveWeekActuals(p.id, week.start, numbers, current.rows, lock)) &&
      (setDraft(null), toast({ title: lock ? `Week ${index + 1} numbers locked 🔒` : 'Saved', tone: 'success' }));
  };

  if (!weeks.length)
    return (
      <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
        No weeks set yet. Add weeks and their targets in the Targets tab first.
      </p>
    );
  return (
    <div className="space-y-4" data-testid="week-numbers-simple">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Week"
          className="focus-ring rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {weeks.map((w, i) => (
            <option key={w.start} value={w.start}>
              Week {i + 1} · {formatDayMonth(w.start)} to {formatDayMonth(w.end)}
              {w.start <= today && today <= w.end ? ' (this week)' : ''}
            </option>
          ))}
        </select>
        {lockedAt && !draft ? (
          <Badge tone="mint">
            <Lock size={11} /> Locked{' '}
            {new Date(lockedAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </Badge>
        ) : (
          <Badge tone="butter">
            <Pencil size={11} /> Open
          </Badge>
        )}
        <span className="ml-auto flex gap-2">
          {canEdit && lockedAt && !draft && (
            <Button
              tone="ghost"
              className="border border-line"
              onClick={() =>
                setDraft({
                  m: Object.fromEntries(metrics.map((m) => [m.id, startValue(m.id)])),
                  rows: textRows.map((r) => ({ ...r })),
                })
              }
            >
              <Pencil size={13} /> Edit
            </Button>
          )}
          {editable && (
            <>
              <Button tone="ghost" className="border border-line" onClick={() => save(false)}>
                Save
              </Button>
              <Button onClick={() => save(true)}>
                <Lock size={13} /> Lock
              </Button>
            </>
          )}
        </span>
      </div>
      {metrics.length + current.rows.length === 0 ? (
        <p className="text-sm text-muted">No targets for this week. Set them in the Targets tab.</p>
      ) : !editable ? (
        <TargetSheet
          title="This week's numbers"
          heading={week ? `${formatDayMonth(week.start)} to ${formatDayMonth(week.end)}` : "This week's numbers"}
          columns={['Target', 'Goal', 'Achieved', '%']}
          rows={[
            ...metrics.map((m) => {
              const goal = goals[m.id] ?? 0;
              const value = +current.m[m.id] || 0;
              return [m.label, String(goal), String(value), goal ? `${Math.round((value / goal) * 100)}%` : '·'];
            }),
            ...current.rows.map((r) => {
              const kind = targetKind(r);
              return kind === 'number'
                ? [r.label, String(r.targetNum ?? 0), String(r.actualNum ?? 0), r.targetNum ? `${Math.round(((r.actualNum ?? 0) / r.targetNum) * 100)}%` : '·']
                : [r.label, r.target || '·', kind === 'milestone' ? (r.status ?? 'Not started') : r.actual || '·', '·'];
            }),
          ]}
          filename={`${p.name}-week-numbers.png`}
        />
      ) : (
        <table className="w-full text-sm" aria-label="This week's numbers">
          <thead>
            <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
              <th className="py-1.5">Target</th>
              <th className="py-1.5">Goal</th>
              <th className="py-1.5">Achieved</th>
              <th className="w-40 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const goal = goals[m.id] ?? 0;
              const value = +current.m[m.id] || 0;
              return (
                <tr key={m.id} className="border-b border-line/70" data-number-row={m.label}>
                  <td className="py-2 font-medium">{m.label}</td>
                  <td className="py-2 tabular-nums text-muted">{goal}</td>
                  <td className="py-2">
                    {editable ? (
                      <input
                        aria-label={`${m.label} achieved`}
                        type="number"
                        min={0}
                        className={ACHIEVED_INPUT_CLASS}
                        value={current.m[m.id] ?? ''}
                        onChange={(e) => patch({ m: { ...current.m, [m.id]: e.target.value } })}
                      />
                    ) : (
                      <b className="tabular-nums">{value}</b>
                    )}
                  </td>
                  <td className="py-2">
                    <AchievedBar value={value} goal={goal} />
                  </td>
                </tr>
              );
            })}
            {current.rows.map((r) => {
              const kind = targetKind(r);
              return (
                <tr key={r.id} className="border-b border-line/70" data-text-target={r.id}>
                  <td className="py-2 font-medium">{r.label}</td>
                  <td className="py-2 text-muted">
                    {kind === 'number' ? <span className="tabular-nums">{r.targetNum ?? 0}</span> : r.target || '·'}
                  </td>
                  <td className="py-2" colSpan={kind === 'number' ? 1 : 2}>
                    {kind === 'number' ? (
                      editable ? (
                        <input
                          aria-label={`${r.label} achieved`}
                          type="number"
                          min={0}
                          className={ACHIEVED_INPUT_CLASS}
                          value={r.actualNum ?? ''}
                          onChange={(e) =>
                            patchRow(r.id, {
                              actualNum: e.target.value === '' ? undefined : Math.max(0, Math.round(+e.target.value)),
                            })
                          }
                        />
                      ) : (
                        <b className="tabular-nums">{r.actualNum ?? 0}</b>
                      )
                    ) : kind === 'milestone' ? (
                      editable ? (
                        <select
                          aria-label={`${r.label} status`}
                          className="focus-ring rounded-lg border border-line bg-surface px-2 py-1 text-sm"
                          value={r.status ?? 'Not started'}
                          onChange={(e) => patchRow(r.id, { status: e.target.value })}
                        >
                          {MILESTONE_STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={STATUS_TONES[r.status] ?? 'grey'}>{r.status ?? 'Not started'}</Badge>
                      )
                    ) : editable ? (
                      <input
                        aria-label={`${r.label} achieved`}
                        className={TABLE_INPUT_CLASS}
                        value={r.actual ?? ''}
                        placeholder="What happened"
                        onChange={(e) => patchRow(r.id, { actual: e.target.value })}
                      />
                    ) : (
                      <span>{r.actual || '·'}</span>
                    )}
                  </td>
                  {kind === 'number' && (
                    <td className="py-2">
                      <AchievedBar value={r.actualNum ?? 0} goal={r.targetNum ?? 0} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {editable && week && week.start <= today && (
        <p className="text-xs text-muted">
          Numbers start from what the team's daily updates and submitted tasks counted {isThisWeek ? 'this week' : 'that week'}. Change anything, then
          Lock.
        </p>
      )}
    </div>
  );
}

/** Week numbers tab (project `p`; `canEdit` lets managers fill in and lock a week). */
export function WeekNumbers({ p, canEdit }) {
  return <WeekNumbersTable p={p} canEdit={canEdit} />;
}

export default WeekNumbers;
