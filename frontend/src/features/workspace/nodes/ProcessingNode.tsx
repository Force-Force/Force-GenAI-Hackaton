import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ProcessingNode as ProcessingNodeType } from '../../../types/pipeline';
import { cn } from '../../../utils/cn';
import { engineBadge } from './techMeta';

/**
 * Treatment / transformation node (Section 8). A rectangular block — NOT a
 * table — that surfaces the transformation name and the technology in use
 * (Python / SQL / Spark / Pandas) via an icon tile and tech badge (Section 9).
 */
export function ProcessingNode({ data, selected }: NodeProps<ProcessingNodeType>) {
  const tech = engineBadge(data);
  const { Icon } = tech;

  return (
    <div
      className={cn(
        'w-[224px] rounded-xl border bg-white dark:bg-slate-900 shadow-md transition-all hover:shadow-lg',
        selected
          ? 'border-[#A855F7] ring-2 ring-[#A855F7]/30 dark:border-fuchsia-400'
          : 'border-slate-200 dark:border-slate-700',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 dark:!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 dark:!bg-slate-500" />

      <div className="flex items-center gap-3 p-3">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', tech.tile)}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-sans font-bold text-slate-800 dark:text-slate-100 truncate">
            {data.label}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-purple-500 dark:text-fuchsia-300">
            Transformation
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-100 dark:border-slate-800">
        <span className={cn('text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', tech.badge)}>
          {tech.label}
        </span>
        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
          {data.inputColumns.length} in / {data.outputColumns.length} out
        </span>
      </div>
    </div>
  );
}
