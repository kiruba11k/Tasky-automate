import { Qe as PEOPLE } from '@/internal/min';

/** Sort rank of each flag on the People table. (Qle) */
export const TAG_ORDER = { acknowledge: 2, support: 0 };

/** Role of a person by id. (Zle) */
export const roleOf = (id) => PEOPLE.find((p) => p.id === id)?.role;

/** Job title of a person by id. (Jle) */
export const titleOf = (id) => PEOPLE.find((p) => p.id === id)?.title ?? '';

/** Team totals row for the People table. (WM) */
export function totalKpis(rows) {
  const sum = (key) => rows.reduce((acc, row) => acc + (row[key] ?? 0), 0);
  const timed = sum('timed');
  const onTimeCount = sum('onTimeCount');
  const round1 = (v) => Math.round(v * 10) / 10;
  return {
    onTime: timed ? Math.round((onTimeCount / timed) * 100) : null,
    tasks: sum('tasks'),
    hours: round1(sum('hours')),
    extra: round1(sum('extra')),
    resubmits: sum('resubmits'),
    assigned: sum('assigned'),
    timed,
    onTimeCount,
  };
}
