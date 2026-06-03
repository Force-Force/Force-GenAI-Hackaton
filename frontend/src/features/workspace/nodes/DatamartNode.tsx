import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Boxes, ArrowRightToLine } from 'lucide-react';
import type { DatamartNode as DatamartNodeType } from '../../../types/pipeline';
import { cn } from '../../../utils/cn';
import { datamartColor } from './nodeStyles';

/**
 * Datamart node. Clicking it drills into a dedicated in-app sub-canvas
 * (handled by the canvas onNodeClick -> enterDatamart). No modal, no new window.
 */
export function DatamartNode({ data, selected }: NodeProps<DatamartNodeType>) {
  return (
    <div
      className={cn(
        'w-[220px] bg-white border rounded-lg overflow-hidden shadow-md transition-shadow hover:shadow-lg cursor-pointer',
        selected
          ? cn(datamartColor.selectedBorder, 'ring-2', datamartColor.ring)
          : 'border-slate-200',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />

      <div className={cn('flex items-center gap-2 px-3 py-2.5', datamartColor.header)}>
        <Boxes size={13} className="text-white" />
        <span className="text-[12px] uppercase font-sans tracking-wide font-black text-white truncate">
          {data.label}
        </span>
      </div>

      <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-wider text-amber-600 font-bold">
          {data.children.nodes.length} objects
        </span>
        <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
          Open <ArrowRightToLine size={10} />
        </span>
      </div>
    </div>
  );
}
