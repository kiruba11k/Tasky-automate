import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ErrorBoundary } from './shell/ErrorBoundary';
import { Shell } from './shell/Shell';
import { Login } from './auth/Login';
import { startSync } from './sync';
import { FunLayer } from './fun/FunLayer';
import { FunBridge } from './fun/FunBridge';
import { PrefsSync } from './fun/PrefsSync';
import { Alerts } from './shell/Alerts';
import { PasswordPrompt } from './shell/PasswordPrompt';
import { useFunMode } from './fun/useFunMode';

/** Loads the signed-in person's data from the backend and keeps it in step; shows the app once the first load is done. */
function Tracker({ user }) {
  const { on: funOn } = useFunMode();
  const [state, setState] = useState({ ready: false, error: '' });
  useEffect(() => {
    let session;
    let dead = false;
    startSync(user)
      .then((s) => { if (dead) s.stop(); else { session = s; setState({ ready: true, error: '' }); } })
      .catch((e) => { if (!dead) setState({ ready: false, error: e.message || 'Could not load your data' }); });
    return () => { dead = true; session?.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]); // only a different person restarts the session, not a refreshed copy of the same user
  if (state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4 text-center">
        <div>
          <p role="alert" className="font-semibold">{state.error}</p>
          <button className="focus-ring mt-3 rounded-xl bg-accent px-3 py-1.5 text-sm font-semibold text-accent-on" onClick={() => location.reload()}>Try again</button>
        </div>
      </div>
    );
  }
  if (!state.ready) return <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted" role="status">Loading your tracker…</div>;
  return (
    <FunLayer>
      {funOn && <><FunBridge /><PrefsSync /></>}
      <Shell />
      <Alerts />
      <PasswordPrompt />
    </FunLayer>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted" role="status">Loading…</div>;
  return user ? <Tracker user={user} /> : <Login />;
}

/** App root. The integrator mounts it inside a HashRouter and StrictMode. */
export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
