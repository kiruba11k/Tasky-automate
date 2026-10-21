// Daily update: the minutes planned for a project are shared out over that project's table rows. Rows whose estimate was typed by
// hand (`estManual`) keep it; what is left of the planned time is split evenly (in steps of 5 minutes) over the other rows, and the
// last of them takes the remainder.

/**
 * @param {object[]} rows the day's task rows ({ projectId, estMin, estManual, ... })
 * @param {{pid: string, planned: number}[]} groups the projects with the minutes planned for each
 * @returns {object[]} a new list when some estimate changed, else the same list
 */
export function splitEstimates(rows, groups) {
  const next = rows.map((r) => ({ ...r }));
  groups.forEach(({ pid, planned }) => {
    if (!planned) return;
    const mine = next.filter((r) => r.projectId === pid);
    const auto = mine.filter((r) => !r.estManual);
    if (!auto.length) return;
    const left = Math.max(0, planned - mine.filter((r) => r.estManual).reduce((s, r) => s + (r.estMin ?? 0), 0));
    const each = Math.floor(left / auto.length / 5) * 5;
    auto.forEach((r, i) => {
      r.estMin = i === auto.length - 1 ? left - each * (auto.length - 1) : each;
    });
  });
  return next.some((r, i) => r.estMin !== rows[i].estMin) ? next : rows;
}
