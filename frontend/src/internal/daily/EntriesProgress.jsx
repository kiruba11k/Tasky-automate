import { Pencil } from 'lucide-react';
import { Se as useStore } from '@/internal/min';
import { weekStart } from '../lib/dates.js';
import { projectColor } from '../dashboard/DayPlanStrip';
import { EDIT_DAY_TASKS } from './EntriesLog';
import { entryName, weeklyAchieved } from './entryHelpers';

const pct = (done, target) => (target ? Math.round((done / target) * 100) : 0);
const toneFor = (p) => (p >= 100 ? 'mint' : p >= 60 ? 'sky' : 'peach');
const FILL = { mint: 'bg-mint-strong', sky: 'bg-sky-strong', peach: 'bg-peach-strong' };

function Bar({ done, target }) {
  const p = pct(done, target);
  return (
    <div className="h-2 w-full rounded-full bg-surface-2 ring-1 ring-inset ring-line/60" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-500 ${FILL[toneFor(p)]}`} style={{ width: `${Math.min(100, p)}%` }} />
    </div>
  );
}

/** Target vs achieved from the rows in "Daily update" / "Weekly targets by project", per project and in total. */
export function EntriesProgress({ personId, date, kind }) {
  const { projects, daily, weekly } = useStore();
  const monday = weekStart(date);
  const rows = (kind === 'day' ? daily[`${personId}|${date}`]?.entries : weekly[`${personId}|${monday}`]?.entries) ?? [];
  const done = (r) => (kind === 'week' ? weeklyAchieved(r, personId, monday, daily) : r.doneQty) ?? 0;
  const withTarget = rows.filter((r) => (r.qty ?? 0) > 0);
  const projectIds = [...new Set(rows.map((r) => r.projectId))];
  const sum = (list) => list.reduce((t, r) => ({ target: t.target + (r.qty ?? 0), done: t.done + Math.min(done(r), r.qty ?? 0) }), { target: 0, done: 0 });
  const total = sum(withTarget);
  const edit = (
    <button
      type="button"
      className="focus-ring flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-accent-ink hover:bg-surface-2"
      onClick={() => (kind === 'day' ? window.dispatchEvent(new Event(EDIT_DAY_TASKS)) : document.getElementById('weekly-update')?.scrollIntoView({ behavior: 'smooth' }))}
    >
      <Pencil size={11} /> Edit
    </button>
  );

  if (!rows.length) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted" data-progress={kind}>
        No {kind === 'day' ? 'daily' : 'weekly'} tasks entered yet.
        {edit}
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-line p-3" data-progress={kind}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{kind === 'day' ? 'Today' : 'This week'}</span>
        <b className="tabular-nums" data-testid={`${kind}-progress`}>
          {total.done}/{total.target}
        </b>
        <span className="flex-1">
          <Bar done={total.done} target={total.target} />
        </span>
        <b className="w-10 text-right text-sm tabular-nums">{pct(total.done, total.target)}%</b>
        {edit}
      </div>
      {projectIds.map((pid) => {
        const project = projects.find((p) => p.id === pid);
        const list = rows.filter((r) => r.projectId === pid);
        const part = sum(list.filter((r) => (r.qty ?? 0) > 0));
        return (
          <div key={pid} className="rounded-lg bg-surface-2/40 p-2" style={{ borderLeft: `4px solid ${projectColor(projects, pid)}` }}>
            <p className="mb-1 flex items-center justify-between text-xs font-semibold">
              <span>{project?.name}</span>
              <span className="tabular-nums">
                {part.done}/{part.target} · {pct(part.done, part.target)}%
              </span>
            </p>
            <ul className="space-y-1">
              {list.map((r) => {
                const d = done(r);
                const t = r.qty ?? 0;
                return (
                  <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(4rem,8rem)_2.5rem] items-center gap-2 text-xs">
                    <span className="truncate" title={r.desc}>
                      {entryName(r, project)}
                      {r.desc && <span className="text-muted"> · {r.desc}</span>}
                    </span>
                    <span className="text-right font-semibold tabular-nums">{t ? `${d}/${t}` : d || '·'}</span>
                    <Bar done={d} target={t} />
                    <span className="text-right tabular-nums text-muted">{t ? `${pct(d, t)}%` : ''}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default EntriesProgress;
