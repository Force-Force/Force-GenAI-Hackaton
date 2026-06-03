import { useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Orbit } from 'lucide-react';
import { usePipelineStore } from '../store/pipelineStore';
import { useGraphKeyboardNav } from '../hooks/useGraphKeyboardNav';
import { nodeTypes } from '../nodes/nodeRegistry';
import { edgeTypes } from '../edges/edgeRegistry';
import { useThemeStore } from '../../../store/themeStore';
import type { PipelineEdge } from '../../../types/pipeline';

export function PipelineCanvas() {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const onNodesChange = usePipelineStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange);
  const onConnect = usePipelineStore((s) => s.onConnect);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const onKeyDown = useGraphKeyboardNav();

  // Reflect store selection into React Flow node state, and render every edge
  // with the animated data-flow renderer (Section 2).
  const displayedNodes = useMemo(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })),
    [nodes, selectedNodeId],
  );

  const displayedEdges = useMemo<PipelineEdge[]>(
    () => edges.map((e) => ({ ...e, type: 'flow' })),
    [edges],
  );

  return (
    <div
      className="w-full h-full bg-slate-50 dark:bg-slate-950 relative"
      tabIndex={0}
      role="application"
      aria-label="ETL pipeline canvas. Use arrow keys to move between nodes, Enter to open a datamart, Delete to remove the selected node."
      onKeyDown={onKeyDown}
    >
      <ReactFlow
        nodes={displayedNodes}
        edges={displayedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node: Node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDark ? '#1e293b' : '#CBD5E1'}
        />
        <Controls />
        <MiniMap
          pannable
          zoomable
          className="!bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700"
          maskColor={isDark ? 'rgba(2, 6, 23, 0.6)' : 'rgba(241, 245, 249, 0.6)'}
        />
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 p-8 rounded-xl max-w-md shadow-xl text-center">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-300 mb-4">
              <Orbit className="animate-spin" size={28} />
            </div>
            <h3 className="font-sans font-bold text-slate-900 dark:text-slate-100 text-md">
              No Pipeline Yet
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Ask the AI architect on the left to design a pipeline, or add nodes from the toolbar above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
