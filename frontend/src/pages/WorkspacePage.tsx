import { TopNav } from '../layouts/TopNav';
import { PipelineCanvas } from '../features/workspace/components/PipelineCanvas';
import { CanvasToolbar } from '../features/workspace/components/CanvasToolbar';
import { AiThoughtPanel } from '../features/workspace/components/AiThoughtPanel';
import { NodeDetailsPanel } from '../features/workspace/components/NodeDetailsPanel';
import { WorkspacePromptBar } from '../features/workspace/components/WorkspacePromptBar';
import { ExportModal } from '../features/workspace/components/ExportModal';
import { useBootstrapPipeline } from '../features/workspace/hooks/useBootstrapPipeline';
import { useFullscreen } from '../features/workspace/hooks/useFullscreen';

export function WorkspacePage() {
  useBootstrapPipeline();
  const { ref, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ backgroundColor: '#FDFFFC' }}
      className="h-screen w-screen relative overflow-hidden font-sans text-[#334139] selection:bg-[#064C1C]/15 antialiased"
    >
      {/* 
        Full-screen canvas with dots:
        The Porcelain background and little dots cover the entire screen from top to bottom.
      */}
      <div className="absolute inset-0 w-full h-full">
        <PipelineCanvas />
      </div>

      {/* 
        TopBar:
        Seamlessly uniform with the workspace background, no separation, no border.
      */}
      <div className="relative z-20 w-full pointer-events-none">
        <TopNav />
      </div>

      {/* Floating AI Thought Process Panel on the left */}
      <AiThoughtPanel />

      {/* Floating Node Details Panel on the right */}
      <NodeDetailsPanel />

      {/* Canvas Toolbar on the center-right border */}
      <CanvasToolbar isFullscreen={isFullscreen} onToggleFullscreen={toggle} />

      {/* Floating Prompt Bar at bottom center */}
      <WorkspacePromptBar />

      <ExportModal />
    </div>
  );
}
