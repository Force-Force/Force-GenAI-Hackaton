import { Component, type ReactNode } from 'react';

interface State {
  hasError: boolean;
  message?: string;
}

/** Top-level error boundary so a render failure does not blank the app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white border border-rose-200 rounded-xl p-6 max-w-md text-center shadow-sm">
            <h1 className="text-sm font-bold text-rose-600">Something went wrong</h1>
            <p className="text-xs text-slate-600 mt-2 font-mono">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-[#4F46E5] text-white text-xs font-bold px-4 py-2 rounded-full cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
