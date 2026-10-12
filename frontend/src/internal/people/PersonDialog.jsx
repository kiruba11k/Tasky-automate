import { useEffect, useState } from 'react';
import { request } from '@/api/client';
import { Modal } from '../kit/Modal';
import { toast } from '../kit/toast';
import { Button } from '../ui/Button';
import { INPUT_CLASS } from '../ui/format';

export const ROLES = [
  ['resource', 'Resource'],
  ['pm', 'Project Manager'],
  ['manager', 'Manager'],
  ['founder', 'Founder'],
];
// tracker role -> the account's access level on the server
const ACCESS = { resource: 'team_member', pm: 'team_leader', manager: 'admin', founder: 'admin' };

/** The tracker role of a user record from the server. */
export const roleOfUser = (u) => (u.founder ? 'founder' : u.track_role || { admin: 'manager', team_leader: 'pm' }[u.role] || 'resource');

const blank = { name: '', email: '', role: 'resource', title: '', approver: false, active: true, doesTasks: false };
const fromUser = (u) => ({ name: u.full_name || '', email: u.email || '', role: roleOfUser(u), title: u.designation || '', approver: !!u.approver, active: u.status !== 'Inactive', doesTasks: !!u.does_tasks });

/** Add a person, or edit one when `person` (a user record) is given. Only the main admin gets here. */
export function PersonDialog({ open, onClose, person, onSaved }) {
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isOwner = !!person?.isOwner;
  useEffect(() => {
    if (open) { setForm(person ? fromUser(person) : blank); setError(''); }
  }, [open, person]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      full_name: form.name.trim(),
      email: form.email.trim(),
      designation: form.title.trim() || (person ? '' : undefined),
      does_tasks: ['manager', 'founder'].includes(form.role) ? form.doesTasks : false,
      ...(isOwner ? {} : {
        role: ACCESS[form.role],
        founder: form.role === 'founder',
        track_role: form.role === 'founder' ? undefined : form.role,
        approver: form.approver && ['manager', 'pm'].includes(form.role),
        status: form.active ? 'Active' : 'Inactive',
      }),
    };
    try {
      if (person) await request('PUT', `/api/entities/User/${person.id}`, body);
      else await request('POST', '/api/entities/User', body);
      toast({ title: person ? `${form.name.trim()} updated` : `${form.name.trim()} can now sign in`, tone: 'success' });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={person ? `Edit ${person.full_name}` : 'Add a person'}
      description={person ? undefined : 'They sign in with this email. No password is needed.'}
    >
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium">
          Full name
          <input required className={`${INPUT_CLASS} mt-1`} value={form.name} onChange={set('name')} />
        </label>
        <label className="block text-sm font-medium">
          Work email
          <input required type="email" disabled={isOwner} className={`${INPUT_CLASS} mt-1`} value={form.email} onChange={set('email')} />
        </label>
        {!isOwner && (
          <label className="block text-sm font-medium">
            Role
            <select className={`${INPUT_CLASS} mt-1`} value={form.role} onChange={set('role')}>
              {ROLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm font-medium">
          Job title <span className="font-normal text-muted">(optional)</span>
          <input className={`${INPUT_CLASS} mt-1`} value={form.title} onChange={set('title')} />
        </label>
        {!isOwner && ['manager', 'pm'].includes(form.role) && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.approver} onChange={(e) => setForm((f) => ({ ...f, approver: e.target.checked }))} />
            Can approve project proposals
          </label>
        )}
        {['manager', 'founder'].includes(form.role) && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.doesTasks} onChange={(e) => setForm((f) => ({ ...f, doesTasks: e.target.checked }))} />
            Also does tasks (shown as a team member and can be given work)
          </label>
        )}
        {person && !isOwner && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Active (can sign in)
          </label>
        )}
        {error && <p role="alert" className="text-sm text-coral-ink">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" tone="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : person ? 'Save changes' : 'Add person'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default PersonDialog;
