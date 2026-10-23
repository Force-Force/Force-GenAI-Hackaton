import { Boxes, ShieldCheck, FileCode2, RotateCcw, PanelLeft, PanelRight } from 'lucide-react';
import { Badge, Button } from '../components/ui';
import { useWorkspaceStore } from '../features/workspace/store/workspaceStore';
import { usePipelineStore } from '../features/workspace/store/pipelineStore';

export function TopNav() {
  const projectName = useWorkspaceStore((s) => s.projectName);
  const setProjectName = useWorkspaceStore((s) => s.setProjectName);
  const isValid = useWorkspaceStore((s) => s.isValid);
  const runValidation = useWorkspaceStore((s) => s.runValidation);
  const openExport = useWorkspaceStore((s) => s.openExport);
  const clearValidations = useWorkspaceStore((s) => s.clearValidations);

  const leftCollapsed = useWorkspaceStore((s) => s.leftCollapsed);
  const rightCollapsed = useWorkspaceStore((s) => s.rightCollapsed);
  const setLeftCollapsed = useWorkspaceStore((s) => s.setLeftCollapsed);
  const setRightCollapsed = useWorkspaceStore((s) => s.setRightCollapsed);

  const resetWorkspace = usePipelineStore((s) => s.resetWorkspace);

  return (
    <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#4F46E5] p-1.5 rounded-lg text-white">
            <Boxes size={18} />
          </div>
          <span className="font-sans font-black text-slate-900 tracking-tight">AuraBI</span>
        </div>
        <span className="text-slate-300">/</span>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          aria-label="Project name"
          className="text-sm font-semibold text-slate-700 bg-transparent outline-none focus:bg-slate-50 rounded px-2 py-1 min-w-0 truncate hover:bg-slate-50 transition-colors"
        />
        {isValid === true && <Badge tone="success">Valid</Badge>}
        {isValid === false && <Badge tone="danger">Errors</Badge>}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          aria-pressed={!leftCollapsed}
          onClick={() => setLeftCollapsed(!leftCollapsed)}
          aria-label={leftCollapsed ? 'Show chat panel' : 'Hide chat panel'}
        >
          <PanelLeft size={15} />
        </Button>
        <Button
          variant="ghost"
          aria-pressed={!rightCollapsed}
          onClick={() => setRightCollapsed(!rightCollapsed)}
          aria-label={rightCollapsed ? 'Show inspector panel' : 'Hide inspector panel'}
        >
          <PanelRight size={15} />
        </Button>
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Button
          variant="secondary"
          onClick={() => {
            resetWorkspace();
            clearValidations();
          }}
        >
          <RotateCcw size={13} /> Reset
        </Button>
        <Button variant="secondary" onClick={() => void runValidation()}>
          <ShieldCheck size={13} /> Validate
        </Button>
        <Button variant="primary" onClick={openExport}>
          <FileCode2 size={13} /> Compile DDL
        </Button>
      </div>
    </header>
  );
}
