import { Se as useStore, Qe as PEOPLE, nt as personName } from '@/internal/min';

/** People a task can be sent to for review (project manager first). Hook: reads the store. */
export function useReviewerOptions(projectId) {
  const { me, projects } = useStore();
  const pmId = projects.find((p) => p.id === projectId)?.pmId;
  return PEOPLE.filter((p) => p.id !== me)
    .sort((a, b) => +(b.id === pmId) - +(a.id === pmId) || personName(a.id).localeCompare(personName(b.id)))
    .map((p) => ({
      id: p.id,
      label: `${personName(p.id)} · ${p.id === pmId ? 'Project manager of this project' : p.title}`,
    }));
}

export default useReviewerOptions;
