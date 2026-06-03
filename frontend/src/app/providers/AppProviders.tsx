import { useEffect, type ReactNode } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ErrorBoundary } from './ErrorBoundary';
import { applyThemeClass, useThemeStore } from '../../store/themeStore';

/** Global providers: error boundary + React Flow context + theme sync. */
export function AppProviders({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  // Keep the <html> class in sync (covers first paint + external changes).
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </ErrorBoundary>
  );
}
