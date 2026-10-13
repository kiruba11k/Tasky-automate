import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { request } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '../ui/Button';
import { INPUT_CLASS } from '../ui/format';

/** People who signed in before passwords existed are asked, once per visit, to choose one. */
export function PasswordPrompt() {
  const { user, setUser } = useAuth();
  const [gone, setGone] = useState(false);
  const [password, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user || user.has_password !== false || gone) return null;
  const save = async (e) => {
    e.preventDefault();
    if (password !== again) { setError('The two passwords are different.'); return; }
    setBusy(true); setError('');
    try { await request('POST', '/api/auth/change-password', { password }); setUser({ ...user, has_password: true }); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="pw-card" role="dialog" aria-label="Choose a password">
      <button className="pw-x" aria-label="Later" onClick={() => setGone(true)}><X size={14} /></button>
      <p className="flex items-center gap-2 text-sm font-bold"><KeyRound size={16} /> Choose a password</p>
      <p className="mb-2 text-xs text-muted">From your next sign-in, your email needs a password.</p>
      <form onSubmit={save} className="space-y-2">
        <input type="password" autoComplete="new-password" required minLength={8} placeholder="New password (8+ characters)" value={password} onChange={(e) => setPw(e.target.value)} className={INPUT_CLASS} />
        <input type="password" autoComplete="new-password" required placeholder="Type it again" value={again} onChange={(e) => setAgain(e.target.value)} className={INPUT_CLASS} />
        {error && <p role="alert" className="text-xs text-coral-ink">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : 'Save password'}</Button>
      </form>
    </div>
  );
}

export default PasswordPrompt;
