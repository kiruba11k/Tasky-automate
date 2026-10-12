import { Component } from 'react';
import { Card } from '@/internal/ui/Card';
import { Button } from '@/internal/ui/Button';

/** Top-level error boundary with retry / reset-demo-data (original: `oue`). */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Leave a trace so a report can say where it happened.
    console.error('[tracker] render error:', error, info?.componentStack);
    this.setState({ where: String(info?.componentStack || error?.stack || '').split('\n').filter(Boolean).slice(0, 8).join('\n') });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <Card className="max-w-md text-center">
          <p className="text-lg font-bold">Something went wrong</p>
          <p className="mt-1 text-sm text-muted">{this.state.error.message}</p>
          {this.state.where && (
            <details className="mt-2 text-left text-xs text-muted">
              <summary className="cursor-pointer">Details for support</summary>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{this.state.where}</pre>
            </details>
          )}
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button tone="ghost" className="border border-line" onClick={() => location.reload()}>
              Reload the page
            </Button>
          </div>
        </Card>
      </div>
    );
  }
}

export default ErrorBoundary;
