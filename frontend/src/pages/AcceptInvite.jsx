import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthShell from '@/auth/AuthShell';
import { useAuth } from '@/auth/AuthContext';
import { request } from '@/api/client';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { acceptInvite } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    request('GET', `/api/auth/invite/${encodeURIComponent(token)}`)
      .then(setInvite)
      .catch((e) => setError(e.message))
      .finally(() => setChecking(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      await acceptInvite(token, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (checking) return <AuthShell title="Checking invitation..." />;
  if (!invite) {
    return (
      <AuthShell title="Invitation unavailable" subtitle={error || 'This invitation is invalid or has expired.'}>
        <Link to="/" className="text-blue-400 hover:underline">Go to sign in</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={`Welcome, ${invite.full_name}`} subtitle={`Set a password for ${invite.email} to activate your account.`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pw" className="text-slate-200">Password (min. 8 characters)</Label>
          <Input id="pw" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw2" className="text-slate-200">Confirm password</Label>
          <Input id="pw2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{busy ? 'Activating...' : 'Activate account'}</Button>
      </form>
    </AuthShell>
  );
}
