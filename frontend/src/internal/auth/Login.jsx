import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '../ui/Button';
import { INPUT_CLASS } from '../ui/format';

/** Sign-in: work email only; access is limited to people a manager has added. */
export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-lift">
        <div className="mb-5 flex items-center gap-3">
          <img src="/logo.jpg" alt="" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p className="text-sm font-extrabold tracking-tight">Lead Strategus</p>
            <p className="text-xs text-muted">Tracker</p>
          </div>
        </div>
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="mb-4 text-sm text-muted">Enter your work email. Access is limited to people a manager has added.</p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${INPUT_CLASS} mt-1`}
            />
          </label>
          {error && <p role="alert" className="text-sm text-coral-ink">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
