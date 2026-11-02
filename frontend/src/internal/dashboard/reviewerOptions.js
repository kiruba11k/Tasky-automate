import { Se as useStore, Qe as PEOPLE, nt as personName } from '@/internal/min';

/**
 * People a task can be sent to for review. The person who assigned the task comes first (a done task reaches who gave it), then the
 * project manager. A resource can pick only those two. Hook: reads the store.
 */
export function useReviewerOptions(projectId, task) {
  const { me, projects } = useStore();
  const pmId = projects.find((p) => p.id === projectId)?.pmId;
  const assignerId = task && !task.adhoc && task.assignedById && task.assignedById !== me ? task.assignedById : null;
  const mine = PEOPLE.find((p) => p.id === me);
  const choices =
    mine?.role === 'resource' && (pmId || assignerId)
      ? PEOPLE.filter((p) => (p.id === pmId || p.id === assignerId) && p.id !== me)
      : PEOPLE.filter((p) => p.id !== me);
  const rank = (id) => (id === assignerId ? 0 : id === pmId ? 1 : 2);
  return choices
    .sort((a, b) => rank(a.id) - rank(b.id) || personName(a.id).localeCompare(personName(b.id)))
    .map((p) => ({
      id: p.id,
      label: `${personName(p.id)} · ${p.id === assignerId ? 'Assigned this task' : p.id === pmId ? 'Project manager of this project' : p.title}`,
    }));
}

export default useReviewerOptions;
