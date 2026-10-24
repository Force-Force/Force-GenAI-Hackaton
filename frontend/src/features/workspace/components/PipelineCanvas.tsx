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
      style={{ backgroundColor: '#FDFFFC' }}
      className="w-full h-full relative"
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
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={2}
          color="rgba(51, 65, 57, 0.3)"
        />
        <Controls />
        <MiniMap
          pannable
          zoomable
          className="!bg-[#FDFFFC] !border !border-[#334139]/20 !rounded-xl shadow-xs"
          maskColor="rgba(51, 65, 57, 0.08)"
        />
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-[#FDFFFC]/95 border border-[#334139]/20 p-8 rounded-2xl max-w-md shadow-xl text-center">
            <div className="bg-[#064C1C]/10 border border-[#064C1C]/20 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[#064C1C] mb-4">
              <Orbit className="animate-spin" size={28} />
            </div>
            <h3 className="font-sans font-bold text-[#334139] text-base">
              No Pipeline Yet
            </h3>
            <p className="text-xs text-[#334139]/70 mt-2 leading-relaxed">
              Use the prompt bar below to ask AuraBI to architect, connect, and transform your pipeline.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
