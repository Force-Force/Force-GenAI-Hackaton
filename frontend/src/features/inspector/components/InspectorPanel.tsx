import { ChevronRight } from 'lucide-react';
import {
  isDatamartNode,
  isProcessingNode,
  isResourceNode,
  type PipelineNode,
} from '../../../types/pipeline';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { ResourceInspector } from './ResourceInspector';
import { ProcessingInspector } from './ProcessingInspector';
import { ContainerInspector } from './ContainerInspector';
import { GeneratedCodePanel } from './GeneratedCodePanel';
import { WorkspaceMetrics } from './WorkspaceMetrics';

/**
 * Context-sensitive inspector. Resolves the view from the selected node's
 * category. Datamarts are navigated on the canvas, so when one is selected we
 * still show its (resource-like) summary via the default metrics view.
 */
export function InspectorPanel() {
  const selectedId = usePipelineStore((s) => s.selectedNodeId);
  const node = usePipelineStore((s) =>
    s.nodes.find((n) => n.id === selectedId),
  ) as PipelineNode | undefined;
  const collapse = useWorkspaceStore((s) => s.setRightCollapsed);

  return (
    <div className="h-full bg-white dark:bg-slate-900 flex flex-col overflow-y-auto p-4 animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Inspector
        </span>
        <button
          onClick={() => collapse(true)}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          aria-label="Collapse inspector panel"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {!node && <WorkspaceMetrics />}
      {node && (
        <div key={node.id} className="flex flex-col gap-4 animate-fadeIn">
          {isResourceNode(node) && <ResourceInspector node={node} />}
          {isProcessingNode(node) && <ProcessingInspector node={node} />}
          {isDatamartNode(node) && <ContainerInspector node={node} />}
          {(isResourceNode(node) || isDatamartNode(node)) && (
            <GeneratedCodePanel node={node} />
          )}
        </div>
      )}
    </div>
  );
}
