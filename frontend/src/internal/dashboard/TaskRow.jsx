import { useState } from 'react';
import { Send, Star, RotateCcwClock, Repeat, Pencil, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../kit/ConfirmModal';
import {
  Se as useStore,
  qe as Badge,
  Te as Button,
  Ya as Modal,
  Ge as inputClass,
  oe as cx,
  We as formatMinutes,
  be as firstName,
  yt as formatDate,
  $e as dayKey,
  Cn as TASK_TYPES,
  mi as STATUS_META,
  lt as runAction,
  Ye as showToast,
} from '@/internal/min';
import { LinkInputs, LinkChips } from '../ui/LinkFields';
import { OnTimeBadge } from './OnTimeBadge';
import { ResubmitBadge } from './ResubmitBadge';
import { HistoryToggle } from './HistoryToggle';
import { TaskHistory } from './TaskHistory';
import { useReviewerOptions } from './reviewerOptions';
import { WEEKDAY_SHORT, formatTimeOrDateTime, standardMinutesOf } from './taskFormat';

const QUICK_MINUTES = [15, 30, 45, 60, 90, 120];

/** One of my own tasks in a project card, with the submit / resubmit-for-approval dialog. */
export function TaskRow({ task }) {
  const { submitForReview, editApproval, deleteTask, me } = useStore();
  // work this person sent for approval themselves (not an assigned task): they can change or withdraw it until it is handled
  const mySent = task.adhoc && task.assignedById === me && task.status === 'in_review';
  const [editSent, setEditSent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sentTitle, setSentTitle] = useState(task.title);
  const [sentLinks, setSentLinks] = useState(task.links?.length ? task.links : ['']);
  const [sentNote, setSentNote] = useState(task.feedback?.[0]?.text ?? '');
  const reviewers = useReviewerOptions(task.projectId);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [doneQty, setDoneQty] = useState(task.doneQty ?? task.qty);
  const [minutes, setMinutes] = useState(task.minutes ?? task.targetMinutes);
  const [reviewerId, setReviewerId] = useState(task.reviewerId ?? reviewers[0]?.id ?? '');
  const [links, setLinks] = useState(task.links?.length ? task.links : ['']);
  const [error, setError] = useState('');
  const taskType = TASK_TYPES.find((t) => t.id === task.typeId);
  const statusMeta = STATUS_META[task.status];
  const carriedOver = task.date < dayKey(0) && task.status !== 'done';
  const lastFeedback = task.feedback.filter((f) => !f.text.startsWith('Forwarded:')).pop();
  const canSubmit = task.status === 'todo' || task.status === 'in_progress' || task.status === 'changes';
  const standard = standardMinutesOf(task);
  const isResubmit = task.status === 'changes' || (task.history ?? []).some((h) => h.action === 'feedback');

  return (
    <li className="px-4 py-3" data-task={task.id}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-[200px] flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold first-letter:uppercase">
            {task.title}
            {task.priority && (
              <Badge tone="coral">
                <Star size={11} /> Priority · {firstName(task.assignedById)}
              </Badge>
            )}
            {carriedOver && (
              <Badge tone="butter">
                <RotateCcwClock size={11} />{' '}
                {task.date === dayKey(-1)
                  ? 'From yesterday'
                  : `Carried over from ${WEEKDAY_SHORT[new Date(`${task.date}T12:00:00`).getDay()]} ${formatDate(task.date)}`}
              </Badge>
            )}
            {task.reminders > 0 && task.status !== 'done' && <Badge tone="peach">⏰ Reminded</Badge>}
            {task.reworkOf && task.status !== 'done' && (
              <Badge tone="butter">
                <Repeat size={11} /> Rework of a part-approved task
              </Badge>
            )}
            <ResubmitBadge task={task} />
          </p>
          <p className="text-xs text-muted">
            Target {formatMinutes(task.targetMinutes)}
            {standard != null && standard !== task.targetMinutes ? ` (standard ${formatMinutes(standard)})` : ''}
            {taskType ? ` · ideal ${taskType.ideal}` : ' · custom task'}
          </p>
          <LinkChips links={task.links} className="mt-1" />
          <HistoryToggle task={task} open={historyOpen} onClick={() => setHistoryOpen((v) => !v)} className="mt-0.5" />
        </div>
        <OnTimeBadge task={task} />
        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        {canSubmit && (
          <Button
            onClick={() => {
              setError('');
              setSubmitOpen(true);
            }}
          >
            <Send size={13} /> {task.status === 'changes' ? 'Resubmit' : 'Submit'}
          </Button>
        )}
        {task.status === 'in_review' && (
          <span className="text-xs text-muted">
            with {firstName(task.reviewerId)} since {formatTimeOrDateTime(task.submittedAt)}
          </span>
        )}
        {mySent && (
          <>
            <Button tone="ghost" className="border border-line" onClick={() => setEditSent(true)}>
              <Pencil size={13} /> Edit
            </Button>
            <Button tone="ghost" className="border border-line" aria-label={`Delete ${task.title}`} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} /> Delete
            </Button>
          </>
        )}
        {task.status === 'done' && task.approvedAt && (
          <span className="text-xs text-muted">approved {formatTimeOrDateTime(task.approvedAt)}</span>
        )}
      </div>
      {task.status === 'changes' && lastFeedback && (
        <p className="mt-2 rounded-lg border-l-4 border-butter-strong bg-butter/50 px-3 py-2 text-sm">
          <b>{firstName(lastFeedback.by)}</b>{' '}
          <span className="text-xs text-muted">{formatTimeOrDateTime(lastFeedback.at)}</span>: {lastFeedback.text}
        </p>
      )}
      {historyOpen && <TaskHistory task={task} className="mt-2" />}
      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title={isResubmit ? 'Resubmit for approval' : 'Submit for approval'}
        description={task.title}
        size="sm"
        footer={
          <Button
            onClick={() => {
              if (runAction(() => submitForReview(task.id, doneQty, minutes, reviewerId, links), setError)) {
                setSubmitOpen(false);
                showToast({
                  title: `${isResubmit ? 'Resubmitted' : 'Sent'} to ${firstName(reviewerId)} for approval`,
                  tone: 'success',
                });
              }
            }}
          >
            <Send size={14} /> Send to {firstName(reviewerId)}
          </Button>
        }
      >
        <label className="text-sm font-semibold">
          Who should review it?
          <select
            className={cx(inputClass, 'mt-1')}
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
          >
            {reviewers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">
            {task.unit[0].toUpperCase() + task.unit.slice(1)} done
            <input
              type="number"
              min={1}
              className={cx(inputClass, 'mt-1')}
              value={doneQty}
              onChange={(e) => setDoneQty(+e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Minutes taken
            <input
              type="number"
              min={1}
              className={cx(inputClass, 'mt-1')}
              value={minutes}
              onChange={(e) => setMinutes(+e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_MINUTES.map((m) => (
            <Button
              key={m}
              type="button"
              tone={m === minutes ? 'primary' : 'ghost'}
              className="border border-line"
              onClick={() => setMinutes(m)}
            >
              {formatMinutes(m)}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          Target: {formatMinutes(task.targetMinutes)} for {task.qty}{task.unit && !/^\d+$/.test(String(task.unit).trim()) ? ` ${task.unit}` : ''}
        </p>
        <div className="mt-4 text-sm font-semibold">
          Links <span className="font-normal text-muted">(optional: the sheet or doc to check)</span>
          <div className="mt-1">
            <LinkInputs value={links} onChange={setLinks} />
          </div>
        </div>
        {isResubmit && (
          <p className="mt-1 text-xs text-muted">
            This will be resubmit {(task.resubmits ?? 0) + 1}. The time you send it is recorded in the task history.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-coral-ink">
            {error}
          </p>
        )}
      </Modal>
      {mySent && (
        <>
          <Modal
            open={editSent}
            onClose={() => setEditSent(false)}
            title="Edit what you sent"
            description="Changes what the reviewer sees. It stays with them for approval."
            size="sm"
            footer={
              <Button
                onClick={() => {
                  if (runAction(() => editApproval(task.id, { title: sentTitle, links: sentLinks, note: sentNote }), setError)) {
                    setEditSent(false);
                    showToast({ title: 'Updated', tone: 'success' });
                  }
                }}
              >
                Save
              </Button>
            }
          >
            <label className="text-sm font-semibold">
              What was the task?
              <input className={cx(inputClass, 'mt-1')} value={sentTitle} onChange={(e) => setSentTitle(e.target.value)} />
            </label>
            <div className="mt-3 text-sm font-semibold">
              Links
              <div className="mt-1">
                <LinkInputs value={sentLinks} onChange={setSentLinks} />
              </div>
            </div>
            <label className="mt-3 block text-sm font-semibold">
              Note <span className="font-normal text-muted">(optional)</span>
              <input className={cx(inputClass, 'mt-1')} value={sentNote} onChange={(e) => setSentNote(e.target.value)} />
            </label>
            {error && (
              <p role="alert" className="mt-2 text-sm font-semibold text-coral-ink">
                {error}
              </p>
            )}
          </Modal>
          <ConfirmModal
            open={confirmDelete}
            title="Withdraw this?"
            message={`"${task.title}" will be removed and will no longer wait for ${firstName(task.reviewerId)}. This cannot be undone.`}
            onClose={() => setConfirmDelete(false)}
            onConfirm={() => runAction(() => { deleteTask(task.id); showToast({ title: 'Removed', tone: 'info' }); })}
          />
        </>
      )}
    </li>
  );
}

export default TaskRow;
