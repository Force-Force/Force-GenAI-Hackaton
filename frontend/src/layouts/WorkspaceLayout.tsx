import { Group, Panel, Separator } from 'react-resizable-panels';
import { useWorkspaceStore } from '../features/workspace/store/workspaceStore';
import { ChatPanel } from '../features/chat/components/ChatPanel';
import { InspectorPanel } from '../features/inspector/components/InspectorPanel';
import { CenterWorkspace } from '../features/workspace/components/CenterWorkspace';

const handleClass =
  'w-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-[#4F46E5]/40 data-[separator-active=true]:bg-[#4F46E5] transition-colors';

/** Three-panel resizable shell: AI chat (left), canvas (center), inspector (right). */
export function WorkspaceLayout() {
  const leftCollapsed = useWorkspaceStore((s) => s.leftCollapsed);
  const rightCollapsed = useWorkspaceStore((s) => s.rightCollapsed);
  const isFullscreen = useWorkspaceStore((s) => s.isFullscreen);
  const leftSize = useWorkspaceStore((s) => s.leftSize);
  const rightSize = useWorkspaceStore((s) => s.rightSize);
  const setLeftSize = useWorkspaceStore((s) => s.setLeftSize);
  const setRightSize = useWorkspaceStore((s) => s.setRightSize);

  const showLeft = !leftCollapsed && !isFullscreen;
  const showRight = !rightCollapsed && !isFullscreen;

  return (
    <Group
      orientation="horizontal"
      className="flex-1 min-h-0"
      // Remount when panel composition changes so default sizes apply cleanly.
      key={`${showLeft}-${showRight}`}
    >
      {showLeft && (
        <Panel
          id="left"
          defaultSize={`${leftSize}%`}
          minSize="16%"
          maxSize="42%"
          onResize={(size) => setLeftSize(size.asPercentage)}
        >
          <ChatPanel />
        </Panel>
      )}
      {showLeft && <Separator className={handleClass} aria-label="Resize chat panel" />}

      <Panel id="center" minSize="30%">
        <CenterWorkspace />
      </Panel>

      {showRight && <Separator className={handleClass} aria-label="Resize inspector panel" />}
      {showRight && (
        <Panel
          id="right"
          defaultSize={`${rightSize}%`}
          minSize="16%"
          maxSize="42%"
          onResize={(size) => setRightSize(size.asPercentage)}
        >
          <InspectorPanel />
        </Panel>
      )}
    </Group>
  );
}
