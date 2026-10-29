// Pure domain logic: permissions, target / standard-time maths, status logic,
// reports, metrics, spotlight selection and small validators.
import {
  addDays,
  clockToMinutes,
  currentWeekStart,
  formatDayMonth,
  parseDateKey,
  recentPeriods,
  resolvePeriod,
  shiftPeriod,
  todayKey,
  toDateKey,
  weekStart,
  WEEKDAY_SHORT,
} from "./dates.js";
import { entryAsTask, entriesBetween, weeklyDone, weekRows, rowKey, dayEntries, dayAsg, plannedWeekTargets, rowDoneCount, CUSTOM_TASK } from "./entries.js";
import { weekAssignedRows } from "./assigned.js";
import {
  PEOPLE,
  TASK_TYPES,
  VARIANT_PER_UNIT,
  isLeadership,
  isAdminTier,
  roleOf,
} from "./constants.js";

import { OUTBOUND_METRICS } from "./projectTemplates.js";

export { isLeadership, isAdminTier, roleOf };

/** `Tn` - short random id. */
export const newId = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------- metrics

/** `cf` / `wV` - the default tracked numbers of a project. */
export const DEFAULT_METRICS = OUTBOUND_METRICS;

/** `Cd` - empty counts object (always spread, never mutated). */
export const EMPTY_COUNTS = {};

/** `tc` - does a metric track the given period ("week" | "month")? */
export const metricTracksPeriod = (metric, period) =>
  !metric.periods || metric.periods.includes(period);

/** `Ig` - pick default metrics by id. */
export const pickMetrics = (...ids) => DEFAULT_METRICS.filter((m) => ids.includes(m.id));

/** `On` - build a counts object of the seven standard numbers. */
export const makeCounts = (messages, responses, l2, calls, interest, meetings, decks) => ({
  messages,
  responses,
  l2,
  calls,
  interest,
  meetings,
  decks,
});

// ------------------------------------------------------ roles / permissions

/** `ea` - only the project's owner, its admins and the main admins (managers, founders) may manage a project. */
export function canManageProject(project, personId) {
  return project
    ? project.pmId === personId ||
        (project.admins ?? []).includes(personId) ||
        isLeadership(roleOf(personId)) // managers and founders; a project manager only manages their own projects
    : false;
}

/** `vV` */
export const isProjectOwner = (project, personId) => project?.pmId === personId;

/** `xV` */
export const isProjectAdmin = (project, personId) => !!project?.admins?.includes(personId);

/** `nc` - ids of everyone who is a resource / PM (not manager or founder). */
export const TRACKED_PEOPLE_IDS = [];

/** `RV` - static display name from the people table (id when unknown). */
export const staticPersonName = (id) => PEOPLE.find((p) => p.id === id)?.name ?? id;

/** `iU` - active projects a person belongs to (team, owner or admin). */
export const activeProjectsFor = (projects, personId) =>
  projects.filter(
    (p) =>
      p.status === "active" &&
      (p.teamIds.includes(personId) || p.pmId === personId || (p.admins ?? []).includes(personId)),
  );

/**
 * `gb` - mark today's "finalized" timestamp on every active project of
 * `personId` for `day`, but only once all other team members sent their EOD
 * (when `daily` is supplied).
 */
export function finalizeProjectsForDay(projects, personId, day, at, daily, profiles) {
  const mine = new Set(activeProjectsFor(projects, personId).map((p) => p.id));
  const offToday = (id) => profiles?.[id]?.leaves?.some((l) => l.date === day && (l.kind === "full" || l.kind === "holiday")); // a holiday / full-day leave is not waited for
  const everyoneSent = (project) =>
    !daily ||
    project.teamIds.every((id) => id === personId || !!daily[`${id}|${day}`]?.eodAt || offToday(id));
  return projects.map((p) =>
    mine.has(p.id) && !p.finalized?.[day] && everyoneSent(p)
      ? { ...p, finalized: { ...p.finalized, [day]: at } }
      : p,
  );
}

// ---------------------------------------------------------- project planning

/** Mon-Fri chunks from `from` to `to` (a weekend is skipped; the first and last chunk may be shorter). */
export function defaultWeeks(from, to) {
  const out = [];
  let cur = from;
  while (cur <= to && out.length < 120) {
    const dow = parseDateKey(cur).getDay();
    if (dow === 0 || dow === 6) {
      cur = addDays(cur, dow === 6 ? 2 : 1);
      continue;
    }
    const friday = addDays(cur, 5 - dow);
    out.push({ start: cur, end: friday > to ? to : friday });
    cur = addDays(friday, 3);
  }
  return out;
}

/** `ea` - first day of the project's week that contains `date`: one of its own custom weeks, else the Mon-Fri week counted
 *  from the start date. Dates outside any week (a weekend, before the start) fall back to the Monday of that week. */
export function projectWeekStart(project, date) {
  const custom = project?.customWeeks?.find((w) => w.start <= date && date <= w.end);
  if (custom) return custom.start;
  if (project?.startDate && date >= project.startDate) {
    const end = project.endDate && project.endDate >= date ? project.endDate : date;
    const hit = defaultWeeks(project.startDate, end).find((w) => w.start <= date && date <= w.end);
    if (hit) return hit.start;
  }
  return weekStart(date);
}

/** `yf` - weekly target for the week containing `date`: the saved plan, else the default plus what the team planned in
 *  "Weekly targets by project" (pass `weekly`, the store's weekly records, to include that). Plans saved before weeks started on
 *  the project's start date are still found under their Monday. */
export function weekTargetFor(project, date, weekly) {
  const start = projectWeekStart(project, date);
  const saved = project.weekPlans?.[start] ?? project.weekPlans?.[weekStart(date)];
  if (saved) return saved;
  if (!weekly) return project.weekTarget;
  const planned = plannedWeekTargets(project, weekly, start);
  return Object.keys(planned).length ? { ...(project.weekTarget ?? {}), ...planned } : project.weekTarget;
}

/** The plan saved for the week containing `date`, if there is one (under the project's week start, or the Monday older plans used). */
export const savedWeekPlan = (project, date) =>
  project.weekPlans?.[projectWeekStart(project, date)] ?? project.weekPlans?.[weekStart(date)];

/** `bV` - Mon-Fri status (finalized or not) of a week. */
export function weekDayStatus(project, week = currentWeekStart(0)) {
  const monday = weekStart(week);
  return [0, 1, 2, 3, 4].map((offset) => {
    const date = addDays(monday, offset);
    const d = new Date(date + "T00:00:00");
    return {
      date,
      label: `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()}`,
      finalized: !!project.finalized?.[date],
      at: project.finalized?.[date],
    };
  });
}

/** `qw` - the project's weeks: the ones its managers set (custom weeks), else Mon-Fri weeks from the start date. With an end
 *  date the default runs to the end; without one, `weeksAhead` weeks past today (or past the start, if that is still ahead). */
export function projectWeeks(project, weeksAhead = 4) {
  const today = todayKey(0);
  const label = (n, w) => `Week ${n} · ${formatDayMonth(w.start)} to ${formatDayMonth(w.end)}`;
  if (project.customWeeks?.length)
    return [...project.customWeeks]
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((w, i) => ({ n: i + 1, start: w.start, end: w.end, label: label(i + 1, w), plannedAhead: w.start > today }));
  if (!project.startDate) return [];
  const last =
    project.endDate && project.endDate >= project.startDate
      ? project.endDate
      : addDays(today > project.startDate ? today : project.startDate, weeksAhead * 7);
  return defaultWeeks(project.startDate, last).map((w, i) => ({
    n: i + 1,
    start: w.start,
    end: w.end,
    label: label(i + 1, w),
    plannedAhead: w.start > today,
  }));
}

/** `kV` - roll a project's week / month counters over when a new week / month began. */
export function rollProjectPeriods(project) {
  const thisWeek = currentWeekStart(0);
  const thisMonth = todayKey(0).slice(0, 7);
  let p = project;
  if (p.weekOf) {
    if (p.weekOf !== thisWeek) {
      p = {
        ...p,
        pastWeeks: [
          { start: p.weekOf, counts: p.week },
          ...p.pastWeeks.filter((w) => w.start !== p.weekOf),
        ],
        week: {},
        weekOf: thisWeek,
      };
    }
  } else {
    p = { ...p, weekOf: thisWeek };
  }
  if (p.monthOf) {
    if (p.monthOf !== thisMonth) {
      p = {
        ...p,
        pastMonths: [
          { month: p.monthOf, counts: p.month },
          ...p.pastMonths.filter((m) => m.month !== p.monthOf),
        ],
        month: {},
        monthOf: thisMonth,
      };
    }
  } else {
    p = { ...p, monthOf: thisMonth };
  }
  return p;
}

// ------------------------------------------------------- standard time maths

/** `Rw` - default standard minutes per unit for prospect / l1 / l2. */
export const DEFAULT_STANDARDS = { prospect: 2, l1: 2, l2: 1.5 };

/** `SV` - multiplier applied to a project's l1 standard per variant. */
export const VARIANT_FACTORS = {
  Personalised: 1,
  "Semi-personalised": 2 / 3,
  Templated: 0.5,
};

/**
 * `$h` - standard minutes for `qty` units of a built-in task type.
 * @param {string} typeId @param {number} qty @param {string} [variant]
 * @param {{prospect,l1,l2}} [standards] project overrides
 */
export function standardMinutes(typeId, qty, variant, standards) {
  const type = TASK_TYPES.find((t) => t.id === typeId);
  if (!type) return 60;
  let perUnit = variant ? (VARIANT_PER_UNIT[variant] ?? type.perUnit) : type.perUnit;
  if (standards) {
    if (typeId === "prospect") perUnit = standards.prospect;
    if (typeId === "l2") perUnit = standards.l2;
    if (typeId === "l1") perUnit = standards.l1 * (VARIANT_FACTORS[variant ?? "Personalised"] ?? 1);
  }
  return Math.max(1, Math.round(perUnit * qty));
}

/** `La` - find a project's custom standard by id or (case-insensitive) name. */
export function findCustomStandard(project, idOrName) {
  if (!project || !idOrName) return undefined;
  const needle = idOrName.trim().toLowerCase();
  return (project.customStandards ?? []).find(
    (c) => c.id === idOrName || c.name.trim().toLowerCase() === needle,
  );
}

/**
 * `ss` - standard minutes for a task honouring the project's overrides and
 * custom standards. Returns null for an unknown custom task.
 */
export function computeStandardMinutes(project, typeId, qty, variant, customRef) {
  if (typeId === "custom" || !TASK_TYPES.some((t) => t.id === typeId)) {
    const custom = findCustomStandard(project, customRef ?? (typeId === "custom" ? undefined : typeId));
    return custom ? Math.max(1, Math.round(custom.minutes * qty)) : null;
  }
  const perUnit = project?.typeMinutes?.[typeId];
  if (perUnit && !["prospect", "l1", "l2"].includes(typeId)) return Math.max(1, Math.round(perUnit * qty));
  return standardMinutes(
    typeId,
    qty,
    variant,
    project?.standards ? { ...DEFAULT_STANDARDS, ...project.standards } : undefined,
  );
}

/** `g3` - the standard task types a project uses (all except those it removed via `typesOff`). */
export const projectTaskTypes = (project) =>
  TASK_TYPES.filter((t) => !project?.typesOff?.includes(t.id));

/** `ff` - default task title, e.g. "30 personalised 1st level messages". */
export function defaultTaskTitle(typeId, qty, variant) {
  const type = TASK_TYPES.find((t) => t.id === typeId);
  return type
    ? `${qty} ${variant ? variant.toLowerCase() + " " : ""}${type.name.toLowerCase()}`
    : `${qty} items`;
}

// ------------------------------------------------------------ task status

/** `rc` - submitted for review or approved. */
export const isSubmitted = (task) => task.status === "done" || task.status === "in_review";

/**
 * The day a submitted task's work counts for (Tasks done, time worked, on time): the day it was sent in, never before the day
 * it was assigned for. A task carried over from an earlier day and finished today counts today; an open or never-sent task
 * stays on its own day.
 */
export function workDate(task) {
  if (!isSubmitted(task) || !task.submittedAt) return task.date;
  const at = new Date(task.submittedAt);
  if (Number.isNaN(at.getTime())) return task.date;
  const day = toDateKey(at);
  return day > task.date ? day : task.date;
}

/** Work counts as on time when it took no more than the target plus 10% (a few minutes over a long task is not late). */
export const ON_TIME_GRACE = 1.1;
export const withinTarget = (actual, target) => actual <= target * ON_TIME_GRACE;

/** `LV` - true/false when within target time, null when not measurable. */
export function wasOnTime(task) {
  return !isSubmitted(task) || !task.minutes || !task.doneQty || !task.qty
    ? null
    : withinTarget(task.minutes, task.targetMinutes * (task.doneQty / task.qty));
}

/** `PR` - on-time summary {onTime,total,pct} for a list of tasks (null if none measurable). */
export const onTimeSummary = (tasks) => {
  const measurable = tasks.filter(
    (t) => (t.status === "done" || t.status === "in_review") && t.minutes && t.doneQty && t.qty,
  );
  if (!measurable.length) return null;
  const onTime = measurable.filter((t) => withinTarget(t.minutes, t.targetMinutes * (t.doneQty / t.qty))).length;
  return {
    onTime,
    total: measurable.length,
    pct: Math.round((onTime / measurable.length) * 100),
  };
};

/** `cU` - minutes saved (positive) or overrun (negative) vs target; null if unknown. */
export const minutesSaved = (task) =>
  task.minutes && task.doneQty && task.qty
    ? Math.round(task.targetMinutes * (task.doneQty / task.qty) - task.minutes)
    : null;

/** `dU` - which project metrics a task type feeds. */
export const TASK_TYPE_METRICS = {
  l1: ["messages"],
  l2: ["messages", "l2"],
  followup: ["messages"],
  whatsapp: ["messages"],
  email: ["messages"],
  deck: ["decks"],
};

// -------------------------------------------------------------- difficulty

/** `FV` */
export const DIFFICULTY_LABELS = {
  easy: "Easy",
  standard: "Standard",
  challenging: "Challenging",
};

/** `Jl` - +-10 percent band around the standard counts as "standard". */
export const DIFFICULTY_THRESHOLD_PCT = 10;

/** `Lw` - classify target vs standard minutes. */
export function difficultyLevel(targetMinutes, standardMins) {
  if (!standardMins || !(standardMins > 0) || !(targetMinutes > 0)) {
    return { level: "standard", pct: 0 };
  }
  const pct = Math.round(((targetMinutes - standardMins) / standardMins) * 100);
  return {
    level:
      pct > DIFFICULTY_THRESHOLD_PCT
        ? "easy"
        : pct < -DIFFICULTY_THRESHOLD_PCT
          ? "challenging"
          : "standard",
    pct,
  };
}

/** `BV` */
export const taskDifficulty = (task) =>
  difficultyLevel(task.targetMinutes, task.standardMinutes ?? task.targetMinutes);

/** `gR` - counts and percentages of easy/standard/challenging for tasks. */
export const difficultySummary = (tasks) => {
  const counts = { easy: 0, standard: 0, challenging: 0 };
  tasks.forEach((t) => {
    counts[taskDifficulty(t).level]++;
  });
  const total = tasks.length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  return {
    ...counts,
    total,
    pct: {
      easy: pct(counts.easy),
      standard: pct(counts.standard),
      challenging: pct(counts.challenging),
    },
  };
};

/** `yR` - filter tasks by {assignedBy, assigneeId, projectId, from, to}. */
export const filterTasks = (tasks, f) =>
  tasks.filter(
    (t) =>
      (!f.assignedBy || t.assignedById === f.assignedBy) &&
      (!f.assigneeId || t.assigneeId === f.assigneeId) &&
      (!f.projectId || t.projectId === f.projectId) &&
      (!f.from || t.date >= f.from) &&
      (!f.to || t.date <= f.to),
  );

/** `zV` - difficulty summary of a state's (filtered) tasks. */
export function difficultyForState(state, filter = {}) {
  return difficultySummary(filterTasks(state.tasks, filter));
}

/** `vR` - difficulty summary per assigner, busiest first. */
export function difficultyByAssigner(state, filter = {}) {
  const byAssigner = new Map();
  filterTasks(state.tasks, filter).forEach((t) =>
    byAssigner.set(t.assignedById, [...(byAssigner.get(t.assignedById) ?? []), t]),
  );
  return [...byAssigner.entries()]
    .map(([assignerId, list]) => ({ assignerId, ...difficultySummary(list) }))
    .sort((a, b) => b.total - a.total);
}

// ------------------------------------------------- target vs actual reports

/** `Fw` - grouping key / label / unit / sort order for a task in reports. */
export function taskBreakdownKey(task) {
  const index = TASK_TYPES.findIndex((t) => t.id === task.typeId);
  const type = TASK_TYPES[index];
  if (!type) {
    const name =
      task.customName?.trim() || task.title.replace(/^\d+\s*/, "").trim() || "Custom task";
    return {
      key: `custom:${name.toLowerCase()}`,
      label: name.charAt(0).toUpperCase() + name.slice(1),
      unit: task.unit,
      order: 1e3,
    };
  }
  if (type.variants) {
    const variant =
      task.variant && type.variants.includes(task.variant) ? task.variant : type.variants[0];
    return {
      key: `${type.id}:${variant}`,
      label: `${type.name} (${variant.toLowerCase()})`,
      unit: type.unit,
      order: index * 10 + type.variants.indexOf(variant),
    };
  }
  return { key: type.id, label: type.name, unit: type.unit, order: index * 10 };
}

/** `xR` - percentage helper (100 when target is 0 but actual > 0). */
export const percent = (actual, target) =>
  target > 0 ? Math.round((actual / target) * 100) : actual > 0 ? 100 : 0;

/**
 * `bR` - per task-type target (qty) vs actual (doneQty of submitted tasks)
 * rows for an assignee (or everyone) between two dates.
 *
 * With `opts.daily` (the day records) the rows people logged in "Daily update" count too, and with `opts.weeklyEntries`
 * (that week's "Weekly targets by project" rows) the week's own targets and achieved numbers do. Where assigned tasks and
 * logged rows cover the same person, day, project and kind of work the larger one is used, never the sum.
 */
export function targetVsActualRows(tasks, assigneeId, from, to, opts = {}) {
  const buckets = new Map();
  const bucket = (day, projectId, k) => {
    const id = `${day}|${projectId}|${k.key}`;
    let b = buckets.get(id);
    if (!b) {
      b = { k, projectId, tasksT: 0, tasksA: 0, rowsT: 0, rowsA: 0 };
      buckets.set(id, b);
    }
    return b;
  };
  tasks.forEach((t) => {
    if (
      (assigneeId && t.assigneeId !== assigneeId) ||
      (opts.projectId && t.projectId !== opts.projectId) ||
      (opts.includeHistoric === false && t.historic)
    )
      return;
    // the target belongs to the day the task was assigned for, the finished work to the day it was sent in
    if (t.date >= from && t.date <= to) bucket(t.date, t.projectId, taskBreakdownKey(t)).tasksT += t.qty;
    const done = workDate(t);
    if (isSubmitted(t) && done >= from && done <= to) bucket(done, t.projectId, taskBreakdownKey(t)).tasksA += t.doneQty ?? 0;
  });
  const projectOf = (id) => opts.projects?.find((p) => p.id === id);
  if (opts.daily && assigneeId) {
    // a done number typed on an assigned row counts like a logged row (the larger of it and the approved number is used)
    for (let d = from; d <= to; d = addDays(d, 1)) {
      Object.values(dayAsg(opts.daily, assigneeId, d)).forEach((v) => {
        if (!(v?.doneQty > 0) || (opts.projectId && v.projectId !== opts.projectId)) return;
        bucket(d, v.projectId, taskBreakdownKey(entryAsTask(v, projectOf(v.projectId)))).rowsA += v.doneQty;
      });
    }
    entriesBetween(opts.daily, assigneeId, from, to).forEach(({ date, entry }) => {
      if (opts.projectId && entry.projectId !== opts.projectId) return;
      const b = bucket(date, entry.projectId, taskBreakdownKey(entryAsTask(entry, projectOf(entry.projectId))));
      b.rowsT += entry.qty ?? 0;
      b.rowsA += entry.doneQty ?? 0;
    });
  }
  // day by day the larger of tasks and logged rows, then added up per project and kind of work
  const perKind = new Map();
  buckets.forEach((b) => {
    const id = `${b.projectId}|${b.k.key}`;
    const cur = perKind.get(id) ?? { k: b.k, target: 0, actual: 0 };
    cur.target += Math.max(b.tasksT, b.rowsT);
    cur.actual += Math.max(b.tasksA, b.rowsA);
    perKind.set(id, cur);
  });
  if (opts.weeklyEntries && assigneeId) {
    const monday = weekStart(from);
    opts.weeklyEntries.forEach((entry) => {
      if (opts.projectId && entry.projectId !== opts.projectId) return;
      const k = taskBreakdownKey(entryAsTask(entry, projectOf(entry.projectId)));
      const id = `${entry.projectId}|${k.key}`;
      const cur = perKind.get(id) ?? { k, target: 0, actual: 0 };
      cur.target = Math.max(cur.target, entry.qty ?? 0);
      cur.actual = Math.max(cur.actual, weeklyDone(entry, assigneeId, monday, opts.daily ?? {}) ?? 0);
      perKind.set(id, cur);
    });
  }
  // numbers typed over a row in the Weekly update table (its target and achieved) replace what was added up for that row
  if (opts.weeklyOverrides && assigneeId && Object.keys(opts.weeklyOverrides).length) {
    const monday = weekStart(from);
    const assignedRows = weekAssignedRows(tasks, opts.daily ?? {}, assigneeId, monday, { projects: opts.projects });
    const base = weekRows(assigneeId, monday, opts.daily ?? {}, opts.weeklyEntries ?? [], {}, assignedRows);
    const cellOf = (row) => `${row.projectId}|${taskBreakdownKey(entryAsTask(row, projectOf(row.projectId))).key}`;
    const rowsPerCell = new Map();
    base.forEach((row) => rowsPerCell.set(cellOf(row), (rowsPerCell.get(cellOf(row)) ?? 0) + 1));
    base.forEach((row) => {
      const typed = opts.weeklyOverrides[rowKey(row)];
      const cur = typed && perKind.get(cellOf(row));
      if (!cur) return;
      const alone = rowsPerCell.get(cellOf(row)) === 1; // the typed number is then the whole figure; with several rows it moves it by the difference
      const qty = typed.hidden ? 0 : typed.qty; // a row removed from the week counts for nothing
      const doneQty = typed.hidden ? 0 : typed.doneQty;
      if (qty != null) cur.target = Math.max(0, alone ? qty : cur.target + qty - (row.qty ?? 0));
      if (doneQty != null) cur.actual = Math.max(0, alone ? doneQty : cur.actual + doneQty - (row.doneQty ?? 0));
    });
  }
  const rows = new Map();
  perKind.forEach(({ k, target, actual }) => {
    const row = rows.get(k.key) ?? { key: k.key, label: k.label, unit: k.unit, target: 0, actual: 0, pct: 0, order: k.order };
    row.target += target;
    row.actual += actual;
    rows.set(k.key, row);
  });
  return [...rows.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map(({ order, ...rest }) => ({ ...rest, pct: percent(rest.actual, rest.target) }));
}

/** `wR` - snapshot {byType, at} from task rows plus custom target / actual rows. */
export function buildSnapshot(rows, customTargets = [], customActuals = [], at = new Date().toISOString()) {
  const byType = {};
  rows.forEach((r) => {
    byType[r.key] = { label: r.label, unit: r.unit, target: r.target, actual: r.actual };
  });
  const add = (row, field) => {
    const label = row.label.trim();
    if (!label) return;
    const key = `row:${label.toLowerCase()}`;
    const entry = byType[key] ?? { label, unit: "", target: 0, actual: 0 };
    entry[field] += Number(row.qty) || 0;
    byType[key] = entry;
  };
  customTargets.forEach((r) => add(r, "target"));
  customActuals.forEach((r) => add(r, "actual"));
  return { byType, at };
}

/** `Ih` - end-of-day snapshot for one person and day. */
export function dailySnapshot(tasks, personId, day, daily, at, ctx = {}) {
  return buildSnapshot(
    targetVsActualRows(tasks, personId, day, day, { daily: { [`${personId}|${day}`]: daily }, projects: ctx.projects }),
    daily.sodCustom ?? [],
    daily.eodCustom ?? [],
    at,
  );
}

/** `Bw` - end-of-week snapshot for one person and week. */
export function weeklySnapshot(tasks, personId, week, weekly, at, ctx = {}) {
  const monday = weekStart(week);
  return buildSnapshot(
    targetVsActualRows(tasks, personId, monday, addDays(monday, 6), { daily: ctx.daily, projects: ctx.projects, weeklyEntries: weekly.entries, weeklyOverrides: weekly.overrides }),
    weekly.targetsCustom ?? [],
    weekly.eowCustom ?? [],
    at,
  );
}

/** `Ho` - snapshot -> array of rows {key,label,unit,target,actual,pct}. */
export const snapshotRows = (snapshot) =>
  Object.entries(snapshot.byType).map(([key, v]) => ({
    key,
    ...v,
    pct: percent(v.actual, v.target),
  }));

/** `jR` - hide actuals (before the update was sent). */
export const blankActuals = (rows) => rows.map((r) => ({ ...r, actual: null, pct: null }));

/** `qV` - daily target/actual report for a person. */
export function dailyReport(state, personId, day) {
  const daily = state.daily[`${personId}|${day}`];
  const info = {
    targetsSet: !!daily?.sodAt,
    targetsAt: daily?.sodAt,
    sent: !!daily?.eodAt,
    sentAt: daily?.eodAt,
  };
  if (daily?.eodSnapshot) return { ...info, rows: snapshotRows(daily.eodSnapshot) };
  const live = dailySnapshot(state.tasks, personId, day, daily ?? {}, undefined, { projects: state.projects });
  return { ...info, rows: daily?.eodAt ? snapshotRows(live) : blankActuals(snapshotRows(live)) };
}

/** `VV` - weekly target/actual report for a person. */
export function weeklyReport(state, personId, week) {
  const monday = weekStart(week);
  const weekly = state.weekly?.[`${personId}|${monday}`];
  const info = {
    targetsSet: !!weekly?.targetsAt,
    targetsAt: weekly?.targetsAt,
    sent: !!weekly?.eowAt,
    sentAt: weekly?.eowAt,
  };
  if (weekly?.eowSnapshot) return { ...info, rows: snapshotRows(weekly.eowSnapshot) };
  const live = weeklySnapshot(state.tasks, personId, monday, weekly ?? { targetsCustom: [], eowCustom: [] }, undefined, { daily: state.daily, projects: state.projects });
  return { ...info, rows: weekly?.eowAt ? snapshotRows(live) : blankActuals(snapshotRows(live)) };
}

/** `UV` - how many people set targets / sent EOD for a day. */
export function dailyCompletion(state, day, people = TRACKED_PEOPLE_IDS) {
  const entries = people.map((id) => state.daily[`${id}|${day}`]);
  return {
    total: people.length,
    targetsSet: entries.filter((e) => e?.sodAt).length,
    eodSent: entries.filter((e) => e?.eodAt).length,
  };
}

/** `WV` - how many people set targets / sent EOW for a week. */
export function weeklyCompletion(state, week, people = TRACKED_PEOPLE_IDS) {
  const monday = weekStart(week);
  const entries = people.map((id) => state.weekly?.[`${id}|${monday}`]);
  return {
    total: people.length,
    targetsSet: entries.filter((e) => e?.targetsAt).length,
    eowSent: entries.filter((e) => e?.eowAt).length,
  };
}

/** `HV` - which team members of a project have / have not sent EOD. */
export function projectEodStatus(project, state, day = todayKey(0)) {
  const sent = project.teamIds.filter((id) => state.daily[`${id}|${day}`]?.eodAt);
  const off = (id) => state.profiles?.[id]?.leaves?.some((l) => l.date === day && (l.kind === "full" || l.kind === "holiday")); // not waited for
  return { sent, pending: project.teamIds.filter((id) => !sent.includes(id) && !off(id)) };
}

/**
 * A person's day record as the hours maths sees it: the saved record, its table rows, and for every project the part of the
 * submitted tasks' time (tasks sent in that day) that the typed time does not reach yet, so a project's day is the larger of the two.
 * This is the same record the "Tasks update" tables build (lib/assigned.js), kept here so metrics and pages cannot drift apart.
 */
export function dayRecordWithTaskTime(tasks, daily, personId, date) {
  const record = daily?.[`${personId}|${date}`];
  const rows = dayEntries(daily, personId, date);
  const taskMin = new Map();
  (tasks ?? []).forEach((t) => {
    if (t.assigneeId === personId && t.minutes > 0 && isSubmitted(t) && workDate(t) === date) taskMin.set(t.projectId, (taskMin.get(t.projectId) ?? 0) + t.minutes);
  });
  const typed = new Map();
  rows.forEach((e) => {
    if (e.actualMin > 0) typed.set(e.projectId, (typed.get(e.projectId) ?? 0) + e.actualMin);
  });
  const asgRows = Object.entries(dayAsg(daily, personId, date))
    .filter(([, v]) => v?.projectId && v.actualMin > 0)
    .map(([id, v]) => ({ id, projectId: v.projectId, actualMin: v.actualMin })); // time typed on assigned rows
  asgRows.forEach((e) => typed.set(e.projectId, (typed.get(e.projectId) ?? 0) + e.actualMin));
  const extra = [...asgRows];
  taskMin.forEach((m, projectId) => {
    const more = m - (typed.get(projectId) ?? 0);
    if (more > 0) extra.push({ id: `task|${projectId}`, projectId, actualMin: more });
  });
  return record || extra.length ? { ...record, entries: [...rows, ...extra] } : record;
}

/** The single source of truth for "hours worked" on a day: plan blocks, table time and task time, the larger per project. */
export const dayWorkedMinutes = (tasks, daily, personId, date) => dayHours(dayRecordWithTaskTime(tasks, daily, personId, date)).actualMin;

/** Minutes worked on a day (see dayWorkedMinutes); extra hours are separate. */
export function dayLoggedMinutes(tasks, daily, personId, date) {
  return dayWorkedMinutes(tasks, daily, personId, date);
}

/** A plan block's project: a custom block's own project first. Empty for work not linked to a project. */
const blockProject = (block) => (block.custom ? (block.custom.projectId ?? block.projectId) : block.projectId) || "";

/** Planned and actual minutes of a plan block (a sent day counts the planned time when no actual was typed). */
const blockTimes = (daily, block) => {
  const planned = Math.max(0, clockToMinutes(block.end) - clockToMinutes(block.start));
  return { planned, actual: block.actualMinutes ?? (daily.eodAt ? planned : 0) };
};

/**
 * The time worked on a day split per project (Map projectId -> minutes; "" holds blocks that belong to no project). Actual time
 * typed into a project's day table wins over the plan blocks' actual for that project. The sum is the day's worked time.
 */
export function dayProjectMinutes(daily) {
  const out = new Map();
  if (!daily) return out;
  const byProject = new Map();
  (daily.plan ?? []).forEach((block) => {
    if (block.id === "lunch") return;
    byProject.set(blockProject(block), (byProject.get(blockProject(block)) ?? 0) + blockTimes(daily, block).actual);
  });
  const logged = new Map();
  (daily.entries ?? []).forEach((e) => {
    if (e.actualMin > 0) logged.set(e.projectId, (logged.get(e.projectId) ?? 0) + e.actualMin);
  });
  new Set([...byProject.keys(), ...logged.keys()]).forEach((pid) => {
    const m = pid && logged.has(pid) ? logged.get(pid) : (byProject.get(pid) ?? 0);
    if (m > 0) out.set(pid, m);
  });
  return out;
}

/**
 * `zw` - planned / actual / extra minutes for one daily entry. Actual time typed into a project's day table wins over the
 * time block's actual for that project (the block's own actual, or the planned time once the day is sent, is the fallback).
 */
export function dayHours(daily) {
  if (!daily) return { plannedMin: 0, actualMin: 0, extraMin: 0, sent: false };
  let planned = 0;
  (daily.plan ?? []).forEach((block) => {
    if (block.id !== "lunch") planned += blockTimes(daily, block).planned;
  });
  let actual = 0;
  dayProjectMinutes(daily).forEach((m) => (actual += m));
  const extra = (daily.extra ?? []).reduce((sum, x) => sum + (x.minutes || 0), 0);
  return { plannedMin: planned, actualMin: actual, extraMin: extra, sent: !!daily.eodAt };
}

/** True when a day's hours hold any plan, table, task or extra time (an empty weekend day stays hidden in the week lists). */
export const dayHasTime = (hours) => !!hours && (hours.plannedMin > 0 || hours.actualMin > 0 || hours.extraMin > 0);

/**
 * Plan blocks that were worked: [{ block, projectId, plannedMin, actualMin }] for every non-lunch block with actual time
 * (typed, or the planned time once the day is sent). This is the completed plan work that Tasks done and On time count.
 */
export function workedPlanBlocks(daily) {
  if (!daily) return [];
  return (daily.plan ?? [])
    .filter((b) => b.id !== "lunch")
    .map((block) => {
      const { planned, actual } = blockTimes(daily, block);
      return { block, projectId: blockProject(block), plannedMin: planned, actualMin: actual };
    })
    .filter((b) => b.actualMin > 0);
}

/**
 * `kR` - hours roll-up of a week for a person (`daily` is `state.daily`; pass `tasks` to include the time on submitted tasks, as
 * the person's own Weekly hours do). Monday to Friday always; Saturday and Sunday only when that day holds any time, so the
 * totals equal personMetrics for the whole week.
 */
export function weekHours(daily, personId, week, tasks) {
  const monday = weekStart(week);
  const days = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => {
      const date = addDays(monday, i);
      return { date, ...dayHours(dayRecordWithTaskTime(tasks, daily, personId, date)) };
    })
    .filter((d, i) => i < 5 || dayHasTime(d));
  return {
    plannedMin: days.reduce((s, d) => s + d.plannedMin, 0),
    actualMin: days.reduce((s, d) => s + d.actualMin, 0),
    extraMin: days.reduce((s, d) => s + d.extraMin, 0),
    days,
  };
}

// ------------------------------------------------- performance metrics

/** `Go` - the five spotlight metric keys. */
export const METRIC_KEYS = ["onTime", "tasks", "hours", "extra", "resubmits"];

/** `Yo` */
export const METRIC_LABELS = {
  onTime: "Tasks on time %",
  tasks: "Tasks done",
  hours: "Hours logged",
  extra: "Extra hours",
  resubmits: "Resubmits",
};

/** `Ca` */
export const METRIC_HELP = {
  onTime: "Share of timed work finished within its target time: submitted tasks, ticked-off day-table rows and worked plan blocks (actual time within the block's planned time)",
  tasks: "Work done: tasks submitted for approval or approved, ticked-off day-table rows, and - for a day and project with neither - each plan block with time worked",
  hours: "Time worked: plan blocks, day tables and submitted tasks (the larger per project), as in Weekly hours",
  extra: "Extra hours recorded in end-of-day updates",
  resubmits: "Times a task was sent again after feedback",
};

/** `ZV` - +1 higher is better, -1 lower is better, 0 neutral. */
export const METRIC_DIRECTION = { onTime: 1, tasks: 1, hours: 0, extra: 0, resubmits: -1 };

/** `Vw` - format a metric value for display. */
export function formatMetric(key, value) {
  return value == null
    ? ""
    : key === "onTime"
      ? `${value}%`
      : key === "hours" || key === "extra"
        ? `${value}h`
        : String(value);
}

/** `pb` - round to one decimal. */
export const roundOneDecimal = (n) => Math.round(n * 10) / 10;

/**
 * `pf` - metrics of one person's tasks in [from,to]. `tasks` must already be
 * that person's tasks; `daily` is `state.daily`.
 */
export function personMetrics(tasks, daily, personId, from, to) {
  let assigned = 0;
  let submitted = 0;
  let timed = 0;
  let onTimeCount = 0;
  let resubmits = 0;
  let assignedMin = 0; // estimated minutes of everything assigned, so a few big tasks weigh like many small ones
  let doneMin = 0; // estimated minutes of the part that is done
  const coveredWork = new Set(); // day, project and kind of work that submitted tasks already count
  const coveredDays = new Set(); // day and project that a done task or a ticked-off table row already counts (plan blocks then add nothing)
  const assignedDays = new Set(); // day and project that already has an assigned task (a worked plan block there is not a new assignment)
  // Work only counts as assigned once it is due: tasks of earlier days, or any task already sent in. Tasks planned for later days
  // and the day's own tasks still being worked on do not count against the person yet.
  const today = todayKey(0);
  const due = (t) => t.date < today || isSubmitted(t);
  tasks.forEach((t) => {
    if (t.date >= from && t.date <= to) {
      assignedDays.add(`${t.date}|${t.projectId}`);
      if (due(t)) {
        assigned++;
        assignedMin += t.targetMinutes ?? 0;
      }
      resubmits += t.resubmits ?? 0;
    }
    if (!isSubmitted(t)) return;
    const done = workDate(t); // finished work counts on the day it was sent in
    if (done < from || done > to) return;
    if (t.date < from || t.date > to) {
      assigned++; // assigned on an earlier day, finished in this period
      assignedMin += t.targetMinutes ?? 0;
    }
    submitted++;
    doneMin += (t.targetMinutes ?? 0) * Math.min(1, (t.doneQty ?? t.qty) / (t.qty || 1));
    coveredWork.add(`${done}|${t.projectId}|${t.typeId}`);
    coveredDays.add(`${done}|${t.projectId}`);
    const ok = wasOnTime(t);
    if (ok !== null) {
      timed++;
      if (ok) onTimeCount++;
    }
  });
  // work ticked off in the day tables counts as done too, unless a submitted task already covers that kind of work that day
  for (let d = from; d <= to; d = addDays(d, 1)) {
    dayEntries(daily, personId, d).forEach((e) => {
      if (e.task === CUSTOM_TASK ? !e.custom?.trim() : !e.task) return;
      if (coveredWork.has(`${d}|${e.projectId}|${e.task}`)) return;
      if (d < today || rowDoneCount(e) > 0) {
        assigned++;
        assignedMin += e.estMin ?? 0;
      }
      if (!(rowDoneCount(e) > 0)) return;
      submitted++;
      doneMin += e.estMin ?? 0;
      if (e.estMin > 0 && e.actualMin > 0) {
        timed++;
        if (withinTarget(e.actualMin, e.estMin)) onTimeCount++;
      }
    });
  }
  // completed plan work: for a day and project with no done task and no ticked-off table row, every plan block with actual time
  // counts as one done item, timed against its planned length (on time when the actual time fits it)
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const record = daily?.[`${personId}|${d}`];
    if (!record) continue;
    (record.entries ?? []).forEach((e) => {
      if (rowDoneCount(e) > 0) coveredDays.add(`${d}|${e.projectId}`);
    });
    workedPlanBlocks(record).forEach((b) => {
      const day = `${d}|${b.projectId}`;
      if (coveredDays.has(day)) return;
      if (!assignedDays.has(day)) {
        assigned++;
        assignedMin += b.plannedMin;
      }
      submitted++;
      doneMin += b.plannedMin;
      if (b.plannedMin > 0) {
        timed++;
        if (withinTarget(b.actualMin, b.plannedMin)) onTimeCount++;
      }
    });
  }
  // hours: the same per-day figure as the person's own Weekly hours (plan blocks, table time and task time, larger per project)
  let minutes = 0;
  let extraMinutes = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    minutes += dayWorkedMinutes(tasks, daily, personId, d);
    extraMinutes += dayHours(daily[`${personId}|${d}`]).extraMin;
  }
  return {
    onTime: timed ? Math.round((onTimeCount / timed) * 100) : null,
    tasks: submitted,
    hours: roundOneDecimal(minutes / 60),
    extra: roundOneDecimal(extraMinutes / 60),
    resubmits,
    assigned,
    assignedMin,
    doneMin,
    timed,
    onTimeCount,
  };
}

/** `Dh` - one metric over the last `count` periods: [{key,label,title,partial,value}]. */
export function metricSeries(state, personId, gran, metric, count, opts = {}) {
  const mine = state.tasks.filter((t) => t.assigneeId === personId);
  return recentPeriods(gran, count, opts.end).map((p) => ({
    key: p.key,
    label: p.label,
    title: p.title,
    partial: p.partial,
    value: personMetrics(mine, state.daily, personId, p.from, p.to)[metric],
  }));
}

/** `SR` - all metrics over the last `count` periods. */
export function metricSeriesFull(state, personId, gran, count, opts = {}) {
  const mine = state.tasks.filter((t) => t.assigneeId === personId);
  return recentPeriods(gran, count, opts.end).map((p) => ({
    key: p.key,
    label: p.label,
    title: p.title,
    partial: p.partial,
    ...personMetrics(mine, state.daily, personId, p.from, p.to),
  }));
}

/** `mb` - spotlight tag labels. */
export const SPOTLIGHT_TAGS = {
  acknowledge: "⭐ Acknowledge",
  support: "🚩 Needs support",
};

/** `Md` - quantile pick from an ascending array. */
export const percentileValue = (sorted, q) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];

/** Timed items (tasks, ticked-off table rows, worked plan blocks) a person needs in a period before an on-time share is judged. */
export const MIN_TIMED = 3;
export const NOT_ENOUGH_DATA = "Not enough data yet";

/**
 * The part of the previous period to compare a period with: all of it, or - while the period is still running - only the same
 * number of days from its start, so "vs previous" sets Mon-Wed so far against last Mon-Wed rather than a whole week.
 */
export function comparablePrevious(period, today = todayKey(0)) {
  const prev = shiftPeriod(period, -1);
  if (!period.partial || today < period.from || today > period.to) return prev;
  const elapsed = Math.round((parseDateKey(today).getTime() - parseDateKey(period.from).getTime()) / 864e5);
  const to = addDays(prev.from, elapsed);
  return to < prev.to ? { ...prev, to } : prev;
}

/**
 * `ic` - team spotlight: per-person metrics for the period vs the previous
 * one, tagged "acknowledge" / "support" where there is enough data.
 * @param {object} state store state (needs tasks + daily)
 * @param {"day"|"week"|"month"} gran
 * @param {string} [which="current"] "current" | "previous" | period key
 * @param {{people?: string[]}} [opts]
 */
export function spotlight(state, gran, which = "current", opts = {}) {
  const period = resolvePeriod(gran, which);
  const prevPeriod = comparablePrevious(period);
  const people = opts.people ?? TRACKED_PEOPLE_IDS;
  const byPerson = new Map(people.map((id) => [id, []]));
  state.tasks.forEach((t) => byPerson.get(t.assigneeId)?.push(t));
  const rows = people.map((id) => {
    const mine = byPerson.get(id) ?? [];
    const cur = personMetrics(mine, state.daily, id, period.from, period.to);
    const prev = personMetrics(mine, state.daily, id, prevPeriod.from, prevPeriod.to);
    const change = Object.fromEntries(
      METRIC_KEYS.map((k) => {
        const a = cur[k];
        const b = prev[k];
        // an on-time share is only compared when both periods have enough timed items to mean something
        if (k === "onTime" && (cur.timed < MIN_TIMED || prev.timed < MIN_TIMED)) return [k, null];
        return [k, a == null || b == null ? null : roundOneDecimal(a - b)];
      }),
    );
    return { personId: id, name: staticPersonName(id), ...cur, prev, change, tag: null };
  });
  rows.forEach((r) => {
    if (r.timed < MIN_TIMED) r.tagReason = NOT_ENOUGH_DATA;
  });
  const eligible = rows.filter((r) => r.onTime != null && r.tasks > 0 && r.timed >= MIN_TIMED);
  if (eligible.length >= 3) {
    const onTimes = eligible.map((r) => r.onTime).sort((a, b) => a - b);
    const taskCounts = eligible.map((r) => r.tasks).sort((a, b) => a - b);
    const p75OnTime = percentileValue(onTimes, 0.75);
    const p25OnTime = percentileValue(onTimes, 0.25);
    const medianOnTime = percentileValue(onTimes, 0.5);
    const p75Tasks = percentileValue(taskCounts, 0.75);
    const totalAssigned = eligible.reduce((s, r) => s + r.assigned, 0);
    const teamResubmitRate = totalAssigned
      ? eligible.reduce((s, r) => s + r.resubmits, 0) / totalAssigned
      : 0;
    const bottom = new Set(
      [...eligible]
        .sort((a, b) => a.onTime - b.onTime || a.tasks - b.tasks)
        .slice(0, Math.max(1, Math.floor(eligible.length / 4)))
        .map((r) => r.personId),
    );
    eligible.forEach((r) => {
      const rate = r.assigned ? r.resubmits / r.assigned : 0;
      const manyResubmits = r.resubmits >= 1 && rate >= 0.25 && rate >= teamResubmitRate * 2;
      const slow =
        bottom.has(r.personId) &&
        r.onTime <= p25OnTime &&
        (r.onTime < 70 || r.onTime <= medianOnTime - 10);
      if (slow || manyResubmits) {
        r.tag = "support";
        r.tagReason = [
          slow && `On time ${r.onTime}% vs team median ${medianOnTime}%`,
          manyResubmits &&
            `${r.resubmits} resubmit${r.resubmits === 1 ? "" : "s"} on ${r.assigned} task${r.assigned === 1 ? "" : "s"}`,
        ]
          .filter(Boolean)
          .join(" · ");
      } else if (r.onTime >= p75OnTime && r.tasks >= p75Tasks && r.onTime >= 70) {
        r.tag = "acknowledge";
        r.tagReason = `Among the team's best: ${r.onTime}% on time, ${r.tasks} tasks done`;
      }
    });
    if (!rows.some((r) => r.tag === "acknowledge")) {
      const score = (r) =>
        onTimes.indexOf(r.onTime) / onTimes.length + taskCounts.indexOf(r.tasks) / taskCounts.length;
      const best = eligible
        .filter((r) => r.tag === null && r.onTime >= medianOnTime)
        .sort((a, b) => score(b) - score(a))[0];
      if (best) {
        best.tag = "acknowledge";
        best.tagReason = `Best mix of on-time (${best.onTime}%) and output (${best.tasks} tasks)`;
      }
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * `JV` - minutes worked by project and by task type in a date range. Built from the same per-day, per-project worked time as
 * Hours logged (dayProjectMinutes: plan blocks, table time and task time, the larger per project), so `totalMin` equals the
 * person's Hours logged for the range. Extra hours are not part of it: they are returned apart as `extraMin` / `extraByProject`.
 * @param {object} state
 * @param {{from:string,to:string,personId?:string}} range
 */
export function timeBreakdown(state, range) {
  const people = range.personId ? [range.personId] : TRACKED_PEOPLE_IDS;
  const projectName = (id) => (id ? (state.projects?.find((p) => p.id === id)?.name ?? id) : "Not linked to a project");
  const byProject = new Map();
  const byType = new Map();
  const extraByProject = new Map();
  const add = (map, id, label, minutes) => {
    const entry = map.get(id) ?? { id, label, minutes: 0 };
    entry.minutes += minutes;
    map.set(id, entry);
  };
  const taskType = (t) => {
    const type = TASK_TYPES.find((x) => x.id === t.typeId);
    if (type) return { id: type.id, label: type.name };
    const k = taskBreakdownKey(t);
    return { id: k.key, label: k.label };
  };
  let extraMin = 0;
  people.forEach((id) => {
    const mine = state.tasks.filter((t) => t.assigneeId === id);
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      const record = dayRecordWithTaskTime(mine, state.daily, id, d);
      const minutes = dayProjectMinutes(record);
      if (minutes.size) {
        const tasksOf = (pid) => mine.filter((t) => t.projectId === pid && t.minutes > 0 && isSubmitted(t) && workDate(t) === d);
        const typedOnAssigned = Object.values(dayAsg(state.daily, id, d)).filter((v) => v?.task); // time typed on assigned rows
        const rowsOf = (pid) => [...dayEntries(state.daily, id, d), ...typedOnAssigned].filter((e) => e.projectId === pid && e.actualMin > 0);
        minutes.forEach((m, pid) => {
          add(byProject, pid || "other", projectName(pid), m);
          // the project's time came from the submitted tasks, the typed table rows or - when neither has time - the plan blocks
          const tasks = pid ? tasksOf(pid) : [];
          const rows = pid ? rowsOf(pid) : [];
          const taskMin = tasks.reduce((sum, t) => sum + t.minutes, 0);
          const rowMin = rows.reduce((sum, e) => sum + e.actualMin, 0);
          if (taskMin > 0 && taskMin >= rowMin) {
            tasks.forEach((t) => {
              const type = taskType(t);
              add(byType, type.id, type.label, t.minutes);
            });
          } else if (rowMin > 0) {
            const project = state.projects?.find((p) => p.id === pid);
            rows.forEach((e) => {
              const type = TASK_TYPES.find((x) => x.id === e.task);
              if (type) add(byType, type.id, type.name, e.actualMin);
              else {
                const k = taskBreakdownKey(entryAsTask(e, project));
                add(byType, k.key, k.label, e.actualMin);
              }
            });
          } else add(byType, "plan", "Planned work", m);
        });
      }
      (state.daily?.[`${id}|${d}`]?.extra ?? []).forEach((x) => {
        if (x.minutes > 0) {
          extraMin += x.minutes;
          add(extraByProject, x.projectId || "other", projectName(x.projectId), x.minutes);
        }
      });
    }
  });
  const sorted = (m) => [...m.values()].sort((a, b) => b.minutes - a.minutes);
  const projects = sorted(byProject);
  return {
    byProject: projects,
    byType: sorted(byType),
    totalMin: projects.reduce((s, p) => s + p.minutes, 0),
    extraMin,
    extraByProject: sorted(extraByProject),
  };
}

// ----------------------------------------------- empty day / week records

/** `mf` - blank weekly update record. */
export const emptyWeekly = () => ({
  targetsNote: "",
  targetsCustom: [],
  eowNote: "",
  eowCustom: [],
});

/** `ar` - blank daily update record. */
export const emptyDaily = () => ({
  plan: [],
  sodNote: "",
  sodTargets: {},
  eodNote: "",
  eodActuals: {},
  sodCustom: [],
  eodCustom: [],
  extra: [],
});

// -------------------------------------------------------------- misc

const ALIAS_ANIMALS = ["Otter", "Panda", "Koala", "Heron", "Falcon", "Fox", "Lynx", "Robin", "Gecko", "Badger", "Walrus", "Puffin", "Moose", "Ibis", "Newt", "Yak", "Wombat", "Quail", "Marmot", "Tapir"];
const ALIAS_ADJECTIVES = ["Calm", "Sunny", "Brave", "Quiet", "Witty", "Kind", "Swift", "Merry", "Cosmic", "Jolly", "Bold", "Gentle", "Nimble", "Plucky", "Breezy", "Cheery", "Dapper", "Zesty", "Mellow", "Spry"];

/** `tU` */
export { ALIAS_ANIMALS, ALIAS_ADJECTIVES };

/** `rU` - random anonymous chat alias, e.g. "Calm Otter". */
export function randomAlias(avoid = []) {
  const taken = new Set(avoid);
  const make = () => `${ALIAS_ADJECTIVES[Math.floor(Math.random() * ALIAS_ADJECTIVES.length)]} ${ALIAS_ANIMALS[Math.floor(Math.random() * ALIAS_ANIMALS.length)]}`;
  let alias = make();
  for (let i = 0; i < 60 && taken.has(alias); i += 1) alias = make(); // never the same name as someone else in the chat (or one of mine)
  return alias;
}

/** `OP` - validate + normalise hours per person (0-12, quarter-hour steps). */
export function validateHours(hours) {
  const out = {};
  Object.entries(hours).forEach(([id, value]) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 12)
      throw new Error("Hours per day must be between 0 and 12.");
    out[id] = Math.round(n * 4) / 4;
  });
  return out;
}

/** `Rg` - validate + normalise a list of custom standards. */
export function validateCustomStandards(list) {
  const seen = new Set();
  return list.map((c) => {
    const name = (c.name ?? "").trim();
    if (!name) throw new Error("Give every custom task a name.");
    if (seen.has(name.toLowerCase())) throw new Error(`"${name}" is listed twice.`);
    seen.add(name.toLowerCase());
    const minutes = Number(c.minutes);
    if (!Number.isFinite(minutes) || !(minutes > 0) || minutes > 480)
      throw new Error(`Set the minutes per unit for "${name}" (above 0).`);
    return {
      id: c.id || `cs-${newId()}`,
      name,
      unit: (c.unit ?? "").trim() || "items",
      minutes: Math.round(minutes * 100) / 100,
      ...(String(c.metric ?? "").trim() ? { metric: String(c.metric).trim().slice(0, 60) } : {}), // the project number it counts toward
    };
  });
}

/** `Lg` - validate + round a counts object (each value >= 0). */
export function validateTargets(counts) {
  return Object.fromEntries(
    Object.entries(counts).map(([k, v]) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new Error("Targets must be zero or more.");
      return [k, Math.round(n)];
    }),
  );
}

/** `TP` - 95 -> "1h 35m", 40 -> "40m". */
export const formatMinutes = (minutes) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
    : `${minutes}m`;

/** `uU` - show a desktop notification when the user has granted permission. */
export function desktopNotify(body) {
  try {
    "Notification" in window &&
      Notification.permission === "granted" &&
      new Notification("Lead Strategus", { body });
  } catch {
    /* notifications unavailable */
  }
}
