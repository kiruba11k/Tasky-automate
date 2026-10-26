import { Target } from 'lucide-react';
import { Se as useStore, rt as Card, tc as tracksPeriod } from '@/internal/min';
import { projectWeekStart, savedWeekPlan, weekTargetFor } from '../lib/domain.js';
import { formatDayMonth, weekStart } from '../lib/dates.js';
import { weekRows } from '../lib/entries.js';
import { entryName, projectLabel } from './entryHelpers';
import { TARGET_KINDS, targetKind } from '../projects/targetKinds';
import { TargetSheet } from '../projects/TargetSheet';

/** The rows of one project's targets for the week holding `date`: [project, target, type, goal], from its saved weekly plan. */
export function weeklyTargetRows(project, date) {
  const start = projectWeekStart(project, date);
  const off = project.weekOff?.[start] ?? [];
  const goals = weekTargetFor(project, date) ?? {};
  const numbers = (project.metrics ?? [])
    .filter((m) => tracksPeriod(m, 'week') && !off.includes(m.id) && (goals[m.id] ?? 0) > 0)
    .map((m) => [project.name, m.label, 'Number', String(goals[m.id])]);
  const custom = (project.weekText?.[start] ?? [])
    .filter((r) => r.label?.trim())
    .map((r) => {
      const kind = targetKind(r);
      return [project.name, r.label, TARGET_KINDS.find((k) => k.id === kind)?.label ?? kind, kind === 'number' ? String(r.targetNum ?? 0) : r.target || '·'];
    });
  return savedWeekPlan(project, date) || custom.length ? [...numbers, ...custom] : [];
}

/**
 * The person's own work that belongs to no project (company work they gave themselves, "Other work" tables): the rows of the week's
 * tables with a target, as [name, target, type, goal] grouped under the name of the work.
 */
export function ownWorkRows(personId, date, daily, weekly) {
  const monday = weekStart(date);
  const record = weekly?.[`${personId}|${monday}`];
  return weekRows(personId, monday, daily, record?.entries ?? [], record?.overrides, [])
    .filter((r) => String(r.projectId).startsWith('other:') && (r.qty > 0 || r.targetText?.trim()))
    .map((r) => {
      const kind = r.kind ?? 'number';
      return [projectLabel(r.projectId, []), entryName(r), TARGET_KINDS.find((k) => k.id === kind)?.label ?? kind, kind === 'number' ? String(r.qty) : r.targetText.trim()];
    });
}

/** "Weekly targets" on the Tasks update page: the fixed weekly targets of every project the person is on, as one sheet with Copy as image. */
export function WeeklyTargets({ personId, date }) {
  const projects = useStore((s) => s.projects);
  const daily = useStore((s) => s.daily);
  const weekly = useStore((s) => s.weekly);
  const mine = projects.filter((p) => p.status === 'active' && (p.pmId === personId || p.teamIds?.includes(personId) || p.admins?.includes(personId)));
  const rows = [...mine.flatMap((p) => weeklyTargetRows(p, date)), ...ownWorkRows(personId, date, daily, weekly)];
  if (!rows.length) return null;
  return (
    <div data-testid="weekly-targets">
    <Card className="!p-0">
      <div className="border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Target size={17} className="text-accent-ink" /> Weekly targets
        </h2>
        <p className="text-xs text-muted">The targets fixed for your projects this week, plus the company work you set yourself, all in one table.</p>
      </div>
      <TargetSheet
        title="Weekly targets"
        heading={`Week of ${formatDayMonth(date)}`}
        columns={['Project', 'Target', 'Type', 'Goal']}
        rows={rows}
        group
        filename="weekly-targets.png"
        testId="weekly-targets-sheet"
      />
    </Card>
    </div>
  );
}

export default WeeklyTargets;
