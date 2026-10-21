import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Image as ImageIcon, Pencil } from 'lucide-react';
import { oe as cx, Se as useStore, Rh as ProgressBar, pu as projectColor, qe as Badge, We as formatMinutes, Ye as toast, lt as guarded } from '@/internal/min';
import { addDays, formatDayMonth, parseDateKey, weekStart, WEEKDAY_SHORT } from '../lib/dates.js';
import { rowKey, weekRows } from '../lib/entries.js';
import { dayRowsWithAssigned, weekAssignedRows } from '../lib/assigned.js';
import { EDIT_DAY_TASKS } from './EntriesLog';
import { ROW_STATUSES, entryName, projectLabel, rowDone, rowTarget } from './entryHelpers';
import { copyElementAsImage } from '../lib/copyTableImage';
import { DateMenu, DayMarker } from './DateMenu';
import { DayMover } from './DayMover';
import { sheetAchievedText, sheetColorOf, sheetTargetText } from './sheetText';

/** Window event: "open the week's table for editing" (sent by the Edit button on the week's progress card). */
export const EDIT_WEEK = 'ls-edit-week';

const percentOf = (done, target) => (target ? Math.round((done / target) * 100) : 0);
const toneOf = (pct) => (pct >= 100 ? 'mint' : pct >= 60 ? 'sky' : 'peach');

/** A whole-number box that saves when it loses focus or Enter is pressed. */
function NumberBox({ value, onSave, label }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(String(value));
  }, [value]);
  const commit = () => {
    const next = Math.max(0, Math.round(+text || 0));
    if (next !== value) onSave(next);
    else setText(String(value));
  };
  return (
    <input
      aria-label={label}
      type="number"
      min={0}
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
      className="focus-ring w-14 rounded-md border border-line bg-surface px-1.5 py-0.5 text-right text-xs font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

/** A text box that saves when it loses focus or Enter is pressed. */
function TextBox({ value, onSave, label }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);
  return (
    <input
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onSave(text)}
      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
      placeholder="What got done"
      className="focus-ring w-full rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs"
    />
  );
}

/** Each day of the week as a chip: date, Holiday / Leave marker and how much work it holds. The owner can move a day's work from here. */
function WeekDays({ personId, monday }) {
  const { tasks, daily, projects, me } = useStore();
  const days = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => addDays(monday, i))
    .map((d) => ({ d, count: dayRowsWithAssigned(tasks, daily, personId, d, { projects, carry: false }).length }))
    .filter(({ d, count }) => count > 0 || parseDateKey(d).getDay() % 6 !== 0);
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="week-days">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Days</span>
      {days.map(({ d, count }) => (
        <span key={d} data-week-day={d} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1 text-xs">
          <DayMover personId={personId} date={d} testId={`week-day-${d}`} className="font-semibold">
            {WEEKDAY_SHORT[parseDateKey(d).getDay()]} {formatDayMonth(d)}
          </DayMover>
          <DayMarker personId={personId} date={d} />
          <span className="tabular-nums text-muted">{count ? `${count} row${count === 1 ? '' : 's'}` : '·'}</span>
        </span>
      ))}
      {personId === me && <span className="text-[11px] text-muted">Click a date to move its work to another day.</span>}
    </div>
  );
}

/**
 * Progress of a day's (or week's) rows against their targets, per project. For the week the rows are the days' rows added up;
 * with `editable` the week's numbers and statuses can be typed over right here.
 */
export function EntriesProgress({ personId, date, kind, editable }) {
  const { projects, daily, weekly, tasks, saveWeekly, profiles, setProfile, me } = useStore();
  // The table's header colour is the viewer's own choice (kept in their profile), per table kind (day or week).
  const headerColor = sheetColorOf(profiles[me], kind);
  const monday = weekStart(date);
  const sheetRef = useRef(null);
  const [copying, setCopying] = useState(false);
  const record = weekly[`${personId}|${monday}`];
  const rows =
    kind === 'day'
      ? dayRowsWithAssigned(tasks, daily, personId, date, { projects })
      : weekRows(personId, monday, daily, record?.entries ?? [], record?.overrides, weekAssignedRows(tasks, daily, personId, monday, { projects }));
  const override = (row, patch) => {
    const key = rowKey(row);
    saveWeekly(personId, monday, {
      overrides: { ...record?.overrides, [key]: { ...record?.overrides?.[key], qty: row.qty, doneQty: row.doneQty, ...patch } },
    });
  };
  const withTarget = rows.filter((r) => rowTarget(r) > 0);
  const projectIds = [...new Set(rows.map((r) => r.projectId))];
  const sum = (list) => list.reduce((t, r) => ({ t: t.t + rowTarget(r), d: t.d + Math.min(rowDone(r), rowTarget(r)) }), { t: 0, d: 0 });
  const all = sum(withTarget);
  const editButton = (
    <button
      type="button"
      className="focus-ring flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-accent-ink hover:bg-surface-2"
      onClick={() => (kind === 'day' ? window.dispatchEvent(new Event(EDIT_DAY_TASKS)) : window.dispatchEvent(new Event(EDIT_WEEK)))}
    >
      <Pencil size={11} /> Edit
    </button>
  );
  if (!rows.length) {
    return (
      <div
        className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted"
        data-progress={kind}
      >
        {kind === 'day' ? 'No daily tasks entered yet.' : 'Nothing yet this week. Tasks from your daily updates add up here.'}
        {editButton}
      </div>
    );
  }
  const dateLabel = kind === 'day' ? formatDayMonth(date) : `${formatDayMonth(monday)} to ${formatDayMonth(addDays(monday, 4))}`;
  const headCell = 'border border-white/20 px-3 py-2 text-center text-xs font-bold';
  return (
    <div className="space-y-3 rounded-xl border border-line p-3" data-progress={kind}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{kind === 'day' ? 'Today' : 'This week'}</span>
        <b className="tabular-nums" data-testid={`${kind}-progress`}>
          {all.d}/{all.t}
        </b>
        <span className="flex-1">
          <ProgressBar value={all.d} max={all.t} tone={toneOf(percentOf(all.d, all.t))} />
        </span>
        <b className="w-10 text-right text-sm tabular-nums">{percentOf(all.d, all.t)}%</b>
        {!editable && (
          <label
            className="flex cursor-pointer items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted hover:bg-surface-2"
            title="Table header colour"
          >
            <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: headerColor }} />
            Header
            <input
              type="color"
              aria-label="Table header colour"
              className="sr-only"
              value={headerColor}
              onChange={(e) => setProfile(me, { sheetColors: { ...profiles[me]?.sheetColors, [kind]: e.target.value } })}
            />
          </label>
        )}
        {!editable && (
          <button
            type="button"
            data-testid="copy-sheet-image"
            title="Copy the whole table as one picture (every row and column)"
            disabled={copying}
            className="focus-ring flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted hover:bg-surface-2 disabled:opacity-60"
            onClick={async () => {
              if (!sheetRef.current) return;
              setCopying(true);
              try {
                const how = await copyElementAsImage(sheetRef.current, `${kind === 'day' ? 'day' : 'week'}-update.png`);
                toast({ title: how === 'copied' ? 'Table copied as an image' : 'Table saved as an image', tone: 'success' });
              } catch (err) {
                toast({ title: err.message || 'Could not copy the table', tone: 'info' });
              } finally {
                setCopying(false);
              }
            }}
          >
            <ImageIcon size={12} /> {copying ? 'Copying...' : 'Copy as image'}
          </button>
        )}
        {editButton}
      </div>
      {kind === 'week' && <WeekDays personId={personId} monday={monday} />}
      {!editable && (
        <div className="overflow-x-auto" data-testid={`sheet-${kind}`} ref={sheetRef}>
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="text-white" style={{ background: headerColor }}>
                <th className={headCell}>Date</th>
                <th className={headCell}>Project</th>
                <th className={cx(headCell, 'w-[32%]')}>Targets</th>
                <th className={headCell}>Estimated time</th>
                <th className={cx(headCell, 'w-[32%]')}>Targets achieved</th>
                <th className={headCell}>Actual time taken</th>
              </tr>
            </thead>
            <tbody>
              {projectIds.flatMap((pid, g) => {
                const project = projects.find((p) => p.id === pid);
                const mine = rows.filter((r) => r.projectId === pid);
                const stripe = g % 2 ? 'bg-surface-2/50' : 'bg-surface';
                return mine.map((r, i) => {
                  const name = entryName(r, project);
                  const achieved = sheetAchievedText(r, name, rowDone(r));
                  const first = i === 0;
                  const cell = cx(
                    'border-x border-line px-3 py-2 align-middle',
                    first ? (g ? 'border-t-[3px]' : 'border-t border-t-line') : 'border-t border-t-line/60',
                  );
                  return (
                    <tr
                      key={r.id}
                      className={stripe}
                      data-sheet-project={first ? pid : undefined}
                      style={first && g ? { borderTop: `3px solid ${headerColor}99` } : undefined}
                    >
                      {g === 0 && first && (
                        <td
                          rowSpan={rows.length}
                          className="whitespace-nowrap border border-line bg-surface px-3 py-2 text-center align-middle font-medium"
                        >
                          {kind === 'day' ? (
                            <DayMover personId={personId} date={date} testId="sheet-date-move">
                              {dateLabel}
                            </DayMover>
                          ) : (
                            dateLabel
                          )}
                          {kind === 'day' && <DayMarker personId={personId} date={date} className="ml-1" />}
                        </td>
                      )}
                      {first && (
                        <td
                          rowSpan={mine.length}
                          className={cx(cell, 'text-center font-semibold')}
                          style={{ borderLeft: `4px solid ${project ? projectColor(projects, pid) : '#64748B'}` }}
                        >
                          {projectLabel(pid, projects)}
                        </td>
                      )}
                      <td className={cell}>{sheetTargetText(r, name)}</td>
                      <td className={cx(cell, 'whitespace-nowrap text-center tabular-nums')}>{r.estMin ? formatMinutes(r.estMin) : '·'}</td>
                      <td className={cell}>{achieved || <span className="text-xs text-muted">Not updated yet</span>}</td>
                      <td className={cx(cell, 'whitespace-nowrap text-center tabular-nums')}>{r.actualMin ? formatMinutes(r.actualMin) : '·'}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}
      {editable &&
        projectIds.map((pid) => {
          const project = projects.find((p) => p.id === pid);
          const mine = rows.filter((r) => r.projectId === pid);
          const label = projectLabel(pid, projects);
          const projectTotal = sum(mine.filter((r) => rowTarget(r) > 0));
          return (
            <div
              key={pid}
              className="rounded-lg bg-surface-2/40 px-3 py-2"
              style={{ borderLeft: `4px solid ${project ? projectColor(projects, pid) : '#64748B'}` }}
            >
              <p className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold">
                <span>{label}</span>
                <span className="text-xs font-semibold tabular-nums text-muted">
                  {projectTotal.t
                    ? `${projectTotal.d}/${projectTotal.t} · ${percentOf(projectTotal.d, projectTotal.t)}%`
                    : `${mine.length} task${mine.length === 1 ? '' : 's'}`}
                </span>
              </p>
              <ul className="divide-y divide-line/70">
                {mine.map((r) => {
                  const done = rowDone(r);
                  const target = rowTarget(r);
                  const kindOf = r.kind ?? 'number';
                  const name = entryName(r, project);
                  const targetText = kindOf === 'number' ? r.desc : r.targetText || r.desc;
                  const tone =
                    r.status === 'Completed' ? 'mint' : r.status === 'Blocked' ? 'coral' : r.status === 'In progress' ? 'sky' : 'grey';
                  return (
                    <li key={r.id} className="py-2 text-sm" data-progress-row={r.id}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="min-w-[10rem] flex-1 font-medium">{name}</span>
                        {kind === 'week' && personId === me && (record?.entries ?? []).some((e) => rowKey(e) === rowKey(r)) && (
                          <DateMenu
                            personId={personId}
                            from={monday}
                            title="Move to another week"
                            hint="Moves the rows you added to this week to the week of the day you pick."
                            testId="move-week-row-popover"
                            onPick={(to) =>
                              guarded(() => {
                                const n = useStore.getState().moveWeekRows(personId, monday, to, (e) => rowKey(e) === rowKey(r));
                                if (n) toast({ title: `Moved to the week of ${formatDayMonth(weekStart(to))}`, tone: 'success' });
                              })
                            }
                            trigger={({ onClick }) => (
                              <button aria-label="Change date" title="Move the rows added to this week to another week" data-testid="move-week-row" className="focus-ring rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-accent-ink" onClick={onClick}>
                                <CalendarDays size={13} />
                              </button>
                            )}
                          />
                        )}
                        {editable && kindOf === 'milestone' ? (
                          <select
                            aria-label={`${name} status`}
                            className="focus-ring rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs font-semibold"
                            value={r.status ?? 'Not started'}
                            onChange={(e) => override(r, { status: e.target.value })}
                          >
                            {ROW_STATUSES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        ) : editable && kindOf === 'number' ? (
                          <span className="flex items-center gap-0.5" data-edit-row={r.id}>
                            <NumberBox label={`${name} achieved`} value={r.doneQty ?? 0} onSave={(n) => override(r, { doneQty: n })} />
                            <span className="text-muted">/</span>
                            <NumberBox label={`${name} target`} value={r.qty ?? 0} onSave={(n) => override(r, { qty: n })} />
                          </span>
                        ) : kindOf === 'milestone' ? (
                          <Badge tone={tone}>{r.status ?? 'Not started'}</Badge>
                        ) : kindOf === 'number' ? (
                          <span className="flex w-full items-center gap-2 sm:w-64">
                            <b className="w-16 shrink-0 text-right tabular-nums">{target ? `${done}/${target}` : done || 0}</b>
                            <span className="flex-1">
                              <ProgressBar value={done} max={target} tone={toneOf(percentOf(done, target))} />
                            </span>
                            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
                              {target ? `${percentOf(done, target)}%` : ''}
                            </span>
                          </span>
                        ) : (
                          <Badge tone="lavender">Text</Badge>
                        )}
                      </div>
                      {kindOf === 'text' ? (
                        <div className="mt-1 grid gap-0.5 text-xs">
                          {targetText && (
                            <p>
                              <span className="font-semibold text-muted">Target: </span>
                              {targetText}
                            </p>
                          )}
                          {editable ? (
                            <TextBox label={`${name} actual`} value={r.actualText ?? ''} onSave={(text) => override(r, { actualText: text })} />
                          ) : (
                            <p>
                              <span className="font-semibold text-muted">Done: </span>
                              {r.actualText || <span className="text-muted">Not updated yet</span>}
                            </p>
                          )}
                        </div>
                      ) : targetText ? (
                        <p className="mt-0.5 text-xs text-muted">{targetText}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
    </div>
  );
}

export default EntriesProgress;
