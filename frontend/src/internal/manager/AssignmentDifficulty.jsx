import React, { useMemo } from 'react';
import { Gauge } from 'lucide-react';
import {
  Se as useStore,
  $e as dayKey,
  ft as addDays,
  vR as assignmentMixByAssigner,
  zV as assignmentMixTotal,
  xn as isMemberRole,
  Wo as roleOf,
  yt as formatDate,
  nt as personName,
  rt as Card,
  dt as CardTitle,
  vt as Avatar,
  qe as Badge,
  oe as cn,
} from '@/internal/min';
import { DIFFICULTY_BANDS, difficultyBadge } from './difficulty';
import { DifficultyBar } from './DifficultyBar';

/** "Assignment difficulty" card (last 4 weeks). (bundle: HU) */
export function AssignmentDifficulty() {
  const tasks = useStore((s) => s.tasks);
  useStore((s) => s.profiles);
  const today = dayKey(0);
  const from = addDays(today, -27);
  const { rows, team } = useMemo(
    () => ({
      rows: assignmentMixByAssigner({ tasks }, { from, to: today }).sort(
        (a, b) =>
          Number(isMemberRole(roleOf(a.assignerId))) - Number(isMemberRole(roleOf(b.assignerId))) ||
          b.total - a.total,
      ),
      team: assignmentMixTotal({ tasks }, { from, to: today }),
    }),
    [tasks, from, today],
  );

  return (
    <Card>
      <CardTitle
        right={
          <span className="text-xs text-muted">
            {'Last 4 weeks · '}
            {formatDate(from)}
            {' to '}
            {formatDate(today)}
          </span>
        }
      >
        <Gauge size={17} className="mr-1.5 inline text-muted" />
        Assignment difficulty
      </CardTitle>
      <p className="mb-3 text-xs text-muted">
        Target time vs the project standard time. Within 10% is standard, less time is challenging,
        more time is easy.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No tasks assigned in the last 4 weeks.</p>
      ) : (
        <ul className="space-y-3" data-testid="assignment-difficulty">
          {rows.map((row) => {
            const badge = difficultyBadge(row);
            const role = roleOf(row.assignerId);
            return (
              <li key={row.assignerId} data-assigner={row.assignerId}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                  <Avatar id={row.assignerId} size="sm" />
                  <span className="font-semibold">{personName(row.assignerId)}</span>
                  <span className="text-xs text-muted">
                    {role === 'manager' ? 'Manager' : role === 'founder' ? 'Founder' : 'Project manager'}
                    {' · '}
                    {row.total}
                    {' tasks'}
                  </span>
                  <span className="ml-auto">
                    <Badge tone={badge.tone}>{badge.text}</Badge>
                  </span>
                </div>
                <DifficultyBar mix={row} />
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs tabular-nums">
                  {DIFFICULTY_BANDS.map((band) => (
                    <span key={band.key} className="inline-flex items-center gap-1">
                      <span className={cn('h-2 w-2 rounded-full', band.bar)} />
                      <b>
                        {row.pct[band.key]}%
                      </b>{' '}
                      <span className="text-muted">{band.label}</span>
                    </span>
                  ))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {team.total > 0 && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          {'Whole team: '}
          <b className="text-ink">{team.pct.challenging}%</b>
          {' challenging, '}
          <b className="text-ink">{team.pct.standard}%</b>
          {' standard, '}
          <b className="text-ink">{team.pct.easy}%</b>
          {' easy ('}
          {team.total}
          {' tasks)'}
        </p>
      )}
    </Card>
  );
}

export default AssignmentDifficulty;
