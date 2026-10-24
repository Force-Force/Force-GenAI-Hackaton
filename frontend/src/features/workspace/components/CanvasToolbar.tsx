import { PlusCircle, LayoutGrid, Maximize2, Minimize2, Code2 } from 'lucide-react';
import { usePipelineStore } from '../store/pipelineStore';
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
    <div
      style={{ backgroundColor: '#FDFFFC' }}
      className={cn(
        'absolute top-16 left-6 z-20 flex items-center gap-2 border border-[#334139]/20 p-1.5 rounded-full shadow-sm backdrop-blur-xs',
        className
      )}
    >
      <button
        type="button"
        onClick={addResource}
        aria-label="Add resource node"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#064C1C] hover:bg-[#D66F14] text-[#FDFFFC] transition-colors cursor-pointer shadow-2xs"
      >
        <PlusCircle size={13} />
        <span>Resource</span>
      </button>
      <button
        type="button"
        onClick={addProcessing}
        aria-label="Add processing node"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#334139] hover:bg-[#D66F14] text-[#FDFFFC] transition-colors cursor-pointer shadow-2xs"
      >
        <Code2 size={13} />
        <span>Processing</span>
      </button>
      <button
        type="button"
        onClick={autoLayout}
        aria-label="Auto-layout the graph"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-transparent text-[#334139] border border-[#334139]/25 hover:bg-[#064C1C] hover:text-[#FDFFFC] hover:border-[#064C1C] transition-colors cursor-pointer"
      >
        <LayoutGrid size={13} />
        <span>Auto Layout</span>
      </button>
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-transparent text-[#334139] border border-[#334139]/25 hover:bg-[#064C1C] hover:text-[#FDFFFC] hover:border-[#064C1C] transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
        </button>
      )}
    </div>
  );
}
