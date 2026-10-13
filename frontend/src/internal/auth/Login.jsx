import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '../ui/Button';
import { INPUT_CLASS } from '../ui/format';

const Field = ({ label, children }) => <label className="block text-sm font-medium">{label}{children}</label>;

/**
 * Sign-in: email, then password. The first time an added email signs in it has no password yet, so it is sent on to choose one;
 * from the second time on the email needs its password. Access is limited to people a manager has added.
 */
export function Login() {
  const { login, setPassword } = useAuth();
  const [step, setStep] = useState('email'); // email | password | setup
  const [email, setEmail] = useState('');
  const [password, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [name, setName] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const next = (res) => {
    if (res?.setup) { setSetupToken(res.setupToken); setName(res.name); setStep('setup'); setPw(''); setAgain(''); }
    else if (res?.needsPassword) { setName(res.name); setStep('password'); setPw(''); }
  };

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (step === 'email') next(await login(email));
      else if (step === 'password') next(await login(email, password));
      else {
        if (password !== again) throw new Error('The two passwords are different.');
        await setPassword(setupToken, password);
      }
    });
  };

  const title = step === 'setup' ? 'Choose your password' : 'Sign in';
  const hint = step === 'email'
    ? 'Enter your work email. Access is limited to people a manager has added.'
    : step === 'password' ? `Welcome back${name ? `, ${name.split(' ')[0]}` : ''}. Enter your password.`
      : `Welcome${name ? `, ${name.split(' ')[0]}` : ''}! This is your first time here, so choose a password. You will use it with your email from now on.`;

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
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mb-4 text-sm text-muted">{hint}</p>
        <form onSubmit={submit} className="space-y-3">
          {/* the email stays in the form on later steps so password managers see a normal sign-in form */}
          <Field label="Email">
            <input type="email" autoComplete="username" required autoFocus={step === 'email'} readOnly={step !== 'email'} value={email} onChange={(e) => setEmail(e.target.value)} className={`${INPUT_CLASS} mt-1 ${step !== 'email' ? 'opacity-70' : ''}`} />
          </Field>
          {step !== 'email' && (
            <Field label={step === 'setup' ? 'New password' : 'Password'}>
              <input type="password" autoComplete={step === 'setup' ? 'new-password' : 'current-password'} required autoFocus minLength={step === 'setup' ? 8 : undefined} value={password} onChange={(e) => setPw(e.target.value)} className={`${INPUT_CLASS} mt-1`} />
            </Field>
          )}
          {step === 'setup' && (
            <>
              <Field label="Type it again">
                <input type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} className={`${INPUT_CLASS} mt-1`} />
              </Field>
              <p className="text-xs text-muted">At least 8 characters.</p>
            </>
          )}
          {error && <p role="alert" className="text-sm text-coral-ink">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'One moment…' : step === 'email' ? 'Continue' : step === 'setup' ? 'Save and sign in' : 'Sign in'}
          </Button>
          {step !== 'email' && (
            <button type="button" className="focus-ring w-full rounded-lg py-1 text-xs text-muted hover:underline" onClick={() => { setStep('email'); setError(''); setPw(''); }}>
              Use a different email
            </button>
          )}
          {step === 'password' && <p className="text-center text-xs text-muted">Forgot it? Ask the main admin to reset your password.</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;
