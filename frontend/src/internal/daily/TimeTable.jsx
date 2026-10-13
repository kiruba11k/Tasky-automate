import { oe as cx, We as formatMinutes, Se as useStore, Mn as toMinutes, pu as projectColor } from '@/internal/min';

/** Planned vs actual time per block, with extra-hours entries slotted in by start time. */
export function TimeTable({ plan, extra, sent }) {
  const projects = useStore((s) => s.projects);
  const blocks = [...plan].filter((b) => b.id !== 'lunch').sort((a, b) => a.start.localeCompare(b.start));
  if (!blocks.length && !extra.length) return null;
  // Extra hours with a start time sit in the timeline order; the ones without one go last.
  const rows = [...blocks.map((b) => ({ at: b.start, b })), ...extra.map((x) => ({ at: x.start ?? '99', x }))].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  const th = 'pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted';
  return (
    <table className="w-full table-fixed text-sm" aria-label="Time">
      <colgroup>
        <col className="hidden w-[6.5rem] sm:table-column" />
        <col />
        <col className="w-14 sm:w-16" />
        <col className="w-14 sm:w-16" />
      </colgroup>
      <thead>
        <tr className="border-b border-line">
          <th className={cx(th, 'hidden text-left sm:table-cell')}>When</th>
          <th className={cx(th, 'text-left')}>What</th>
          <th className={cx(th, 'text-right')}>Planned</th>
          <th className={cx(th, 'text-right')}>Actual</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          if (row.x) {
            const x = row.x;
            return (
              <tr key={x.id} className="border-b border-line/70 last:border-0">
                <td className="hidden py-1.5 tabular-nums text-muted sm:table-cell">
                  {x.start && x.end ? `${x.start} to ${x.end}` : 'Extra'}
                </td>
                <td className="truncate py-1.5 pr-2" title={x.work}>
                  {x.start && x.end && (
                    <span className="block text-[11px] tabular-nums text-muted sm:hidden">
                      {x.start} to {x.end}
                    </span>
                  )}
                  <span className="mr-1.5 rounded bg-lavender px-1.5 py-px text-[10px] font-bold text-lavender-ink">EXTRA</span>
                  {x.work}
                  {x.projectId && (
                    <span className="text-muted">
                      {' · '}
                      {projects.find((p) => p.id === x.projectId)?.client}
                    </span>
                  )}
                </td>
                <td />
                <td className="py-1.5 text-right font-semibold tabular-nums">{formatMinutes(x.minutes)}</td>
              </tr>
            );
          }
          const b = row.b;
          const planned = Math.max(0, toMinutes(b.end) - toMinutes(b.start));
          const actual = b.actualMinutes ?? (sent ? planned : undefined);
          const project = projects.find((p) => p.id === b.projectId);
          return (
            <tr key={b.id} className="border-b border-line/70">
              <td className="hidden py-1.5 tabular-nums text-muted sm:table-cell">
                {b.start} to {b.end}
              </td>
              <td className="truncate py-1.5 pr-2">
                <span className="block text-[11px] tabular-nums text-muted sm:hidden">
                  {b.start} to {b.end}
                </span>
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{
                    background: b.custom ? (b.custom.priority ? '#DC2626' : '#64748B') : projectColor(projects, b.projectId),
                  }}
                />
                {b.custom ? b.custom.title || 'Custom block' : (project?.name ?? 'Project')}
              </td>
              <td className="py-1.5 text-right tabular-nums text-muted">{formatMinutes(planned)}</td>
              <td
                className={cx(
                  'py-1.5 text-right font-semibold tabular-nums',
                  actual != null && actual > planned && 'text-butter-ink',
                )}
              >
                {actual != null ? formatMinutes(actual) : ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default TimeTable;
