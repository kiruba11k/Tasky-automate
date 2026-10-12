import { useState } from 'react';
import { request } from '@/api/client';
import { Modal } from '../kit/Modal';
import { toast } from '../kit/toast';
import { Button } from '../ui/Button';
import { INPUT_CLASS } from '../ui/format';
import { setPeople } from '../lib/people';

const ROLES = [
  ['resource', 'Resource'],
  ['pm', 'Project Manager'],
  ['manager', 'Manager'],
  ['founder', 'Founder (plain view)'],
];
// tracker role -> the account's access level on the server
const ACCESS = { resource: 'team_member', pm: 'team_leader', manager: 'admin', founder: 'admin' };

/** Adds a person by work email; only people added here can sign in. */
export function AddPerson({ open, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'resource', title: '' });
  const roles = ROLES; // every admin (manager, founder, project manager) can add anyone
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await request('POST', '/api/entities/User', {
        full_name: form.name.trim(),
        email: form.email.trim(),
        role: ACCESS[form.role],
        track_role: form.role === 'founder' ? undefined : form.role,
        founder: form.role === 'founder' ? true : undefined,
        designation: form.title.trim() || undefined,
      });
      setPeople(await request('GET', '/api/tracker/people'));
      toast({ title: `${form.name.trim()} can now sign in`, tone: 'success' });
      setForm({ name: '', email: '', role: 'resource', title: '' });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a person" description="They sign in with this email. No password is needed.">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium">
          Full name
          <input required className={`${INPUT_CLASS} mt-1`} value={form.name} onChange={set('name')} />
        </label>
        <label className="block text-sm font-medium">
          Work email
          <input required type="email" className={`${INPUT_CLASS} mt-1`} value={form.email} onChange={set('email')} />
        </label>
        <label className="block text-sm font-medium">
          Role
          <select className={`${INPUT_CLASS} mt-1`} value={form.role} onChange={set('role')}>
            {roles.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Job title <span className="font-normal text-muted">(optional)</span>
          <input className={`${INPUT_CLASS} mt-1`} value={form.title} onChange={set('title')} />
        </label>
        {error && <p role="alert" className="text-sm text-coral-ink">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" tone="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add person'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default AddPerson;
