import { TopNav } from '../layouts/TopNav';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout';
import { ExportModal } from '../features/workspace/components/ExportModal';
import { useBootstrapPipeline } from '../features/workspace/hooks/useBootstrapPipeline';

export function WorkspacePage() {
  useBootstrapPipeline();

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
      <TopNav />
      <WorkspaceLayout />
      <ExportModal />
    </div>
  );
}
