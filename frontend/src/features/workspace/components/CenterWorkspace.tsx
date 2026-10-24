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
  { id: 'validation', label: 'Independent Audit Center', icon: ShieldCheck },
];

export function CenterWorkspace() {
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const { ref, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();

  return (
    <div ref={ref} style={{ backgroundColor: '#FDFFFC' }} className="h-full flex flex-col min-w-0">
      <div className="flex items-center gap-1 px-4 pt-2 bg-[#FDFFFC] border-b border-[#334139]/12" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer',
              activeTab === id
                ? 'text-[#064C1C] border-[#064C1C] bg-[#064C1C]/5'
                : 'text-[#334139]/60 border-transparent hover:text-[#334139] hover:bg-[#334139]/[0.02]',
            )}
          >
            <Icon size={14} className={activeTab === id ? 'text-[#064C1C]' : ''} />
            {label}
          </button>
        ))}
      </div>

      <Breadcrumb />

      <div className="flex-1 relative min-h-0 bg-[#FDFFFC]">
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
