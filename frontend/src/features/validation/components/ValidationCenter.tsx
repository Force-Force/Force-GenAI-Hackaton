import { Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { DynamicDashboardView } from '../../insights/components/DynamicDashboardView';

export function ValidationCenter() {
  const projectName = useWorkspaceStore((s) => s.projectName);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. Header: Page Title & Brief Context */}
      <section className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#064C1C]">
          <Sparkles size={13} />
          <span>AI-Driven Dynamic Insights</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1E2D24] leading-tight">
          {projectName || 'Retail Lakehouse Master Pipeline'} — Insights Dashboard
        </h1>

        <p className="text-sm text-[#334139]/70">
          Dynamic visualizations and key driver analysis proposed across live pipeline metrics.
        </p>
      </section>

      {/* 2. Dynamic Dashboard Front & Center */}
      <section>
        <DynamicDashboardView />
      </section>
    </div>
  );
}

