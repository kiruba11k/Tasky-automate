import { useState } from 'react';
import { Check, CheckCheck, MessageSquare, Forward, Star, Repeat } from 'lucide-react';
import {
  Se as useStore,
  qe as Badge,
  Te as Button,
  vt as Avatar,
  Ya as Modal,
  Ge as inputClass,
  oe as cx,
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
/** " messages" for a unit that is a word; nothing for a missing unit or one that is only digits (a custom task's unit can hold the quantity). */
const unitText = (unit) => (unit && !/^\d+$/.test(String(unit).trim()) ? ` ${String(unit).trim()}` : '');

export function ReviewRow({ task, projectName }) {
  const { approve, approvePart, sendBack, forwardReview } = useStore();
  const forwardTargets = useReviewerOptions(task.projectId).filter((o) => o.id !== task.assigneeId);
  const [panel, setPanel] = useState(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveMode, setApproveMode] = useState('all');
  const [partQty, setPartQty] = useState('');
  const [leftover, setLeftover] = useState('end'); // what happens to the part not done: end it here, or send it to the next working day
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
              : `${firstName(task.assigneeId)} · ${projectName} · ${task.doneQty} out of ${task.qty}${unitText(task.unit)} in ${formatMinutes(task.minutes ?? 0)} (target ${formatMinutes(task.targetMinutes)})`}
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
          onClick={() => {
            if (task.adhoc || task.qty <= 1) {
              runAction(() => {
                approve(task.id);
                showToast({ title: `Approved, ${firstName(task.assigneeId)} notified`, tone: 'success' });
              });
              return;
            }
            setPartQty('');
            setNote('');
            setApproveMode('all');
            setApproveOpen(true);
          }}
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
      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve" description={task.title} size="sm">
        <div className="space-y-3" data-testid="approve-choice">
          <button
            className={cx(
              'focus-ring w-full rounded-xl border-2 p-3 text-left transition',
              approveMode === 'all' ? 'border-accent bg-accent-soft/40' : 'border-line hover:border-accent/50',
            )}
            onClick={() => setApproveMode('all')}
          >
            <p className="flex items-center gap-2 font-semibold">
              <CheckCheck size={15} className="text-mint-ink" /> Approve all {task.doneQty ?? task.qty} out of {task.qty}{unitText(task.unit)}
            </p>
            <p className="text-xs text-muted">Everything submitted is good.</p>
          </button>
          {approveMode === 'all' && (task.doneQty ?? task.qty) < task.qty && (
            <fieldset className="space-y-1.5 rounded-xl bg-surface-2/60 p-3 text-sm" data-testid="approve-leftover">
              <legend className="px-1 text-xs font-semibold text-muted">
                {task.qty - (task.doneQty ?? task.qty)} of {task.qty} were not done. What next?
              </legend>
              {[
                ['end', 'End it here', 'Nothing more is asked of them for this task.'],
                ['tomorrow', 'Send the rest to the next working day', `A new task for the ${task.qty - (task.doneQty ?? task.qty)} left, assigned to ${firstName(task.assigneeId)}.`],
              ].map(([value, label, hint]) => (
                <label key={value} className="flex cursor-pointer items-start gap-2">
                  <input type="radio" name={`leftover-${task.id}`} className="mt-1" checked={leftover === value} onChange={() => setLeftover(value)} />
                  <span>
                    <span className="font-semibold">{label}</span>
                    <span className="block text-xs text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <button
            className={cx(
              'focus-ring w-full rounded-xl border-2 p-3 text-left transition',
              approveMode === 'part' ? 'border-accent bg-accent-soft/40' : 'border-line hover:border-accent/50',
            )}
            onClick={() => setApproveMode('part')}
          >
            <p className="flex items-center gap-2 font-semibold">
              <Repeat size={15} className="text-butter-ink" /> Approve part
            </p>
            <p className="text-xs text-muted">Approve some, send the rest back for rework.</p>
          </button>
          {approveMode === 'part' && (
            <div className="space-y-2 rounded-xl bg-surface-2/60 p-3" data-testid="approve-part">
              <label className="block text-xs font-semibold text-muted">
                Approve how many?
                <span className="mt-1 flex items-center gap-1.5">
                  <input
                    aria-label="Approved quantity"
                    type="number"
                    min={1}
                    max={task.qty - 1}
                    autoFocus
                    className={cx(inputClass, 'w-24 text-right')}
                    value={partQty}
                    onChange={(e) => setPartQty(e.target.value)}
                    placeholder={String(Math.floor(task.qty / 2))}
                  />
                  <span className="text-sm text-ink">
                    of {task.qty}{unitText(task.unit)}
                  </span>
                </span>
              </label>
              <label className="block text-xs font-semibold text-muted">
                What needs rework for the rest?
                <input
                  aria-label="Rework note"
                  className={cx(inputClass, 'mt-1')}
                  placeholder="e.g. Wrong persona on 10 of them, redo with the CFO angle"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button tone="ghost" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            {approveMode === 'all' ? (
              <Button
                onClick={() => {
                  if (runAction(() => approve(task.id, { carryRest: leftover === 'tomorrow' }))) {
                    setApproveOpen(false);
                    showToast({ title: `Approved, ${firstName(task.assigneeId)} notified`, tone: 'success' });
                  }
                }}
              >
                <Check size={13} /> Approve all
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const count = Math.round(+partQty);
                  if (runAction(() => approvePart(task.id, count, note))) {
                    setApproveOpen(false);
                    setNote('');
                    showToast({
                      title: `Approved ${count}, ${task.qty - count} sent back to ${firstName(task.assigneeId)}`,
                      tone: 'success',
                    });
                  }
                }}
              >
                <Check size={13} />{' '}
                {+partQty > 0 && +partQty < task.qty
                  ? `Approve ${Math.round(+partQty)}, send back ${task.qty - Math.round(+partQty)}`
                  : 'Approve part'}
              </Button>
            )}
          </div>
        </div>
      </Modal>
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
