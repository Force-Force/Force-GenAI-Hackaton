import { TopNav } from '../layouts/TopNav';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout';
import { ExportModal } from '../features/workspace/components/ExportModal';

export function WorkspacePage() {
  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      <TopNav />
      <WorkspaceLayout />
      <ExportModal />
    </div>
  );
}
