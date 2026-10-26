import { Target } from 'lucide-react';
import { Se as useStore, rt as Card, tc as tracksPeriod } from '@/internal/min';
import { projectWeekStart, savedWeekPlan, weekTargetFor } from '../lib/domain.js';
import { formatDayMonth } from '../lib/dates.js';
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

/** "Weekly targets" on the Tasks update page: the fixed weekly targets of every project the person is on, as one sheet with Copy as image. */
export function WeeklyTargets({ personId, date }) {
  const projects = useStore((s) => s.projects);
  const mine = projects.filter((p) => p.status === 'active' && (p.pmId === personId || p.teamIds?.includes(personId) || p.admins?.includes(personId)));
  const rows = mine.flatMap((p) => weeklyTargetRows(p, date));
  if (!rows.length) return null;
  return (
    <div data-testid="weekly-targets">
    <Card className="!p-0">
      <div className="border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Target size={17} className="text-accent-ink" /> Weekly targets
        </h2>
        <p className="text-xs text-muted">The targets fixed for your projects this week, all in one table.</p>
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
