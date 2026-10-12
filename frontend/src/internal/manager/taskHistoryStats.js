import { rc as isSubmitted } from '@/internal/min';

/** "Resubmitted 2x" badge text. (bundle: aL) */
export const resubmitLabel = (count) => `Resubmitted ${count}x`;

/** Feedback / resubmit / approval statistics for a list of tasks. (bundle: CM) */
export function summarizeTaskHistory(tasks) {
  let feedback = 0;
  let forwarded = 0;
  let approvalMs = 0;
  let approvalCount = 0;
  let firstTime = 0;
  const done = tasks.filter((t) => t.status === 'done');
  tasks.forEach((t) => {
    (t.history ?? []).forEach((h) => {
      if (h.action === 'feedback') feedback++;
      if (h.action === 'forwarded') forwarded++;
    });
    const submittedAt = t.history?.find((h) => h.action === 'submitted')?.at;
    if (t.approvedAt && submittedAt) {
      approvalMs += new Date(t.approvedAt).getTime() - new Date(submittedAt).getTime();
      approvalCount++;
    }
  });
  done.forEach((t) => {
    if (!(t.resubmits ?? 0) && !t.history?.some((h) => h.action === 'feedback')) firstTime++;
  });
  return {
    tasks: tasks.length,
    submitted: tasks.filter(isSubmitted).length,
    approved: done.length,
    feedback,
    forwarded,
    resubmits: tasks.reduce((sum, t) => sum + (t.resubmits ?? 0), 0),
    resubmitted: tasks.filter((t) => (t.resubmits ?? 0) > 0).length,
    firstTime: done.length ? Math.round((firstTime / done.length) * 100) : null,
    avgApprovalH: approvalCount ? Math.round((approvalMs / approvalCount / 36e5) * 10) / 10 : null,
  };
}
