import type { ReactNode } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ErrorBoundary } from './ErrorBoundary';

/** Global providers: error boundary + React Flow context. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </ErrorBoundary>
  );
}
