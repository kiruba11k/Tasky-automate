import React, { useState } from 'react';
import { BellRing, Pencil, Star, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../kit/ConfirmModal';
import { taskBreakdownKey } from '../lib/domain';
import {
  Se as useStore,
  vt as Avatar,
  qe as Badge,
  Lh as TaskFlags,
  be as personName,
  We as formatMinutes,
  $e as dayKey,
  yt as formatDay,
  _U as TaskProgress,
  Bh as TaskDetailsToggle,
  mi as STATUS_META,
  Te as Button,
  lt as guard,
  Ye as toast,
  zh as TaskDetails,
  Ge as INPUT_CLASS,
  yf as DifficultyHint,
  Hw as standardMinutesForTask,
} from '@/internal/min';

/** One still-open task the manager assigned: remind or edit. */
export function AssignedTaskRow({ t: task }) {
  const { projects, editTask, remind, deleteTask, daily } = useStore();
  // what the assignee has typed for this work in their Daily update so far (it goes for approval when they send the day)
  const logged = daily[`${task.assigneeId}|${task.date}`]?.asg?.[`asg|${task.assigneeId}|${task.date}|${task.projectId}|${taskBreakdownKey(task).key}`]?.doneQty;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [qty, setQty] = useState(task.qty);
  const [targetMinutes, setTargetMinutes] = useState(task.targetMinutes);
  const [title, setTitle] = useState(task.title);
  const canRemind = task.status !== 'done' && task.status !== 'in_review';
  const baseStandard = standardMinutesForTask(task);
  const standard =
    baseStandard != null && qty > 0 && task.qty > 0
      ? Math.max(1, Math.round((baseStandard * qty) / task.qty))
      : baseStandard;

  return (
    <li className="py-3" data-assigned={task.id}>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Avatar id={task.assigneeId} size="sm" />
        <div className="min-w-[200px] flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold first-letter:uppercase">
            {task.title}{' '}
            {task.priority && (
              <Badge tone="coral">
                <Star size={11} /> Priority
              </Badge>
            )}
            <TaskFlags task={task} />
          </p>
          <p className="text-xs text-muted">
            {personName(task.assigneeId)}
            {' · '}
            {projects.find((k) => k.id === task.projectId)?.name}
            {' · target '}
            {formatMinutes(task.targetMinutes)}
            {task.date !== dayKey(0) ? ` · for ${formatDay(task.date)}` : ''}
            {task.reminders > 0 && ` · reminded ${task.reminders}x`}
          </p>
          {logged > 0 && task.status !== 'done' && task.status !== 'in_review' && (
            <p className="text-xs text-accent-ink" data-testid="logged-hint">
              {personName(task.assigneeId).split(' ')[0]} has logged {logged} in their daily update, not sent for approval yet
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <TaskProgress task={task} />
            <TaskDetailsToggle task={task} open={detailsOpen} onClick={() => setDetailsOpen((k) => !k)} />
          </div>
        </div>
        <Badge tone={STATUS_META[task.status].tone}>{STATUS_META[task.status].label}</Badge>
        {canRemind && (
          <Button
            tone="ghost"
            className="border border-line"
            onClick={() =>
              guard(() => {
                remind(task.id);
                toast({
                  title: `Reminder sent to ${personName(task.assigneeId)}`,
                  tone: 'info',
                });
              })
            }
          >
            <BellRing size={13} /> Remind
          </Button>
        )}
        {task.status !== 'done' && (
          <Button tone="ghost" className="border border-line" onClick={() => setEditing((k) => !k)}>
            <Pencil size={13} /> Edit
          </Button>
        )}
        <Button tone="ghost" className="border border-line" aria-label={`Delete ${task.title}`} onClick={() => setConfirmDelete(true)}>
          <Trash2 size={13} /> Delete
        </Button>
      </div>
      <ConfirmModal
        open={confirmDelete}
        title="Delete this task?"
        message={`"${task.title}" will be removed for ${personName(task.assigneeId)} as well. This cannot be undone.`}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => guard(() => { deleteTask(task.id); toast({ title: 'Task deleted', tone: 'info' }); })}
      />
      {detailsOpen && <TaskDetails task={task} className="mt-2 sm:ml-10" />}
      {editing && (
        <form
          className="mt-2 sm:ml-10 space-y-2"
          onSubmit={(k) => {
            k.preventDefault();
            if (guard(() => editTask(task.id, { qty, targetMinutes, title }))) {
              setEditing(false);
              toast({ title: 'Task updated', tone: 'success' });
            }
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_100px_120px_auto]">
            <input
              aria-label="Title"
              className={INPUT_CLASS}
              value={title}
              onChange={(k) => setTitle(k.target.value)}
            />
            <input
              aria-label="Quantity"
              type="number"
              min={1}
              className={INPUT_CLASS}
              value={qty}
              onChange={(k) => setQty(+k.target.value)}
            />
            <input
              aria-label="Target minutes"
              type="number"
              min={1}
              className={INPUT_CLASS}
              value={targetMinutes}
              onChange={(k) => setTargetMinutes(+k.target.value)}
            />
            <Button type="submit">Save</Button>
          </div>
          {targetMinutes > 0 && <DifficultyHint target={targetMinutes} standard={standard} />}
        </form>
      )}
    </li>
  );
}

export default AssignedTaskRow;
