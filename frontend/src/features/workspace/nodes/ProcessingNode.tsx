import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Code2 } from 'lucide-react';
import type { ProcessingNode as ProcessingNodeType } from '../../../types/pipeline';
import { cn } from '../../../utils/cn';
import { processingColor } from './nodeStyles';

/**
 * Processing node (SQL / Python transform). Selecting it opens the code editor
 * widget in the Inspector (handled by the inspector resolver), so the body here
 * stays a compact summary.
 */
export function ProcessingNode({ data, selected }: NodeProps<ProcessingNodeType>) {
  return (
    <div
      className={cn(
        'w-[220px] bg-white border rounded-lg overflow-hidden shadow-md transition-shadow hover:shadow-lg',
        selected
          ? cn(processingColor.selectedBorder, 'ring-2', processingColor.ring)
          : 'border-slate-200',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />

      <div className={cn('flex items-center gap-2 px-3 py-2.5', processingColor.header)}>
        <Code2 size={13} className="text-white" />
        <span className="text-[12px] uppercase font-sans tracking-wide font-black text-white truncate">
          {data.label}
        </span>
      </div>

      <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-wider text-purple-600 font-bold">
          {data.language}
        </span>
        <span className="text-[9px] font-mono text-slate-400">
          {data.inputColumns.length} in / {data.outputColumns.length} out
        </span>
      </div>
    </div>
  );
}
