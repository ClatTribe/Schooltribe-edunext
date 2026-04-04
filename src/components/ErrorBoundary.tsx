import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Vidyaa] Uncaught error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError =
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Loading CSS chunk');

      return (
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-4 text-5xl" aria-hidden="true">
              {isChunkError ? '📡' : '⚠️'}
            </div>
            <h1 className="mb-2 text-xl font-bold text-white">
              {isChunkError ? 'Connection Issue' : 'Something went wrong'}
            </h1>
            <p className="mb-6 text-sm text-slate-400">
              {isChunkError
                ? 'A new version may be available, or you may be offline. Please try reloading.'
                : 'An unexpected error occurred. Please try again.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="rounded-lg border border-surface-600 bg-surface-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-surface-600"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
              >
                Reload Page
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 overflow-auto rounded-lg bg-surface-900 p-3 text-left text-xs text-red-400">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
