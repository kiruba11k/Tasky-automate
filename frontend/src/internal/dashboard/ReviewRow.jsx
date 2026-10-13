import { useState } from 'react';
import { Check, MessageSquare, Forward, Star } from 'lucide-react';
import {
  Se as useStore,
  qe as Badge,
  Te as Button,
  vt as Avatar,
  Ge as inputClass,
  We as formatMinutes,
  be as firstName,
  lt as runAction,
  Ye as showToast,
} from '@/internal/min';
import { LinkChips } from '../ui/LinkFields';
import { OnTimeBadge } from './OnTimeBadge';
import { ResubmitBadge } from './ResubmitBadge';
import { HistoryToggle } from './HistoryToggle';
import { TaskHistory } from './TaskHistory';
import { useReviewerOptions } from './reviewerOptions';
import { formatDateTime, formatTimeOrDateTime } from './taskFormat';
import { sortedHistory } from './historyMeta';

/** A submitted task waiting for my review: approve, send feedback, or forward. */
export function ReviewRow({ task, projectName }) {
  const { approve, sendBack, forwardReview } = useStore();
  const forwardTargets = useReviewerOptions(task.projectId).filter((o) => o.id !== task.assigneeId);
  const [panel, setPanel] = useState(null);
  const [note, setNote] = useState('');
  const [forwardTo, setForwardTo] = useState(forwardTargets[0]?.id ?? '');
  const history = sortedHistory(task);
  const forwardedEntry = [...history].reverse().find((h) => h.action === 'forwarded');
  const [historyOpen, setHistoryOpen] = useState((task.resubmits ?? 0) > 0 || !!forwardedEntry);
  const firstSubmit = history.find((h) => h.action === 'submitted');

  return (
    <li className="px-4 py-3" data-review={task.id}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar id={task.assigneeId} size="sm" />
        <div className="min-w-[200px] flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold first-letter:uppercase">
            {task.title}{' '}
            {task.priority && (
              <Badge tone="coral">
                <Star size={11} /> Priority
              </Badge>
            )}
            <ResubmitBadge task={task} />
            {forwardedEntry && (
              <Badge tone="sky">
                <Forward size={11} /> Forwarded by {firstName(forwardedEntry.by)}
              </Badge>
            )}
          </p>
          <p className="text-xs text-muted">
            {task.adhoc
              ? `${firstName(task.assigneeId)} · ${projectName} · sent for approval without an assigned task`
              : `${firstName(task.assigneeId)} · ${projectName} · ${task.doneQty} ${task.unit} in ${formatMinutes(task.minutes ?? 0)} (target ${formatMinutes(task.targetMinutes)})`}
          </p>
          {task.adhoc && task.feedback[0] && <p className="text-xs">Note: {task.feedback[0].text}</p>}
          <LinkChips links={task.links} className="mt-1" />
          <p className="text-xs text-muted">
            Sent for approval {formatDateTime(task.submittedAt)}
            {(task.resubmits ?? 0) > 0 && firstSubmit && firstSubmit.at !== task.submittedAt
              ? ` · first sent ${formatTimeOrDateTime(firstSubmit.at)}`
              : ''}
          </p>
          <HistoryToggle task={task} open={historyOpen} onClick={() => setHistoryOpen((v) => !v)} className="mt-0.5" />
        </div>
        <OnTimeBadge task={task} />
        <Button
          onClick={() =>
            runAction(() => {
              approve(task.id);
              showToast({ title: `Approved, ${firstName(task.assigneeId)} notified`, tone: 'success' });
            })
          }
        >
          <Check size={13} /> Approve
        </Button>
        <Button
          tone="ghost"
          className="border border-line"
          onClick={() => setPanel(panel === 'feedback' ? null : 'feedback')}
        >
          <MessageSquare size={13} /> Feedback
        </Button>
        <Button
          tone="ghost"
          className="border border-line"
          onClick={() => setPanel(panel === 'forward' ? null : 'forward')}
        >
          <Forward size={13} /> Forward
        </Button>
      </div>
      {historyOpen && <TaskHistory task={task} className="mt-2 sm:ml-10" />}
      {panel === 'feedback' && (
        <form
          className="mt-2 sm:ml-10 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (runAction(() => sendBack(task.id, note))) {
              showToast({ title: `Feedback sent to ${firstName(task.assigneeId)}`, tone: 'info' });
              setNote('');
              setPanel(null);
            }
          }}
        >
          <input
            className={inputClass}
            autoFocus
            placeholder="What should they change?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button type="submit">Send</Button>
        </form>
      )}
      {panel === 'forward' && (
        <form
          className="mt-2 sm:ml-10 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (runAction(() => forwardReview(task.id, forwardTo, note))) {
              showToast({ title: `Forwarded to ${firstName(forwardTo)}`, tone: 'info' });
              setNote('');
              setPanel(null);
            }
          }}
        >
          <select
            aria-label="Forward to"
            className={inputClass}
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
          >
            {forwardTargets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button type="submit">
            <Forward size={13} /> Forward
          </Button>
        </form>
      )}
    </li>
  );
}

export default ReviewRow;
