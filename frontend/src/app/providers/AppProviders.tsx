import { useEffect, type ReactNode } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ErrorBoundary } from './ErrorBoundary';

/** Global providers: error boundary + React Flow context. */
export function AppProviders({ children }: { children: ReactNode }) {
  // Ensure the document stays strictly in light mode.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }, []);

  return (
    <ErrorBoundary>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </ErrorBoundary>
  );
}
