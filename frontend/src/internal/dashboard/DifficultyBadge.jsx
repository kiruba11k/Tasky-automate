import { Gauge } from 'lucide-react';
import { qe as Badge, oe as cx, We as formatMinutes, Lw as classifyDifficulty } from '@/internal/min';
import { DIFFICULTY_TONE, difficultyLabel, standardMinutesOf } from './taskFormat';

/** Easy / standard / challenging chip comparing a target against the standard time. */
export function DifficultyBadge({ target, standard, showStandard = true, className }) {
  if (standard == null || !(standard > 0)) {
    return (
      <span
        className={cx('inline-flex flex-wrap items-center gap-1.5', className)}
        title="Custom task without a project standard time"
        data-difficulty="none"
      >
        <Badge tone="grey">
          <Gauge size={11} /> No standard
        </Badge>
      </span>
    );
  }
  const difficulty = classifyDifficulty(target, standard);
  return (
    <span
      className={cx('inline-flex flex-wrap items-center gap-1.5', className)}
      title={`Target ${formatMinutes(Math.max(0, Math.round(target)) || 0)} vs standard ${formatMinutes(standard)}. Within 10% of the standard counts as standard.`}
      data-difficulty={difficulty.level}
    >
      <Badge tone={DIFFICULTY_TONE[difficulty.level]}>
        <Gauge size={11} /> {difficultyLabel(difficulty)}
      </Badge>
      {showStandard && <span className="text-xs text-muted">standard {formatMinutes(standard)}</span>}
    </span>
  );
}

/** Difficulty chip derived from a task's own target and standard minutes. */
export function TaskDifficultyBadge({ task, showStandard = true }) {
  return <DifficultyBadge target={task.targetMinutes} standard={standardMinutesOf(task)} showStandard={showStandard} />;
}

export default DifficultyBadge;
