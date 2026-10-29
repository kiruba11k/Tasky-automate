import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Se as useStore, Te as Button, lt as guard, Ye as toast } from '@/internal/min';
import { ConfirmModal } from '../kit/ConfirmModal';
import { ProjectFormModal } from './ProjectFormModal';

/** Edit or withdraw a project proposal the person sent, while it waits for approval. */
export function SentProposalActions({ p }) {
  const deleteProject = useStore((s) => s.deleteProject);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-4" data-testid="sent-proposal-actions">
      <Button tone="ghost" className="border border-line" onClick={() => setEditOpen(true)}>
        <Pencil size={13} /> Edit
      </Button>
      <Button tone="ghost" className="border border-line" aria-label={`Delete ${p.name}`} onClick={() => setConfirmOpen(true)}>
        <Trash2 size={13} /> Delete
      </Button>
      <ProjectFormModal open={editOpen} onClose={() => setEditOpen(false)} edit={p} />
      <ConfirmModal
        open={confirmOpen}
        title="Withdraw this proposal?"
        message={`"${p.name}" will be removed and will no longer wait for approval. This cannot be undone.`}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          guard(() => {
            deleteProject(p.id);
            toast({ title: 'Proposal removed', tone: 'info' });
          })
        }
      />
    </div>
  );
}

export default SentProposalActions;
