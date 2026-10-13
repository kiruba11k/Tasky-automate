import { Se as useStore, rt as Card, qe as Badge } from '@/internal/min';
import { ReviewRow } from './ReviewRow';
import { SendForApproval } from './SendForApproval';

/** "Waiting for your review" card, with the way to send your own unassigned work for approval. */
export function ReviewQueue() {
  const { me, tasks, projects } = useStore();
  const waiting = tasks
    .filter((t) => t.reviewerId === me && t.status === 'in_review')
    .sort((a, b) => Number(b.priority) - Number(a.priority));
  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 font-bold">
          Waiting for your review <Badge tone="lavender">{waiting.length}</Badge>
        </h2>
        <SendForApproval />
      </div>
      {!waiting.length && (
        <p className="px-5 py-3 text-sm text-muted">Nothing to review. Use Send for approval for work that was not assigned.</p>
      )}
      <ul className="divide-y divide-line">
        {waiting.map((t) => (
          <ReviewRow key={t.id} task={t} projectName={projects.find((p) => p.id === t.projectId)?.name ?? ''} />
        ))}
      </ul>
    </Card>
  );
}

export default ReviewQueue;
