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
import { isLeadership, roleOf } from '../lib/constants.js';
import { groupByProject, pendingForReviewer, sendSummary } from '../lib/eodReview.js';
import { entryName, rowDone, rowTarget } from '../daily/entryHelpers';
import { formatClock } from '../daily/dateHelpers';

const KIND_LABEL = { number: 'Number', milestone: 'Milestone', text: 'Text' };

/** One person's day for one project: the rows they reported, with Approve and Send back (feedback is required). */
function EodItem({ item, project }) {
  const decideEod = useStore((s) => s.decideEod);
  const [panel, setPanel] = useState(false);
  const [note, setNote] = useState('');
  const minutes = item.rows.reduce((s, r) => s + (r.actualMin ?? r.estMin ?? 0), 0);
  return (
    <li className="px-4 py-3" data-eod={`${item.key}:${item.projectId}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar id={item.personId} size="sm" />
        <div className="min-w-[200px] flex-1">
          <p className="text-sm font-semibold">
            {firstName(item.personId)} · {formatDate(item.day)}
          </p>
          <p className="text-xs text-muted">
            {sendSummary(item.rows.length, minutes)} · sent {formatClock(item.review.sentAt)}
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
      {item.rows.length > 0 && (
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
              {item.rows.map((r) => {
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
  const { me, daily, projects } = useStore();
  const seesAll = isLeadership(roleOf(me));
  const manages = projects.some((p) => p.pmId === me);
  if (!seesAll && !manages) return null;
  const items = pendingForReviewer({ daily, projects, me, seesAll });
  const groups = groupByProject(items);
  return (
    <div data-testid="eod-approvals">
    <Card className="p-0">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 font-bold">
          <Moon size={16} className="text-accent-ink" /> End of day approvals <Badge tone="lavender">{items.length}</Badge>
        </h2>
      </div>
      {!items.length && <p className="px-5 py-3 text-sm text-muted">No end of day is waiting for you.</p>}
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
