import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import type {
  PipelineEdge,
  PipelineNode,
  PipelineNodeData,
} from '../../../types/pipeline';
import { isDatamartNode } from '../../../types/pipeline';
import { applyAiAction, type ApplyActionResult } from '../../../utils/applyAiAction';
import { exportSchemaToSql } from '../../../utils/ddlExport';
import { flattenGraph, genId } from '../../../utils/graph';
import { persistStateStorage } from '../../../store/persistStorage';
import { createInitialPipeline } from '../data/initialPipeline';
import * as pipelineService from '../../../services/pipeline/pipelineService';
import { toNodeUpdateBody } from '../../../services/mapping/graphMapping';

export type SyncStatus = 'idle' | 'syncing' | 'online' | 'offline';

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

  /** Backend pipeline this graph is bound to (null until bootstrap resolves). */
  pipelineId: string | null;
  syncStatus: SyncStatus;

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

  applyAction: (rawAction: unknown) => ApplyActionResult;
  generateEtl: () => string;
  exportSql: (projectName: string) => string;
  resetWorkspace: () => void;

  enterDatamart: (id: string) => void;
  exitToRoot: () => void;
  exitToFrame: (index: number) => void;

  // --- Backend binding / hydration ---
  setPipelineId: (id: string | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  hydrateGraph: (nodes: PipelineNode[], edges: PipelineEdge[]) => void;

  // --- Remote (WebSocket) reconciliation ---
  applyRemoteNode: (node: PipelineNode) => void;
  removeRemoteNode: (id: string) => void;
  applyRemoteEdge: (edge: PipelineEdge) => void;
  removeRemoteEdge: (id: string) => void;
}

const initial = createInitialPipeline();

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set, get) => {
      /** True while sync should be suppressed (offline or drilled into a mart). */
      function syncDisabled(): boolean {
        const s = get();
        return !s.pipelineId || s.viewStack.length > 0;
      }

      /** Replace client-generated ids with backend-assigned ids in one update. */
      function reconcileIds(
        nodeIdMap: Map<string, string>,
        edgeIdMap: Map<string, string>,
      ): void {
        if (nodeIdMap.size === 0 && edgeIdMap.size === 0) return;
        set((s) => ({
          nodes: s.nodes.map((n) =>
            nodeIdMap.has(n.id) ? ({ ...n, id: nodeIdMap.get(n.id)! } as PipelineNode) : n,
          ),
          edges: s.edges.map((e) => {
            const id = edgeIdMap.get(e.id) ?? e.id;
            const source = nodeIdMap.get(e.source) ?? e.source;
            const target = nodeIdMap.get(e.target) ?? e.target;
            return { ...e, id, source, target };
          }),
          selectedNodeId:
            s.selectedNodeId && nodeIdMap.has(s.selectedNodeId)
              ? nodeIdMap.get(s.selectedNodeId)!
              : s.selectedNodeId,
        }));
      }

      /** Persist newly created nodes/edges, reconciling backend ids. */
      async function syncCreated(
        newNodes: PipelineNode[],
        newEdges: PipelineEdge[],
      ): Promise<void> {
        if (syncDisabled()) return;
        const pid = get().pipelineId!;
        set({ syncStatus: 'syncing' });
        const nodeIdMap = new Map<string, string>();
        const edgeIdMap = new Map<string, string>();
        try {
          for (const node of newNodes) {
            const created = await pipelineService.createNode(pid, node);
            if (created.id !== node.id) nodeIdMap.set(node.id, created.id);
          }
          for (const edge of newEdges) {
            const source = nodeIdMap.get(edge.source) ?? edge.source;
            const target = nodeIdMap.get(edge.target) ?? edge.target;
            const created = await pipelineService.createEdge(pid, {
              ...edge,
              source,
              target,
            });
            if (created.id !== edge.id) edgeIdMap.set(edge.id, created.id);
          }
          reconcileIds(nodeIdMap, edgeIdMap);
          set({ syncStatus: 'online' });
        } catch {
          set({ syncStatus: 'offline' });
        }
      }

      /**
       * Persist in-place updates to existing nodes (route 8, PATCH node). Used
       * when an applied action mutates a node that already exists on the backend,
       * e.g. a table routed INTO a warehouse/database container (the container's
       * `data.children` changes but its id does not).
       */
      async function syncChanged(ids: string[]): Promise<void> {
        if (syncDisabled() || ids.length === 0) return;
        const pid = get().pipelineId!;
        set({ syncStatus: 'syncing' });
        try {
          for (const id of ids) {
            const node = get().nodes.find((n) => n.id === id);
            if (!node) continue;
            await pipelineService.updateNode(
              pid,
              id,
              toNodeUpdateBody({ position: node.position, data: node.data }),
            );
          }
          set({ syncStatus: 'online' });
        } catch {
          set({ syncStatus: 'offline' });
        }
      }

      async function syncDeleteNode(id: string): Promise<void> {
        if (syncDisabled()) return;
        const pid = get().pipelineId!;
        try {
          await pipelineService.deleteNode(pid, id);
          set({ syncStatus: 'online' });
        } catch {
          set({ syncStatus: 'offline' });
        }
      }

      async function syncDeleteEdge(id: string): Promise<void> {
        if (syncDisabled()) return;
        const pid = get().pipelineId!;
        try {
          await pipelineService.deleteEdge(pid, id);
          set({ syncStatus: 'online' });
        } catch {
          set({ syncStatus: 'offline' });
        }
      }

      async function syncUpdateNode(id: string): Promise<void> {
        if (syncDisabled()) return;
        const pid = get().pipelineId!;
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return;
        try {
          await pipelineService.updateNode(
            pid,
            id,
            toNodeUpdateBody({ position: node.position, data: node.data }),
          );
          set({ syncStatus: 'online' });
        } catch {
          set({ syncStatus: 'offline' });
        }
      }

      async function syncNodePosition(id: string): Promise<void> {
        if (syncDisabled()) return;
        const pid = get().pipelineId!;
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return;
        try {
          await pipelineService.updateNode(pid, id, { position: node.position });
          set({ syncStatus: 'online' });
        } catch {
          set({ syncStatus: 'offline' });
        }
      }

      return {
        nodes: initial.nodes,
        edges: initial.edges,
        selectedNodeId: 'dw_core',
        viewStack: [],
        pipelineId: null,
        syncStatus: 'idle',

        onNodesChange: (changes) => {
          set((s) => ({
            nodes: applyNodeChanges(changes, s.nodes) as PipelineNode[],
          }));
          for (const change of changes) {
            if (change.type === 'position' && change.dragging === false) {
              void syncNodePosition(change.id);
            } else if (change.type === 'remove') {
              void syncDeleteNode(change.id);
            }
          }
        },

        onEdgesChange: (changes) => {
          set((s) => ({
            edges: applyEdgeChanges(changes, s.edges) as PipelineEdge[],
          }));
          for (const change of changes) {
            if (change.type === 'remove') {
              void syncDeleteEdge(change.id);
            }
          }
        },

        onConnect: (connection) => {
          const edge: PipelineEdge = {
            id: genId('edge'),
            source: connection.source!,
            target: connection.target!,
            sourceHandle: connection.sourceHandle ?? undefined,
            targetHandle: connection.targetHandle ?? undefined,
            data: { relationship: 'data_flow' },
          };
          set((s) => ({ edges: addEdge(edge, s.edges) as PipelineEdge[] }));
          void syncCreated([], [edge]);
        },

        selectNode: (id) => set({ selectedNodeId: id }),

        toggleNodeExpanded: (id, expanded) =>
          set((s) => ({
            nodes: s.nodes.map((n) =>
              n.id === id && n.data.category === 'datamart'
                ? ({
                    ...n,
                    data: {
                      ...n.data,
                      expanded: expanded ?? !(n.data as { expanded?: boolean }).expanded,
                    },
                  } as PipelineNode)
                : n,
            ),
          })),

        addNode: (node) => {
          set((s) => ({ nodes: [...s.nodes, node], selectedNodeId: node.id }));
          void syncCreated([node], []);
        },

        updateNodeData: (id, data) => {
          set((s) => ({
            nodes: s.nodes.map((n) =>
              n.id === id
                ? ({ ...n, data: { ...n.data, ...data } } as PipelineNode)
                : n,
            ),
          }));
          void syncUpdateNode(id);
        },

        updateProcessingCode: (id, code) => {
          set((s) => ({
            nodes: s.nodes.map((n) =>
              n.id === id && n.data.category === 'processing'
                ? ({ ...n, data: { ...n.data, code } } as PipelineNode)
                : n,
            ),
          }));
          void syncUpdateNode(id);
        },

        deleteNode: (id) => {
          const removedEdges = get().edges.filter(
            (e) => e.source === id || e.target === id,
          );
          set((s) => ({
            nodes: s.nodes.filter((n) => n.id !== id),
            edges: s.edges.filter((e) => e.source !== id && e.target !== id),
            selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
          }));
          // Backend cascades edge removal, so only the node delete is sent.
          void syncDeleteNode(id);
          void removedEdges; // edges are removed server-side by the cascade
        },

        applyAction: (rawAction) => {
          const before = get();
          const result = applyAiAction(
            { nodes: before.nodes, edges: before.edges },
            rawAction,
          );
          if (result.changed) {
            set({
              nodes: result.graph.nodes,
              edges: result.graph.edges,
              selectedNodeId: result.focusNodeId ?? get().selectedNodeId,
            });
            const newNodes = result.graph.nodes.filter(
              (n) => !before.nodes.some((o) => o.id === n.id),
            );
            const newEdges = result.graph.edges.filter(
              (e) => !before.edges.some((o) => o.id === e.id),
            );
            // Existing nodes mutated in place (e.g. a table routed into a
            // warehouse/database container) must be PATCHed so the change is
            // persisted via the documented node route, not lost locally.
            const changedNodeIds = result.graph.nodes
              .filter((n) => {
                const old = before.nodes.find((o) => o.id === n.id);
                if (!old || old === n) return false;
                return (
                  JSON.stringify(old.data) !== JSON.stringify(n.data) ||
                  old.position.x !== n.position.x ||
                  old.position.y !== n.position.y
                );
              })
              .map((n) => n.id);
            void (async () => {
              await syncCreated(newNodes, newEdges);
              await syncChanged(changedNodeIds);
            })();
          }
          return result;
        },

        generateEtl: () => {
          const id = genId('proc');
          const node: PipelineNode = {
            id,
            type: 'processing',
            position: { x: 360, y: 480 },
            data: {
              category: 'processing',
              language: 'sql',
              label: 'fct_sales_compiled',
              description: 'Generated incremental staging pipeline.',
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
              inputColumns: ['id', 'customer_email', 'prod_sku', 'qty', 'final_price'],
              outputColumns: ['sales_key', 'customer_key', 'product_key', 'quantity', 'unit_price', 'revenue'],
            },
          };
          set((s) => ({ nodes: [...s.nodes, node], selectedNodeId: id }));
          void syncCreated([node], []);
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

        setPipelineId: (id) => set({ pipelineId: id }),
        setSyncStatus: (status) => set({ syncStatus: status }),

        hydrateGraph: (nodes, edges) =>
          set({ nodes, edges, viewStack: [] }),

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
      };
    },
    {
      name: 'aura-bi.pipeline.v2',
      storage: createJSONStorage(() => persistStateStorage),
      partialize: (s) => ({
        nodes: s.nodes,
        edges: s.edges,
        viewStack: s.viewStack,
        pipelineId: s.pipelineId,
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
