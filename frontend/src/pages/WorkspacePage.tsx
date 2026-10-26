import { useEffect } from "react";
import { TopNav } from "../layouts/TopNav";
import { PipelineCanvas } from "../features/workspace/components/PipelineCanvas";
import { CanvasToolbar } from "../features/workspace/components/CanvasToolbar";
import { AiThoughtPanel } from "../features/workspace/components/AiThoughtPanel";
import { NodeDetailsPanel } from "../features/workspace/components/NodeDetailsPanel";
import { WorkspacePromptBar } from "../features/workspace/components/WorkspacePromptBar";
import { ExportModal } from "../features/workspace/components/ExportModal";
import { useFullscreen } from "../features/workspace/hooks/useFullscreen";
import { useBackendStore } from "../services/session/backendSession";
import { pipelineSocket } from "../services/realtime/pipelineSocket";

export function WorkspacePage() {
  const { ref, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();

  useEffect(() => {
    void useBackendStore.getState().checkHealth().then((online) => {
      if (online) {
        const pipelineId = useBackendStore.getState().activePipelineId;
        if (pipelineId) {
          pipelineSocket.connect(pipelineId);
        }
      }
    });

    return () => {
      pipelineSocket.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ backgroundColor: "#FDFFFC" }}
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
