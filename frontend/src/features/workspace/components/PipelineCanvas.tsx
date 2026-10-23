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
import type { PipelineEdge } from '../../../types/pipeline';

export function PipelineCanvas() {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const onNodesChange = usePipelineStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange);
  const onConnect = usePipelineStore((s) => s.onConnect);
  const selectNode = usePipelineStore((s) => s.selectNode);

  const onKeyDown = useGraphKeyboardNav();

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
      className="w-full h-full bg-slate-50 relative"
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
          color="#CBD5E1"
        />
        <Controls />
        <MiniMap
          pannable
          zoomable
          className="!bg-white !border !border-slate-200"
          maskColor="rgba(241, 245, 249, 0.6)"
        />
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 border border-slate-200 p-8 rounded-xl max-w-md shadow-xl text-center">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-indigo-600 mb-4">
              <Orbit className="animate-spin" size={28} />
            </div>
            <h3 className="font-sans font-bold text-slate-900 text-md">
              No Pipeline Yet
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Ask the AI architect on the left to design a pipeline, or add nodes from the toolbar above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
