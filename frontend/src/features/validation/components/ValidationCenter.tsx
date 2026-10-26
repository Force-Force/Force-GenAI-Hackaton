import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { DynamicDashboardView } from '../../insights/components/DynamicDashboardView';

export function ValidationCenter() {
  const projectName = useWorkspaceStore((s) => s.projectName);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1E2D24]">Insights</h1>
        <p className="mt-1 text-base text-[#334139]/70">
          {projectName || 'Retail Lakehouse Master Pipeline'}
        </p>
      </header>
      <DynamicDashboardView />
    </div>
  );
}
