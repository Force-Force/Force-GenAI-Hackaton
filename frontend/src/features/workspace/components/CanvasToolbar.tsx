import { PlusCircle, LayoutGrid, Maximize2, Minimize2, Code2, SlidersHorizontal } from 'lucide-react';
import { usePipelineStore } from '../store/pipelineStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAutoLayout } from '../hooks/useAutoLayout';
import { genId } from '../../../utils/graph';
import { cn } from '../../../utils/cn';
import type { PipelineNode } from '../../../types/pipeline';

interface CanvasToolbarProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
}

export function CanvasToolbar({ isFullscreen = false, onToggleFullscreen, className }: CanvasToolbarProps) {
  const addNode = usePipelineStore((s) => s.addNode);
  const autoLayout = useAutoLayout();
  const rightCollapsed = useWorkspaceStore((s) => s.rightCollapsed);
  const setRightCollapsed = useWorkspaceStore((s) => s.setRightCollapsed);

  const addResource = () => {
    const id = genId('resource');
    const node: PipelineNode = {
      id,
      type: 'resource',
      position: { x: 120, y: 120 },
      data: {
        category: 'resource',
        kind: 'table',
        label: `new_table_${id.slice(-4)}`,
        description: 'New resource table. Edit columns in the inspector.',
        warehouseRole: 'dimension',
        columns: [
          { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        ],
      },
    };
    addNode(node);
  };

  const addProcessing = () => {
    const id = genId('proc');
    const node: PipelineNode = {
      id,
      type: 'processing',
      position: { x: 200, y: 200 },
      data: {
        category: 'processing',
        language: 'sql',
        label: `transform_${id.slice(-4)}`,
        description: 'New processing step. Edit the source in the inspector.',
        code: 'SELECT 1;',
        inputColumns: [],
        outputColumns: [],
      },
    };
    addNode(node);
  };

  return (
    <aside
      aria-label="Canvas actions toolbar"
      style={{ backgroundColor: '#FDFFFC' }}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 border border-[#334139]/20 p-2 rounded-2xl shadow-md backdrop-blur-xs transition-all duration-300 ease-in-out',
        !rightCollapsed ? 'right-[332px] sm:right-[364px] md:right-[396px]' : 'right-4',
        className
      )}
    >
      {/* Node Details (Sidebar Toggle) */}
      <div className="relative group flex items-center">
        <button
          type="button"
          onClick={() => setRightCollapsed(!rightCollapsed)}
          aria-label={!rightCollapsed ? 'Close node details' : 'Open node details'}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-2xs',
            !rightCollapsed
              ? 'bg-[#064C1C] text-[#FDFFFC]'
              : 'bg-transparent text-[#334139] hover:bg-[#064C1C] hover:text-[#FDFFFC]'
          )}
        >
          <SlidersHorizontal size={18} />
        </button>
        <div className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-[#334139] text-[#FDFFFC] text-xs font-semibold whitespace-nowrap shadow-md opacity-0 translate-x-1.5 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50">
          {!rightCollapsed ? 'Close Details' : 'Node Details'}
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-[#334139] rotate-45" />
        </div>
      </div>

      <div className="w-5 h-px bg-[#334139]/15 my-0.5" />

      {/* Add Resource */}
      <div className="relative group flex items-center">
        <button
          type="button"
          onClick={addResource}
          aria-label="Add resource node"
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-transparent text-[#334139] hover:bg-[#064C1C] hover:text-[#FDFFFC] transition-all cursor-pointer shadow-2xs"
        >
          <PlusCircle size={18} />
        </button>
        <div className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-[#334139] text-[#FDFFFC] text-xs font-semibold whitespace-nowrap shadow-md opacity-0 translate-x-1.5 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50">
          Add Resource
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-[#334139] rotate-45" />
        </div>
      </div>

      {/* Add Processing */}
      <div className="relative group flex items-center">
        <button
          type="button"
          onClick={addProcessing}
          aria-label="Add processing node"
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-transparent text-[#334139] hover:bg-[#064C1C] hover:text-[#FDFFFC] transition-all cursor-pointer shadow-2xs"
        >
          <Code2 size={18} />
        </button>
        <div className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-[#334139] text-[#FDFFFC] text-xs font-semibold whitespace-nowrap shadow-md opacity-0 translate-x-1.5 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50">
          Add Processing
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-[#334139] rotate-45" />
        </div>
      </div>

      <div className="w-5 h-px bg-[#334139]/15 my-0.5" />

      {/* Auto Layout */}
      <div className="relative group flex items-center">
        <button
          type="button"
          onClick={autoLayout}
          aria-label="Auto-layout the graph"
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-transparent text-[#334139] hover:bg-[#064C1C] hover:text-[#FDFFFC] transition-all cursor-pointer shadow-2xs"
        >
          <LayoutGrid size={18} />
        </button>
        <div className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-[#334139] text-[#FDFFFC] text-xs font-semibold whitespace-nowrap shadow-md opacity-0 translate-x-1.5 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50">
          Auto Layout
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-[#334139] rotate-45" />
        </div>
      </div>

      {/* Fullscreen Toggle */}
      {onToggleFullscreen && (
        <div className="relative group flex items-center">
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-transparent text-[#334139] hover:bg-[#064C1C] hover:text-[#FDFFFC] transition-all cursor-pointer shadow-2xs"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <div className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-[#334139] text-[#FDFFFC] text-xs font-semibold whitespace-nowrap shadow-md opacity-0 translate-x-1.5 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50">
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-[#334139] rotate-45" />
          </div>
        </div>
      )}
    </aside>
  );
}
