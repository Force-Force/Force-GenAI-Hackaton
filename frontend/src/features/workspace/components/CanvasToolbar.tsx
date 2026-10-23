import { PlusCircle, LayoutGrid, Maximize2, Minimize2, Code2 } from 'lucide-react';
import { Button } from '../../../components/ui';
import { usePipelineStore } from '../store/pipelineStore';
import { useAutoLayout } from '../hooks/useAutoLayout';
import { genId } from '../../../utils/graph';
import type { PipelineNode } from '../../../types/pipeline';

interface CanvasToolbarProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function CanvasToolbar({ isFullscreen, onToggleFullscreen }: CanvasToolbarProps) {
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
    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/95 border border-slate-200 p-2 rounded-lg shadow-sm">
      <Button variant="primary" onClick={addResource} aria-label="Add resource node">
        <PlusCircle size={12} /> Resource
      </Button>
      <Button variant="success" onClick={addProcessing} aria-label="Add processing node">
        <Code2 size={12} /> Processing
      </Button>
      <Button variant="secondary" onClick={autoLayout} aria-label="Auto-layout the graph">
        <LayoutGrid size={12} /> Auto Layout
      </Button>
      <Button
        variant="secondary"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
      >
        {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        {isFullscreen ? 'Exit' : 'Full Screen'}
      </Button>
    </div>
  );
}
