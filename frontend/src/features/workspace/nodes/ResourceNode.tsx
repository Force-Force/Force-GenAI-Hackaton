import { Handle, Position, NodeToolbar, type NodeProps } from '@xyflow/react';
import type { ResourceNode as ResourceNodeType } from '../../../types/pipeline';
import { cn } from '../../../utils/cn';
import { sourceBadge } from './techMeta';
import { ResourceInfoWidget } from '../widgets/ResourceInfoWidget';

/**
 * External source node (Section 8). Compact rectangular card — NOT a table —
 * showing the source name, kind, a technology icon, and a tech badge so the
 * stack is identifiable at a glance (Section 9). A read-only info widget with
 * the column structure surfaces via NodeToolbar on selection.
 */
export function ResourceNode({ data, selected }: NodeProps<ResourceNodeType>) {
  const tech = sourceBadge(data);
  const { Icon } = tech;

  return (
    <div
      className={cn(
        'w-[224px] rounded-xl border bg-white dark:bg-slate-900 shadow-md transition-all hover:shadow-lg',
        selected
          ? 'border-[#10B981] ring-2 ring-[#10B981]/30 dark:border-emerald-400'
          : 'border-slate-200 dark:border-slate-700',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 dark:!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 dark:!bg-slate-500" />

      <NodeToolbar isVisible={selected} position={Position.Top}>
        <ResourceInfoWidget data={data} />
      </NodeToolbar>

      <div className="flex items-center gap-3 p-3">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', tech.tile)}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-sans font-bold text-slate-800 dark:text-slate-100 truncate">
            {data.label}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {data.kind} source
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-100 dark:border-slate-800">
        <span className={cn('text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', tech.badge)}>
          {tech.label}
        </span>
        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
          {data.columns.length} cols
        </span>
      </div>
    </div>
  );
}
