import { useState } from 'react';
import { Check, MessageSquare, Moon } from 'lucide-react';
import {
  Se as useStore,
  rt as Card,
  qe as Badge,
  Te as Button,
  vt as Avatar,
  Ge as inputClass,
  nt as personName,
  be as firstName,
  We as formatMinutes,
  yt as formatDate,
  lt as runAction,
  Ye as showToast,
} from '@/internal/min';
import { PEOPLE, isLeadership, roleOf } from '../lib/constants.js';
import { weekRows } from '../lib/entries.js';
import { assignedDay, weekAssignedRows } from '../lib/assigned.js';
import { assignedContext, eodReviewerOf, groupByProject, pendingForReviewer, sendSummary, taskReviewLabel } from '../lib/eodReview.js';
import { todayKey } from '../lib/dates.js';
import { entryName, rowDone, rowTarget } from '../daily/entryHelpers';
import { formatClock } from '../daily/dateHelpers';

const KIND_LABEL = { number: 'Number', milestone: 'Milestone', text: 'Text' };

const TASK_TONE = { approved: 'mint', 'awaiting approval': 'butter', 'changes asked': 'coral', 'in progress': 'sky', 'to do': 'grey' };

/**
 * A task assigned to the person, shown beside their end of day as context. Tasks stay approved the normal way: only the task's
 * reviewer can approve or send one back here, which is the same action as in "Waiting for your review". The end of day decision
 * below covers the person's logged rows only.
 */
function TaskContext({ task }) {
  const { me, approve, sendBack } = useStore();
  const [panel, setPanel] = useState(false);
  const [note, setNote] = useState('');
  const label = taskReviewLabel(task);
  const mine = task.status === 'in_review' && task.reviewerId === me;
  return (
    <li className="py-1" data-eod-task={task.id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-[160px] flex-1 font-medium first-letter:uppercase">{task.title}</span>
        <Badge tone={TASK_TONE[label]}>{label}</Badge>
        {mine && (
          <>
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
            <Button tone="ghost" className="border border-line" onClick={() => setPanel((v) => !v)}>
              <MessageSquare size={13} /> Send back
            </Button>
          </>
        )}
      </div>
      {panel && (
        <form
          className="mt-1 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (runAction(() => sendBack(task.id, note))) {
              showToast({ title: `Feedback sent to ${firstName(task.assigneeId)}`, tone: 'info' });
              setNote('');
              setPanel(false);
            }
          }}
        >
          <input className={inputClass} autoFocus aria-label="Task feedback" placeholder="What should they change?" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit">Send</Button>
        </form>
      )}
    </li>
  );
}

/** One person's day for one project: the rows they reported, with Approve and Send back (feedback is required). */
function EodItem({ item, project }) {
  const decideDay = useStore((s) => s.decideEod);
  const decideWeek = useStore((s) => s.decideEow);
  const tasks = useStore((s) => s.tasks);
  const daily = useStore((s) => s.daily);
  const weekly = useStore((s) => s.weekly);
  const projectsAll = useStore((s) => s.projects);
  const isWeek = item.kind === 'week';
  const decideEod = isWeek ? decideWeek : decideDay;
  const context = isWeek ? [] : assignedContext(tasks, item.personId, item.day, item.projectId, todayKey(0));
  // a week's rows are the week table as the person sees it: day rows, assigned rows and rows added to the week, added up
  const record = daily[item.key.slice(item.key.indexOf(':') + 1)];
  const assignedRows = isWeek ? [] : assignedDay(tasks, item.personId, item.day, { projects: projectsAll, logged: record?.entries ?? [], asg: record?.asg ?? {}, carryEdits: record?.carryEdits ?? {}, defaultTaken: true }).rows.filter((r) => r.projectId === item.projectId);
  const shownRows = isWeek
    ? weekRows(item.personId, item.day, daily, weekly[`${item.personId}|${item.day}`]?.entries ?? [], weekly[`${item.personId}|${item.day}`]?.overrides, weekAssignedRows(tasks, daily, item.personId, item.day, { projects: projectsAll })).filter((r) => r.projectId === item.projectId)
    : [...item.rows, ...assignedRows];
  const [panel, setPanel] = useState(false);
  const [note, setNote] = useState('');
  const minutes = shownRows.reduce((s, r) => s + (r.actualMin ?? r.estMin ?? 0), 0);
  return (
    <li className="px-4 py-3" data-eod={`${item.key}:${item.projectId}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar id={item.personId} size="sm" />
        <div className="min-w-[200px] flex-1">
          <p className="text-sm font-semibold">
            {firstName(item.personId)} · {isWeek ? `Week of ${formatDate(item.day)}` : formatDate(item.day)}
          </p>
          <p className="text-xs text-muted">
            {sendSummary(shownRows.length, minutes)} · sent {formatClock(item.review.sentAt)}
          </p>
        </div>
        <Button
          onClick={() => {
            runAction(() => {
              decideEod(item.personId, item.day, item.projectId, 'approved');
              showToast({ title: `Approved, ${firstName(item.personId)} notified`, tone: 'success' });
            });
          }}
        >
          <Check size={13} /> Approve
        </Button>
        <Button tone="ghost" className="border border-line" onClick={() => setPanel((v) => !v)}>
          <MessageSquare size={13} /> Send back
        </Button>
      </div>
      {shownRows.length > 0 && (
        <div className="mt-2 overflow-x-auto sm:ml-10">
          <table className="w-full min-w-[560px] text-xs" aria-label={`${personName(item.personId)} ${project?.name ?? ''} rows`}>
            <thead>
              <tr className="text-left font-semibold uppercase tracking-wide text-muted">
                <th className="py-1 pr-2">Task</th>
                <th className="py-1 pr-2">Target</th>
                <th className="py-1 pr-2">Done</th>
                <th className="py-1 pr-2">Est. / took</th>
                <th className="py-1 pr-2">Notes</th>
                <th className="py-1">Kind</th>
              </tr>
            </thead>
            <tbody>
              {shownRows.map((r) => {
                const kind = r.kind ?? 'number';
                return (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="py-1 pr-2 font-medium">{entryName(r, project)}</td>
                    <td className="py-1 pr-2 tabular-nums">{kind === 'text' || kind === 'milestone' ? r.targetText || (kind === 'milestone' ? 'Milestone' : '·') : rowTarget(r) || '·'}</td>
                    <td className="py-1 pr-2 tabular-nums">{kind === 'text' ? r.actualText || '·' : kind === 'milestone' ? r.status ?? 'Not started' : rowDone(r)}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {formatMinutes(r.estMin ?? 0)} / {r.actualMin != null ? formatMinutes(r.actualMin) : '·'}
                    </td>
                    <td className="py-1 pr-2">{r.remarks || '·'}</td>
                    <td className="py-1">{KIND_LABEL[kind]}{kind === 'milestone' ? '' : r.status ? ` · ${r.status}` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {context.length > 0 && (
        <div className="mt-2 text-xs sm:ml-10" data-testid="eod-assigned">
          <p className="font-semibold uppercase tracking-wide text-muted">Assigned tasks (approved on their own)</p>
          <ul className="divide-y divide-line">
            {context.map((t) => (
              <TaskContext key={t.id} task={t} />
            ))}
          </ul>
        </div>
      )}
      {panel && (
        <form
          className="mt-2 flex gap-2 sm:ml-10"
          onSubmit={(e) => {
            e.preventDefault();
            if (runAction(() => decideEod(item.personId, item.day, item.projectId, 'changes', note))) {
              showToast({ title: `Feedback sent to ${firstName(item.personId)}`, tone: 'info' });
              setNote('');
              setPanel(false);
            }
          }}
        >
          <input className={inputClass} autoFocus aria-label="Feedback" placeholder="What should they change?" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit">Send</Button>
        </form>
      )}
    </li>
  );
}

/**
 * "End of day approvals": the end of day a person sent for a project goes to that project's manager. The manager sees theirs;
 * managers and founders see every project's. Only shown to people who can decide something.
 */
export function EodApprovals() {
  const { me, daily, weekly, projects } = useStore();
  const seesAll = isLeadership(roleOf(me));
  const ownerId = PEOPLE.find((p) => p.owner)?.id;
  const manages = projects.some((p) => eodReviewerOf(p, ownerId) === me);
  if (!seesAll && !manages) return null;
  const items = pendingForReviewer({ daily, weekly, projects, me, seesAll, ownerId });
  const groups = groupByProject(items);
  return (
    <div data-testid="eod-approvals">
    <Card className="p-0">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 font-bold">
          <Moon size={16} className="text-accent-ink" /> End of day and week approvals <Badge tone="lavender">{items.length}</Badge>
        </h2>
      </div>
      {!items.length && <p className="px-5 py-3 text-sm text-muted">No end of day or end of week is waiting for you.</p>}
      {groups.map(({ projectId, items: list }) => {
        const project = projects.find((p) => p.id === projectId);
        return (
          <section key={projectId} data-eod-project={projectId}>
            <p className="bg-surface-2/50 px-5 py-1.5 text-xs font-bold uppercase tracking-wide text-muted">{project?.name ?? 'Project'}</p>
            <ul className="divide-y divide-line">
              {list.map((it) => (
                <EodItem key={`${it.key}:${it.projectId}`} item={it} project={project} />
              ))}
            </ul>
          </section>
        );
      })}
    </Card>
    </div>
  );
}

export default EodApprovals;
