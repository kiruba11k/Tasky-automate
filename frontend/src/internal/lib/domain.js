// Pure domain logic: permissions, target / standard-time maths, status logic,
// reports, metrics, spotlight selection and small validators.
import {
  addDays,
  clockToMinutes,
  currentWeekStart,
  formatDayMonth,
  recentPeriods,
  resolvePeriod,
  shiftPeriod,
  todayKey,
  weekStart,
  WEEKDAY_SHORT,
} from "./dates.js";
import {
  PEOPLE,
  TASK_TYPES,
  VARIANT_PER_UNIT,
  isLeadership,
  roleOf,
} from "./constants.js";

export { isLeadership, roleOf };

/** `Tn` - short random id. */
export const newId = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------- metrics

/** `cf` / `wV` - the default tracked numbers of a project. */
export const DEFAULT_METRICS = [
  { id: "messages", label: "Messages sent" },
  { id: "responses", label: "Responses received" },
  { id: "l2", label: "2nd level sent" },
  { id: "calls", label: "Tele calls made" },
  { id: "interest", label: "Meeting interest" },
  { id: "meetings", label: "Meetings scheduled" },
  { id: "decks", label: "Decks" },
];

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

/** `ea` - owner, admin or leadership may manage a project. */
export function canManageProject(project, personId) {
  return project
    ? project.pmId === personId ||
        (project.admins ?? []).includes(personId) ||
        isLeadership(roleOf(personId))
    : false;
}

/** `vV` */
export const isProjectOwner = (project, personId) => project?.pmId === personId;

/** `xV` */
export const isProjectAdmin = (project, personId) => !!project?.admins?.includes(personId);

/** `nc` - ids of everyone who is a resource / PM (not manager or founder). */
export const TRACKED_PEOPLE_IDS = PEOPLE.filter((p) => !isLeadership(p.role)).map((p) => p.id);

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
export function finalizeProjectsForDay(projects, personId, day, at, daily) {
  const mine = new Set(activeProjectsFor(projects, personId).map((p) => p.id));
  const everyoneSent = (project) =>
    !daily ||
    project.teamIds.every((id) => id === personId || !!daily[`${id}|${day}`]?.eodAt);
  return projects.map((p) =>
    mine.has(p.id) && !p.finalized?.[day] && everyoneSent(p)
      ? { ...p, finalized: { ...p.finalized, [day]: at } }
      : p,
  );
}

// ---------------------------------------------------------- project planning

/** `df` - weekly target for the week containing `date` (plan or default). */
export const weekTargetFor = (project, date) =>
  project.weekPlans?.[weekStart(date)] ?? project.weekTarget;

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

/** `Dw` - numbered project weeks from the start date to `weeksAhead` past the current week. */
export function projectWeeks(project, weeksAhead = 4) {
  if (!project.startDate) return [];
  const first = weekStart(project.startDate);
  const lastProjectWeek =
    project.endDate && project.endDate >= project.startDate ? weekStart(project.endDate) : first;
  const horizon = currentWeekStart(weeksAhead);
  const last = lastProjectWeek > horizon ? lastProjectWeek : horizon;
  const thisWeek = currentWeekStart(0);
  const out = [];
  for (let c = first, n = 1; c <= last && n <= 104; c = addDays(c, 7), n++) {
    out.push({
      n,
      start: c,
      end: addDays(c, 4),
      label: `Week ${n} · ${formatDayMonth(n === 1 && project.startDate > c ? project.startDate : c)} to ${formatDayMonth(addDays(c, 4))}`,
      plannedAhead: c > thisWeek,
    });
  }
  return out;
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
  return standardMinutes(
    typeId,
    qty,
    variant,
    project?.standards ? { ...DEFAULT_STANDARDS, ...project.standards } : undefined,
  );
}

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

/** `LV` - true/false when within target time, null when not measurable. */
export function wasOnTime(task) {
  return !isSubmitted(task) || !task.minutes || !task.doneQty || !task.qty
    ? null
    : task.minutes <= task.targetMinutes * (task.doneQty / task.qty);
}

/** `PR` - on-time summary {onTime,total,pct} for a list of tasks (null if none measurable). */
export const onTimeSummary = (tasks) => {
  const measurable = tasks.filter(
    (t) => (t.status === "done" || t.status === "in_review") && t.minutes && t.doneQty && t.qty,
  );
  if (!measurable.length) return null;
  const onTime = measurable.filter((t) => t.minutes <= t.targetMinutes * (t.doneQty / t.qty)).length;
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
 */
export function targetVsActualRows(tasks, assigneeId, from, to, opts = {}) {
  const rows = new Map();
  tasks.forEach((t) => {
    if (
      (assigneeId && t.assigneeId !== assigneeId) ||
      t.date < from ||
      t.date > to ||
      (opts.projectId && t.projectId !== opts.projectId) ||
      (opts.includeHistoric === false && t.historic)
    )
      return;
    const k = taskBreakdownKey(t);
    const row = rows.get(k.key) ?? {
      key: k.key,
      label: k.label,
      unit: k.unit,
      target: 0,
      actual: 0,
      pct: 0,
      order: k.order,
    };
    row.target += t.qty;
    if (isSubmitted(t)) row.actual += t.doneQty ?? 0;
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
export function dailySnapshot(tasks, personId, day, daily, at) {
  return buildSnapshot(
    targetVsActualRows(tasks, personId, day, day),
    daily.sodCustom ?? [],
    daily.eodCustom ?? [],
    at,
  );
}

/** `Bw` - end-of-week snapshot for one person and week. */
export function weeklySnapshot(tasks, personId, week, weekly, at) {
  const monday = weekStart(week);
  return buildSnapshot(
    targetVsActualRows(tasks, personId, monday, addDays(monday, 6)),
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
  const live = dailySnapshot(state.tasks, personId, day, daily ?? {});
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
  const live = weeklySnapshot(state.tasks, personId, monday, weekly ?? { targetsCustom: [], eowCustom: [] });
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
  return { sent, pending: project.teamIds.filter((id) => !sent.includes(id)) };
}

/** `zw` - planned / actual / extra minutes for one daily entry. */
export function dayHours(daily) {
  if (!daily) return { plannedMin: 0, actualMin: 0, extraMin: 0, sent: false };
  let planned = 0;
  let actual = 0;
  (daily.plan ?? []).forEach((block) => {
    if (block.id === "lunch") return;
    const mins = Math.max(0, clockToMinutes(block.end) - clockToMinutes(block.start));
    planned += mins;
    actual += block.actualMinutes ?? (daily.eodAt ? mins : 0);
  });
  const extra = (daily.extra ?? []).reduce((sum, x) => sum + (x.minutes || 0), 0);
  return { plannedMin: planned, actualMin: actual, extraMin: extra, sent: !!daily.eodAt };
}

/** `kR` - Mon-Fri hours roll-up for a person. `daily` is `state.daily`. */
export function weekHours(daily, personId, week) {
  const monday = weekStart(week);
  const days = [0, 1, 2, 3, 4].map((i) => {
    const date = addDays(monday, i);
    return { date, ...dayHours(daily[`${personId}|${date}`]) };
  });
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
  onTime: "Share of submitted tasks finished within their target time",
  tasks: "Tasks submitted for approval or approved",
  hours: "Time recorded on submitted tasks",
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
  let minutes = 0;
  let resubmits = 0;
  tasks.forEach((t) => {
    if (t.date < from || t.date > to) return;
    assigned++;
    resubmits += t.resubmits ?? 0;
    if (!isSubmitted(t)) return;
    submitted++;
    minutes += t.minutes ?? 0;
    const ok = wasOnTime(t);
    if (ok !== null) {
      timed++;
      if (ok) onTimeCount++;
    }
  });
  let extraMinutes = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    extraMinutes += (daily[`${personId}|${d}`]?.extra ?? []).reduce((s, x) => s + (x.minutes || 0), 0);
  }
  return {
    onTime: timed ? Math.round((onTimeCount / timed) * 100) : null,
    tasks: submitted,
    hours: roundOneDecimal(minutes / 60),
    extra: roundOneDecimal(extraMinutes / 60),
    resubmits,
    assigned,
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
  const prevPeriod = shiftPeriod(period, -1);
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
        return [k, a == null || b == null ? null : roundOneDecimal(a - b)];
      }),
    );
    return { personId: id, name: staticPersonName(id), ...cur, prev, change, tag: null };
  });
  const MIN_TIMED = 5;
  rows.forEach((r) => {
    if (r.timed < MIN_TIMED) r.tagReason = "Not enough data yet";
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
 * `JV` - minutes by project and by task type in a date range.
 * @param {object} state
 * @param {{from:string,to:string,personId?:string}} range
 */
export function timeBreakdown(state, range) {
  const people = range.personId ? [range.personId] : TRACKED_PEOPLE_IDS;
  const projectName = (id) => state.projects?.find((p) => p.id === id)?.name ?? id;
  const byProject = new Map();
  const byType = new Map();
  const add = (map, id, label, minutes) => {
    const entry = map.get(id) ?? { id, label, minutes: 0 };
    entry.minutes += minutes;
    map.set(id, entry);
  };
  state.tasks.forEach((t) => {
    if (
      !people.includes(t.assigneeId) ||
      t.date < range.from ||
      t.date > range.to ||
      !isSubmitted(t) ||
      !t.minutes
    )
      return;
    add(byProject, t.projectId, projectName(t.projectId), t.minutes);
    const type = TASK_TYPES.find((x) => x.id === t.typeId);
    if (type) add(byType, type.id, type.name, t.minutes);
    else {
      const k = taskBreakdownKey(t);
      add(byType, k.key, k.label, t.minutes);
    }
  });
  people.forEach((id) => {
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      (state.daily[`${id}|${d}`]?.extra ?? []).forEach((x) => {
        if (x.minutes > 0) {
          if (x.projectId) add(byProject, x.projectId, projectName(x.projectId), x.minutes);
          else add(byProject, "other", "Not linked to a project", x.minutes);
          add(byType, "extra", "Extra hours", x.minutes);
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

const ALIAS_ANIMALS = ["Otter", "Panda", "Koala", "Heron", "Falcon", "Fox", "Lynx", "Robin"];
const ALIAS_ADJECTIVES = ["Calm", "Sunny", "Brave", "Quiet", "Witty", "Kind", "Swift", "Merry"];

/** `tU` */
export { ALIAS_ANIMALS, ALIAS_ADJECTIVES };

/** `rU` - random anonymous chat alias, e.g. "Calm Otter". */
export const randomAlias = () =>
  `${ALIAS_ADJECTIVES[Math.floor(Math.random() * 8)]} ${ALIAS_ANIMALS[Math.floor(Math.random() * 8)]}`;

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
