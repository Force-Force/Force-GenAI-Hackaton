import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import type {
  PipelineEdge,
  PipelineNode,
  PipelineNodeData,
} from "../../../types/pipeline";
import { isDatamartNode } from "../../../types/pipeline";
import { exportSchemaToSql } from "../../../utils/ddlExport";
import { flattenGraph, genId } from "../../../utils/graph";
import { persistStateStorage } from "../../../store/persistStorage";
import { createInitialPipeline } from "../data/initialPipeline";

interface ViewFrame {
  datamartId: string;
  label: string;
  parentNodes: PipelineNode[];
  parentEdges: PipelineEdge[];
}

interface PipelineState {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNodeId: string | null;
  viewStack: ViewFrame[];

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  selectNode: (id: string | null) => void;
  /** Toggle (or set) a container node's in-place expansion. Local only. */
  toggleNodeExpanded: (id: string, expanded?: boolean) => void;
  addNode: (node: PipelineNode) => void;
  updateNodeData: (id: string, data: Partial<PipelineNodeData>) => void;
  updateProcessingCode: (id: string, code: string) => void;
  deleteNode: (id: string) => void;

  generateEtl: () => string;
  exportSql: (projectName: string) => string;
  resetWorkspace: () => void;

  enterDatamart: (id: string) => void;
  exitToRoot: () => void;
  exitToFrame: (index: number) => void;

  hydrateGraph: (nodes: PipelineNode[], edges: PipelineEdge[]) => void;

  applyRemoteNode: (node: PipelineNode) => void;
  removeRemoteNode: (id: string) => void;
  applyRemoteEdge: (edge: PipelineEdge) => void;
  removeRemoteEdge: (id: string) => void;
}

const initial = createInitialPipeline();

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set, get) => ({
      nodes: initial.nodes,
      edges: initial.edges,
      selectedNodeId: "dw_core",
      viewStack: [],

      onNodesChange: (changes) => {
        set((s) => ({
          nodes: applyNodeChanges(changes, s.nodes) as PipelineNode[],
        }));
      },

      onEdgesChange: (changes) => {
        set((s) => ({
          edges: applyEdgeChanges(changes, s.edges) as PipelineEdge[],
        }));
      },

      onConnect: (connection) => {
        const edge: PipelineEdge = {
          id: genId("edge"),
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
          data: { relationship: "data_flow" },
        };
        set((s) => ({ edges: addEdge(edge, s.edges) as PipelineEdge[] }));
      },

      selectNode: (id) => set({ selectedNodeId: id }),

      toggleNodeExpanded: (id, expanded) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id && n.data.category === "datamart"
              ? ({
                  ...n,
                  data: {
                    ...n.data,
                    expanded:
                      expanded ?? !(n.data as { expanded?: boolean }).expanded,
                  },
                } as PipelineNode)
              : n,
          ),
        })),

      addNode: (node) => {
        set((s) => ({ nodes: [...s.nodes, node], selectedNodeId: node.id }));
      },

      updateNodeData: (id, data) => {
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id
              ? ({ ...n, data: { ...n.data, ...data } } as PipelineNode)
              : n,
          ),
        }));
      },

      updateProcessingCode: (id, code) => {
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id && n.data.category === "processing"
              ? ({ ...n, data: { ...n.data, code } } as PipelineNode)
              : n,
          ),
        }));
      },

      deleteNode: (id) => {
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        }));
      },

      generateEtl: () => {
        const id = genId("proc");
        const node: PipelineNode = {
          id,
          type: "processing",
          position: { x: 360, y: 480 },
          data: {
            category: "processing",
            language: "sql",
            label: "fct_sales_compiled",
            description: "Generated incremental staging pipeline.",
            code: `{{ config(materialized='incremental', unique_key='sales_key') }}

WITH staging AS (
  SELECT * FROM {{ ref('stg_web_orders') }}
)
SELECT
  HASH(id, order_time) AS sales_key,
  customer_email AS customer_key,
  prod_sku AS product_key,
  qty AS quantity,
  final_price AS unit_price,
  final_price * qty AS revenue
FROM staging;`,
            inputColumns: [
              "id",
              "customer_email",
              "prod_sku",
              "qty",
              "final_price",
            ],
            outputColumns: [
              "sales_key",
              "customer_key",
              "product_key",
              "quantity",
              "unit_price",
              "revenue",
            ],
          },
        };
        set((s) => ({ nodes: [...s.nodes, node], selectedNodeId: id }));
        return node.data.label;
      },

      exportSql: (projectName) => {
        const { nodes, edges } = flattenGraph(get().nodes, get().edges);
        return exportSchemaToSql(projectName, nodes, edges);
      },

      resetWorkspace: () =>
        set({ nodes: [], edges: [], selectedNodeId: null, viewStack: [] }),

      enterDatamart: (id) => {
        const { nodes, edges } = get();
        const target = nodes.find((n) => n.id === id);
        if (!target || !isDatamartNode(target)) return;
        const frame: ViewFrame = {
          datamartId: id,
          label: target.data.label,
          parentNodes: nodes,
          parentEdges: edges,
        };
        set((s) => ({
          viewStack: [...s.viewStack, frame],
          nodes: structuredClone(target.data.children.nodes),
          edges: structuredClone(target.data.children.edges),
          selectedNodeId: null,
        }));
      },

      exitToRoot: () => {
        const { viewStack, nodes, edges } = get();
        if (viewStack.length === 0) return;
        const unwound = unwindFrames(viewStack, 0, nodes, edges);
        set({
          nodes: unwound.nodes,
          edges: unwound.edges,
          viewStack: [],
          selectedNodeId: null,
        });
      },

      exitToFrame: (index) => {
        const { viewStack, nodes, edges } = get();
        if (index < 0 || index >= viewStack.length - 1) return;
        const unwound = unwindFrames(viewStack, index + 1, nodes, edges);
        set({
          nodes: unwound.nodes,
          edges: unwound.edges,
          viewStack: viewStack.slice(0, index + 1),
          selectedNodeId: null,
        });
      },

      hydrateGraph: (nodes, edges) => set({ nodes, edges, viewStack: [] }),

      applyRemoteNode: (node) =>
        set((s) => {
          if (s.viewStack.length > 0) return s;
          const exists = s.nodes.some((n) => n.id === node.id);
          return {
            nodes: exists
              ? s.nodes.map((n) => (n.id === node.id ? node : n))
              : [...s.nodes, node],
          };
        }),

      removeRemoteNode: (id) =>
        set((s) =>
          s.viewStack.length > 0
            ? s
            : {
                nodes: s.nodes.filter((n) => n.id !== id),
                edges: s.edges.filter(
                  (e) => e.source !== id && e.target !== id,
                ),
              },
        ),

      applyRemoteEdge: (edge) =>
        set((s) => {
          if (s.viewStack.length > 0) return s;
          const exists = s.edges.some((e) => e.id === edge.id);
          return {
            edges: exists
              ? s.edges.map((e) => (e.id === edge.id ? edge : e))
              : [...s.edges, edge],
          };
        }),

      removeRemoteEdge: (id) =>
        set((s) =>
          s.viewStack.length > 0
            ? s
            : { edges: s.edges.filter((e) => e.id !== id) },
        ),
    }),
    {
      name: "aura-bi.pipeline.v2",
      storage: createJSONStorage(() => persistStateStorage),
      partialize: (s) => ({
        nodes: s.nodes,
        edges: s.edges,
        viewStack: s.viewStack,
      }),
    },
  ),
);

/**
 * Unwind datamart view frames from the current view down to `stopAtIndex`,
 * writing each child graph back into its datamart node along the way.
 */
function unwindFrames(
  viewStack: ViewFrame[],
  stopAtIndex: number,
  currentNodes: PipelineNode[],
  currentEdges: PipelineEdge[],
): { nodes: PipelineNode[]; edges: PipelineEdge[] } {
  let nodes = currentNodes;
  let edges = currentEdges;
  for (let i = viewStack.length - 1; i >= stopAtIndex; i -= 1) {
    const frame = viewStack[i];
    const childGraph = { nodes, edges };
    nodes = frame.parentNodes.map((n) =>
      n.id === frame.datamartId && isDatamartNode(n)
        ? ({ ...n, data: { ...n.data, children: childGraph } } as PipelineNode)
        : n,
    );
    edges = frame.parentEdges;
  }
  return { nodes, edges };
}
