import { Component } from 'react';
import { Card } from '@/internal/ui/Card';
import { Button } from '@/internal/ui/Button';

/** Top-level error boundary with retry / reset-demo-data (original: `oue`). */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <Card className="max-w-md text-center">
          <p className="text-lg font-bold">Something went wrong</p>
          <p className="mt-1 text-sm text-muted">{this.state.error.message}</p>
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
