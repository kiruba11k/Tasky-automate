import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { request } from '@/api/client';
import { Modal } from '../kit/Modal';
import { ConfirmModal } from '../kit/ConfirmModal';
import { toast } from '../kit/toast';
import { Button } from '../ui/Button';
import { setPeople } from '../lib/people';
import { PersonDialog, ROLES, roleOfUser } from './PersonDialog';

const label = Object.fromEntries(ROLES);

/** The main admin's people list: add, edit, deactivate and delete. */
export function ManagePeople({ open, onClose }) {
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null); // user record, or {} for a new person
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [list, people] = await Promise.all([request('GET', '/api/entities/User?sort=full_name'), request('GET', '/api/tracker/people')]);
    const ownerId = people.find((p) => p.owner)?.id;
    setUsers(list.map((u) => ({ ...u, isOwner: u.id === ownerId })));
    setPeople(people);
  }, []);
  useEffect(() => { if (open) load().catch((e) => setError(e.message)); }, [open, load]);

  const toggleActive = async (u) => {
    try {
      await request('PUT', `/api/entities/User/${u.id}`, { status: u.status === 'Inactive' ? 'Active' : 'Inactive' });
      toast({ title: u.status === 'Inactive' ? `${u.full_name} is active again` : `${u.full_name} can no longer sign in`, tone: 'info' });
      await load();
    } catch (e) { setError(e.message); }
  };
  const remove = async (u) => {
    try {
      await request('DELETE', `/api/entities/User/${u.id}`);
      toast({ title: `${u.full_name} removed`, tone: 'info' });
      await load();
    } catch (e) { setError(e.message); }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Manage people"
        description="Only you, the main admin, can add, edit or remove people. Deactivate someone to stop them signing in but keep their history."
        size="lg"
        footer={<Button onClick={() => setEditing({})}><Plus size={14} /> Add person</Button>}
      >
        {error && <p role="alert" className="mb-2 text-sm text-coral-ink">{error}</p>}
        <ul className="divide-y divide-line" data-testid="manage-people">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <div className="min-w-[180px] flex-1">
                <p className="font-semibold">
                  {u.full_name}
                  {u.isOwner && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-ink">Main admin</span>}
                  {u.status === 'Inactive' && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">Inactive</span>}
                </p>
                <p className="text-xs text-muted">{u.email} · {label[roleOfUser(u)]}{u.designation ? ` · ${u.designation}` : ''}</p>
              </div>
              <Button tone="ghost" className="border border-line" aria-label={`Edit ${u.full_name}`} onClick={() => setEditing(u)}>
                <Pencil size={13} /> Edit
              </Button>
              {!u.isOwner && (
                <>
                  <Button tone="ghost" className="border border-line" onClick={() => toggleActive(u)}>
                    {u.status === 'Inactive' ? 'Reactivate' : 'Deactivate'}
                  </Button>
                  <Button tone="ghost" className="border border-line" aria-label={`Delete ${u.full_name}`} onClick={() => setRemoving(u)}>
                    <Trash2 size={13} /> Delete
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Modal>
      <PersonDialog open={!!editing} person={editing?.id ? editing : null} onClose={() => setEditing(null)} onSaved={load} />
      <ConfirmModal
        open={!!removing}
        title={`Delete ${removing?.full_name ?? ''}?`}
        message="This removes the account for good. Their past tasks stay in the history but show no name. Deactivating keeps everything and is usually better."
        onClose={() => setRemoving(null)}
        onConfirm={() => remove(removing)}
      />
    </>
  );
}

export default ManagePeople;
