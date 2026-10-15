// Change the project of a plan block (or of a whole Daily update table) after the day was saved or locked. Pure: it returns the
// new plan / extra hours / saved Daily update rows / autoPlanned bookkeeping and leaves saving to the caller.
//  - rows saved for the old project follow the change when nothing in the plan (block or extra row) uses the old project any more
//  - blocks that were changed lose their Auto chip
//  - autoPlanned for the old project is raised to what is assigned, so the plan is not topped up with a block for it again
const OTHER = "other:";
const baseId = (id) => String(id).split("~")[0];

/** Project id a block counts under (a custom block can point at a project). */
export const blockPid = (b) => (b.custom ? (b.custom.projectId ?? b.projectId) : b.projectId);
/** Project id an extra-hours row counts under: its project, or its free-text work as "other:<work>". */
export const extraPid = (x) => x.projectId ?? (x.work ? `${OTHER}${x.work}` : undefined);

const nameOf = (pid, projects) => (pid.startsWith(OTHER) ? pid.slice(OTHER.length) : (projects.find((p) => p.id === pid)?.name ?? pid));

/**
 * Re-point rows at another project. A row whose task is one of the old project's own standards ("std:<id>") that the new project
 * does not have becomes a custom task with the same name, so nothing is lost.
 */
export function moveEntries(entries, from, to, projects = []) {
  if (from === to) return entries;
  const src = projects.find((p) => p.id === from);
  const dst = projects.find((p) => p.id === to);
  return entries.map((r) => {
    if (r.projectId !== from) return r;
    const moved = { ...r, projectId: to };
    if (typeof r.task === "string" && r.task.startsWith("std:") && !dst?.customStandards?.some((s) => `std:${s.id}` === r.task)) {
      const std = src?.customStandards?.find((s) => `std:${s.id}` === r.task);
      moved.task = "__custom";
      moved.custom = r.custom || std?.name || "Custom task";
    }
    return moved;
  });
}

/** Add `to` to the placed work and take `from` out; used by both callers. */
function stillUsed(plan, extra, pid) {
  return plan.some((b) => blockPid(b) === pid) || extra.some((x) => extraPid(x) === pid);
}

/**
 * @param {{plan?:object[], extra?:object[], entries?:object[], autoPlanned?:object, assigned?:object, projects?:object[],
 *   from:string, to:string, blockId?:string, extraId?:string}} a
 *   `blockId` / `extraId` change just that block / extra row; with neither, every block and extra row of `from` changes.
 * @returns {{plan:object[], extra:object[], entries:object[], autoPlanned:object, movedEntries:boolean}|null} null when nothing changes
 */
export function changeProject({ plan = [], extra = [], entries = [], autoPlanned = {}, assigned = {}, projects = [], from, to, blockId, extraId }) {
  if (!from || !to || from === to) return null;
  const only = blockId != null || extraId != null;
  let touched = false;
  const nextPlan = plan.map((b) => {
    const hit = only ? blockId != null && baseId(b.id) === baseId(blockId) : blockPid(b) === from;
    if (!hit) return b;
    touched = true;
    const { custom, auto, ...rest } = b; // eslint-disable-line no-unused-vars
    return { ...rest, projectId: to };
  });
  const nextExtra = extra.map((x) => {
    const hit = only ? extraId != null && x.id === extraId : extraPid(x) === from;
    if (!hit) return x;
    touched = true;
    const { auto, ...rest } = x; // eslint-disable-line no-unused-vars
    return { ...rest, projectId: to.startsWith(OTHER) ? undefined : to, work: nameOf(to, projects) };
  });
  const free = !touched && !only; // a table with no block behind it (added below the tables): only its rows change
  if (!touched && !free) return null;
  const movedEntries = !stillUsed(nextPlan, nextExtra, from);
  const nextAuto = { ...autoPlanned };
  if (assigned[from] > 0) nextAuto[from] = Math.max(autoPlanned[from] ?? 0, assigned[from]);
  return {
    plan: nextPlan,
    extra: nextExtra,
    entries: movedEntries ? moveEntries(entries, from, to, projects) : entries,
    autoPlanned: nextAuto,
    movedEntries,
  };
}
