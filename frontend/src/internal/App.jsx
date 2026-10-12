import { useEffect } from 'react';
import { ErrorBoundary } from './shell/ErrorBoundary';
import { Shell } from './shell/Shell';

/**
 * App root (original: `sue`). The integrator mounts it inside a HashRouter
 * (the bundle's `jB` was the router provider) and StrictMode.
 */
export function App() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);
  return (
    <ErrorBoundary>
      <Shell />
    </ErrorBoundary>
  );
}

export default App;
