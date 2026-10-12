import { Se as useStore, Qe as PEOPLE, nt as personName } from '@/internal/min';

/** People a task can be sent to for review (project manager first). Hook: reads the store. */
export function useReviewerOptions(projectId) {
  const { me, projects } = useStore();
  const pmId = projects.find((p) => p.id === projectId)?.pmId;
  const mine = PEOPLE.find((p) => p.id === me);
  // A resource's work is approved by the project manager of the project: that is the only choice.
  const choices = mine?.role === 'resource' && pmId ? PEOPLE.filter((p) => p.id === pmId) : PEOPLE.filter((p) => p.id !== me);
  return choices
    .sort((a, b) => +(b.id === pmId) - +(a.id === pmId) || personName(a.id).localeCompare(personName(b.id)))
    .map((p) => ({
      id: p.id,
      label: `${personName(p.id)} · ${p.id === pmId ? 'Project manager of this project' : p.title}`,
    }));
}

export default useReviewerOptions;
