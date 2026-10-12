import {
  Se as useStore,
  rt as Card,
  qe as Badge,
  vt as Avatar,
  be as firstName,
  Uw as formatRelativeTime,
} from '@/internal/min';

/** History of reviews I have given (latest 40). */
export function ReviewedByYou() {
  const { me, tasks, projects } = useStore();
  const all = tasks
    .flatMap((t) => t.reviews.filter((r) => r.by === me).map((r) => ({ t, r })))
    .sort((a, b) => b.r.at.localeCompare(a.r.at));
  const shown = all.slice(0, 40);
  if (!shown.length) return null;
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-bold">Reviewed by you</h2>
        <span className="text-xs text-muted">
          {all.length > shown.length ? `Latest ${shown.length} of ${all.length} reviews` : `${all.length} reviews`}
        </span>
      </div>
      <ul className="max-h-72 divide-y divide-line overflow-y-auto">
        {shown.map(({ t, r }, i) => (
          <li key={t.id + i} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
            <Avatar id={t.assigneeId} size="sm" />
            <span className="min-w-0 flex-1">
              <b className="first-letter:uppercase">{t.title}</b>{' '}
              <span className="text-muted">
                · {firstName(t.assigneeId)} · {projects.find((p) => p.id === t.projectId)?.name}
              </span>
            </span>
            <Badge tone={r.verdict === 'approved' ? 'mint' : 'butter'}>
              {r.verdict === 'approved' ? 'Approved' : 'Feedback sent'}
            </Badge>
            <span className="w-24 text-right text-xs text-muted">{formatRelativeTime(r.at)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default ReviewedByYou;
