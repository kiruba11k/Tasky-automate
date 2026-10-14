import {
  Se as useStore,
  qe as Badge,
  We as formatMinutes,
  mi as STATUS_META,
  pu as projectColor,
} from '@/internal/min';
import { wasOnTime } from '../lib/domain';

/** One task as a compact line (project dot, title, time against target, on time / late, status) on the person page. (kw) */
export function TaskLine({ t }) {
  const projects = useStore((s) => s.projects);
  const status = STATUS_META[t.status];
  const onTime = wasOnTime(t);
  return (
    <li
      className="flex flex-wrap items-center gap-2 border-b border-line/70 py-1.5 text-sm last:border-0"
      data-task-line={t.id}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: projectColor(projects, t.projectId) }}
      />
      <span className="min-w-0 flex-1 truncate font-medium first-letter:uppercase">
        {t.title}
        <span className="ml-1 text-xs font-normal text-muted">{projects.find((p) => p.id === t.projectId)?.name}</span>
      </span>
      {t.minutes != null && (
        <span className="text-xs tabular-nums text-muted">
          {formatMinutes(t.minutes)} of {formatMinutes(t.targetMinutes)}
        </span>
      )}
      {onTime != null && <Badge tone={onTime ? 'mint' : 'peach'}>{onTime ? 'On time' : 'Late'}</Badge>}
      <Badge tone={status.tone}>{status.label}</Badge>
    </li>
  );
}

export default TaskLine;
