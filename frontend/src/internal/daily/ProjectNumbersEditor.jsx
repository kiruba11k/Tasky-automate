import { oe as cx, Se as useStore, pu as projectColor } from '@/internal/min';
import { AUTO_COUNTED_METRICS } from './progressRows';
import { FIELD_CLASS } from './planHelpers';

/** Per-project metric inputs (responses, calls, meetings...) for the signed-in member. */
export function ProjectNumbersEditor({ value, onChange }) {
  const { me, projects } = useStore();
  const mine = projects.filter(
    (p) => p.status === 'active' && (p.pmId === me || p.teamIds.includes(me) || p.admins?.includes(me)),
  );
  return (
    <div className="space-y-3">
      {mine.map((p) => (
        <div
          key={p.id}
          className="rounded-xl border border-line p-3"
          style={{ borderLeft: `5px solid ${projectColor(projects, p.id)}` }}
        >
          <p className="mb-2 text-sm font-semibold">{p.name}</p>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {p.metrics
              .filter((m) => !AUTO_COUNTED_METRICS.has(m.id))
              .map((m) => (
                <label key={m.id} className="flex items-center justify-between gap-2 text-xs text-muted">
                  {m.label}
                  <input
                    type="number"
                    min={0}
                    className={cx(FIELD_CLASS, 'w-20 shrink-0 text-right')}
                    value={value[p.id]?.[m.id] || ''}
                    placeholder="0"
                    onChange={(e) =>
                      onChange({
                        ...value,
                        [p.id]: { ...value[p.id], [m.id]: Math.max(0, +e.target.value || 0) },
                      })
                    }
                  />
                </label>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProjectNumbersEditor;
