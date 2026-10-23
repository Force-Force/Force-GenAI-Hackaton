import { Workflow, Database, ShieldCheck } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useWorkspaceStore, type WorkspaceTab } from '../store/workspaceStore';
import { useFullscreen } from '../hooks/useFullscreen';
import { PipelineCanvas } from './PipelineCanvas';
import { CanvasToolbar } from './CanvasToolbar';
import { Breadcrumb } from './Breadcrumb';
import { DataSourceManager } from '../../sources/components/DataSourceManager';
import { ValidationCenter } from '../../validation/components/ValidationCenter';

const TABS: { id: WorkspaceTab; label: string; icon: typeof Workflow }[] = [
  { id: 'canvas', label: 'Pipeline Canvas', icon: Workflow },
  { id: 'sources', label: 'Data Sources', icon: Database },
  { id: 'validation', label: 'Validation', icon: ShieldCheck },
];

export function CenterWorkspace() {
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const { ref, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();

  return (
    <div ref={ref} className="h-full flex flex-col bg-slate-50 min-w-0">
      <div className="flex items-center gap-1 px-3 pt-2 bg-white border-b border-slate-200" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer',
              activeTab === id
                ? 'text-[#4F46E5] border-[#4F46E5] bg-indigo-50/50'
                : 'text-slate-500 border-transparent hover:text-slate-700',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <Breadcrumb />

      <div className="flex-1 relative min-h-0">
        {activeTab === 'canvas' && (
          <>
            <CanvasToolbar isFullscreen={isFullscreen} onToggleFullscreen={toggle} />
            <PipelineCanvas />
          </>
        )}
        {activeTab === 'sources' && <DataSourceManager />}
        {activeTab === 'validation' && <ValidationCenter />}
      </div>
    </div>
  );
}
