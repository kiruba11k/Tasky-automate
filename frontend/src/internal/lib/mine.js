/** A project is "mine" when I own it, am one of its admins, or am on its team. */
export const isMyProject = (project, me) =>
  !!project && (project.pmId === me || (project.admins ?? []).includes(me) || (project.teamIds ?? []).includes(me));

/** Projects with the ones I own, help run or am on first; the order inside each group is kept. */
export const mineFirst = (projects, me) => {
  const rank = (p) => (p.pmId === me ? 0 : isMyProject(p, me) ? 1 : 2);
  return projects.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map(({ p }) => p);
};
