import { useState } from 'react';
import { Send } from 'lucide-react';
import {
  Se as useStore,
  Te as Button,
  Ya as Modal,
  Ge as inputClass,
  oe as cx,
  be as firstName,
  lt as runAction,
  Ye as showToast,
} from '@/internal/min';
import { LinkInputs } from '../ui/LinkFields';
import { useReviewerOptions } from './reviewerOptions';

/** "Send for approval": work that nobody assigned as a task goes straight to a reviewer (with optional links and a note). */
export function SendForApproval() {
  const { me, projects, requestApproval } = useStore();
  const mine = projects.filter(
    (p) => p.status === 'active' && (p.pmId === me || p.teamIds.includes(me) || p.admins?.includes(me)),
  );
  const choices = mine.length ? mine : projects.filter((p) => p.status === 'active');
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(choices[0]?.id ?? '');
  const reviewers = useReviewerOptions(projectId);
  const [picked, setPicked] = useState('');
  const [title, setTitle] = useState('');
  const [links, setLinks] = useState(['']);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const reviewerId = picked || reviewers[0]?.id || '';

  const send = () => {
    if (runAction(() => requestApproval({ projectId, title, links, reviewerId, note }), setError)) {
      setOpen(false);
      setTitle('');
      setLinks(['']);
      setNote('');
      showToast({ title: `Sent to ${firstName(reviewerId)} for approval`, tone: 'success' });
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setError('');
          setOpen(true);
        }}
      >
        <Send size={13} /> Send for approval
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Send for approval"
        description="For work that was not assigned as a task"
        size="sm"
        footer={
          <Button onClick={send}>
            <Send size={14} /> Send to {firstName(reviewerId)}
          </Button>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-semibold">
            Project
            <select
              className={cx(inputClass, 'mt-1')}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setPicked('');
              }}
            >
              {choices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Task
            <input
              className={cx(inputClass, 'mt-1')}
              placeholder="e.g. Pitch deck for Acme"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="text-sm font-semibold">
            Links <span className="font-normal text-muted">(optional)</span>
            <div className="mt-1">
              <LinkInputs value={links} onChange={setLinks} />
            </div>
          </div>
          <label className="block text-sm font-semibold">
            Who should approve it?
            <select className={cx(inputClass, 'mt-1')} value={reviewerId} onChange={(e) => setPicked(e.target.value)}>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Note <span className="font-normal text-muted">(optional)</span>
            <input
              className={cx(inputClass, 'mt-1')}
              placeholder="Anything they should know"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-coral-ink">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}

export default SendForApproval;
