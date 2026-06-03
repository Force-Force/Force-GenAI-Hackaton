import { Handle, Position, NodeToolbar, type NodeProps } from '@xyflow/react';
import { Table, Database } from 'lucide-react';
import type { ResourceNode as ResourceNodeType } from '../../../types/pipeline';
import { cn } from '../../../utils/cn';
import { resourceColor } from './nodeStyles';
import { ResourceInfoWidget } from '../widgets/ResourceInfoWidget';

/**
 * Resource node (database / warehouse / table / source).
 * On selection it surfaces a lightweight info widget via NodeToolbar.
 * It never opens an editor or navigates the canvas.
 */
export function ResourceNode({ data, selected }: NodeProps<ResourceNodeType>) {
  const color = resourceColor(data);

  return (
    <div
      className={cn(
        'w-[220px] bg-white border rounded-lg overflow-hidden shadow-md transition-shadow hover:shadow-lg',
        selected ? cn(color.selectedBorder, 'ring-2', color.ring) : 'border-slate-200',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />

      <NodeToolbar isVisible={selected} position={Position.Top}>
        <ResourceInfoWidget data={data} />
      </NodeToolbar>

      <div className={cn('flex items-center gap-2 px-3 py-2.5', color.header)}>
        <Table size={13} className="text-white" />
        <span className="text-[12px] uppercase font-sans tracking-wide font-black text-white truncate">
          {data.label}
        </span>
      </div>

      <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
          <Database size={10} /> {data.kind}
        </span>
        <span className="text-[9px] font-mono text-slate-400">
          {data.columns.length} cols
        </span>
      </div>
    </div>
  );
}
