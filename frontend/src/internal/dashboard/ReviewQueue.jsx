import { Se as useStore, rt as Card, qe as Badge } from '@/internal/min';
import { ReviewRow } from './ReviewRow';

/** "Waiting for your review" card, hidden when nothing is waiting. */
export function ReviewQueue() {
  const { me, tasks, projects } = useStore();
  const waiting = tasks
    .filter((t) => t.reviewerId === me && t.status === 'in_review')
    .sort((a, b) => Number(b.priority) - Number(a.priority));
  if (!waiting.length) return null;
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-bold">Waiting for your review</h2>
        <Badge tone="lavender">{waiting.length}</Badge>
      </div>
      <ul className="divide-y divide-line">
        {waiting.map((t) => (
          <ReviewRow key={t.id} task={t} projectName={projects.find((p) => p.id === t.projectId)?.name ?? ''} />
        ))}
      </ul>
    </Card>
  );
}

export default ReviewQueue;
