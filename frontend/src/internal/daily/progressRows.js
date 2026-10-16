import { entryAsTask } from '../lib/entries.js';
import { AUTO_COUNTED_METRIC_IDS } from '../lib/projectTemplates.js';
import {
  Fw as taskTypeOf,
  qV as dayProgress,
  VV as weekProgress,
  Mn as toMinutes,
  ft as addDays,
  Xt as weekStart,
} from '@/internal/min';

/** Project metric ids that are counted automatically from submitted tasks. */
export const AUTO_COUNTED_METRICS = new Set(AUTO_COUNTED_METRIC_IDS);

/** Sort order of the different row kinds. */
export const ROW_KIND_ORDER = { task: 0, block: 1, custom: 2, number: 3 };

/** Percentage of `target` reached by `value`, or null without a target. */
export const percentOf = (value, target) => (target > 0 ? Math.round((value / target) * 100) : null);

/** Sum assigned minutes and quantity per task type for one person over a date range. `rows` are logged table rows to add (their estimate counts as target time). */
export function sumAssignedByType(tasks, personId, from, to, rows = [], projects = []) {
  const map = new Map();
  rows.forEach((e) => {
    if (!e.estMin) return;
    const key = taskTypeOf(entryAsTask(e, projects.find((p) => p.id === e.projectId))).key;
    const cur = map.get(key) ?? { min: 0, qty: 0 };
    map.set(key, { min: cur.min + e.estMin, qty: cur.qty + (e.qty || 0) });
  });
  tasks.forEach((t) => {
    if (t.assigneeId !== personId || t.date < from || t.date > to) return;
    const key = taskTypeOf(t).key;
    const cur = map.get(key) ?? { min: 0, qty: 0 };
    map.set(key, { min: cur.min + (t.targetMinutes || 0), qty: cur.qty + (t.qty || 0) });
  });
  return map;
}

const scaledTargetMinutes = (entry, target) =>
  !entry || !entry.min
    ? undefined
    : entry.qty > 0 && entry.qty !== target
      ? Math.round((entry.min * target) / entry.qty)
      : entry.min;

/** Convert progress rows (task rows + custom "row:" rows) to display rows. */
export const toDisplayRows = (rows, assignedByType, sent) =>
  rows.map((r) => {
    const custom = r.key.startsWith('row:');
    const actual = sent ? (r.actual ?? 0) : null;
    return {
      key: r.key,
      label: r.label,
      sub: custom ? 'Custom' : undefined,
      unit: r.unit,
      target: r.target,
      targetMin: custom ? undefined : scaledTargetMinutes(assignedByType.get(r.key), r.target),
      actual,
      pct: actual == null ? null : percentOf(actual, r.target),
      kind: custom ? 'custom' : 'task',
    };
  });

/** Rows (targets vs actuals) for one person on one day. */
export function buildDayRows(tasks, projects, personId, date, record, kinds) {
  const progress = dayProgress({ tasks, projects, daily: record ? { [`${personId}|${date}`]: record } : {} }, personId, date);
  const sent = progress.sent;
  const rows = toDisplayRows(progress.rows, sumAssignedByType(tasks, personId, date, date, record?.entries ?? [], projects), sent);
  (record?.plan ?? []).forEach((block) => {
    const custom = block.custom;
    if (!custom) return;
    const actual = sent ? (custom.achieved ?? 0) : null;
    rows.push({
      key: `block:${block.id}`,
      label: custom.title.trim() || 'Custom block',
      sub: custom.priority ? 'Priority block' : 'Custom block',
      unit: custom.unit,
      target: custom.targetQty || 0,
      targetMin: Math.max(0, toMinutes(block.end) - toMinutes(block.start)),
      actual,
      pct: actual == null ? null : percentOf(actual, custom.targetQty || 0),
      kind: 'block',
      priority: custom.priority,
    });
  });
  const sodTargets = record?.sodTargets ?? {};
  const eodActuals = sent ? (record?.eodActuals ?? {}) : {};
  const numbers = new Map();
  [...new Set([...Object.keys(sodTargets), ...Object.keys(eodActuals)])].forEach((projectId) => {
    const project = projects.find((p) => p.id === projectId);
    [...new Set([...Object.keys(sodTargets[projectId] ?? {}), ...Object.keys(eodActuals[projectId] ?? {})])]
      .filter((id) => !AUTO_COUNTED_METRICS.has(id))
      .forEach((metricId) => {
        const target = sodTargets[projectId]?.[metricId] ?? 0;
        const actual = eodActuals[projectId]?.[metricId] ?? 0;
        if (!(target > 0) && !(actual > 0)) return;
        const pos = project?.metrics.findIndex((m) => m.id === metricId) ?? -1;
        const entry = numbers.get(metricId) ?? {
          label: project?.metrics.find((m) => m.id === metricId)?.label ?? metricId,
          pos: pos < 0 ? 99 : pos,
          t: 0,
          a: 0,
          where: [],
        };
        entry.t += target;
        entry.a += actual;
        entry.where.push(project?.client ?? project?.name ?? 'Project');
        numbers.set(metricId, entry);
      });
  });
  [...numbers.entries()]
    .sort((a, b) => a[1].pos - b[1].pos)
    .forEach(([metricId, entry]) => {
      const actual = sent ? entry.a : null;
      rows.push({
        key: `num:${metricId}`,
        label: entry.label,
        sub: entry.where.join(', '),
        unit: '',
        target: entry.t,
        actual,
        pct: actual == null ? null : percentOf(actual, entry.t),
        kind: 'number',
      });
    });
  const sorted = rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => ROW_KIND_ORDER[a.r.kind] - ROW_KIND_ORDER[b.r.kind] || a.i - b.i)
    .map((x) => x.r);
  return { rows: kinds ? sorted.filter((r) => kinds.includes(r.kind)) : sorted, sent };
}

/** Rows (targets vs actuals) for one person for the week starting `weekDate`. */
export function buildWeekRows(tasks, personId, weekDate, record, kinds, daily, projects = []) {
  const mon = weekStart(weekDate);
  const progress = weekProgress({ tasks, projects, daily: daily ?? {}, weekly: record ? { [`${personId}|${mon}`]: record } : {} }, personId, mon);
  const rows = toDisplayRows(progress.rows, sumAssignedByType(tasks, personId, mon, addDays(mon, 6), record?.entries ?? [], projects), progress.sent);
  return { rows: kinds ? rows.filter((r) => kinds.includes(r.kind)) : rows, sent: progress.sent, soFar: false };
}

/** How many rows with a target have met it. */
export const countTargetsMet = (rows) => {
  const withTarget = rows.filter((r) => r.target > 0);
  return {
    met: withTarget.filter((r) => (r.actual ?? 0) >= r.target).length,
    total: withTarget.length,
  };
};

/** Progress bar tone for a percentage. */
export const pctTone = (pct) => (pct >= 100 ? 'mint' : pct >= 70 ? 'sky' : 'butter');

/** Text colour class for a percentage. */
export const pctTextClass = (pct) => (pct >= 100 ? 'text-mint-ink' : pct >= 70 ? 'text-ink' : 'text-butter-ink');
