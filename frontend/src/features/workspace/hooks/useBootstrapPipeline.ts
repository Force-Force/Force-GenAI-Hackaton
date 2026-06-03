import { useEffect } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useChatStore } from '../../chat/store/chatStore';
import * as pipelineService from '../../../services/pipeline/pipelineService';
import { ApiError } from '../../../services/http/client';
import {
  fromBackendEdge,
  fromBackendNode,
} from '../../../services/mapping/graphMapping';
import { connectPipelineSocket } from '../../../services/realtime/pipelineSocket';
import type { PipelineRead } from '../../../contracts/backend';

/**
 * Resolves the backend pipeline this workspace is bound to and hydrates the
 * stores from it. Order of operations:
 *   1. Health check — if the backend is down, stay fully local (offline mode).
 *   2. Reuse a persisted pipelineId, or create a new pipeline seeded from the
 *      current local graph.
 *   3. Hydrate the graph + chat history from the backend.
 *   4. Subscribe to realtime updates.
 *
 * Every failure path degrades to offline so the app keeps working without a
 * backend.
 */
export function useBootstrapPipeline(): void {
  useEffect(() => {
    let cancelled = false;
    let disconnect: (() => void) | undefined;

    async function run(): Promise<void> {
      const store = usePipelineStore.getState();

      const ok = await pipelineService.health();
      if (cancelled) return;
      if (!ok) {
        store.setSyncStatus('offline');
        return;
      }

      store.setSyncStatus('syncing');
      try {
        let pipelineId = store.pipelineId;
        let pipeline: PipelineRead | undefined;

        if (pipelineId) {
          try {
            pipeline = await pipelineService.getPipeline(pipelineId);
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              pipelineId = null;
            } else {
              throw err;
            }
          }
        }

        if (!pipelineId || !pipeline) {
          const projectName = useWorkspaceStore.getState().projectName;
          const created = await pipelineService.createPipeline(projectName);
          pipelineId = created.id;
          store.setPipelineId(pipelineId);
          // Seed the empty backend pipeline with the current local graph.
          await pipelineService.seedPipeline(pipelineId, {
            nodes: store.nodes,
            edges: store.edges,
          });
          pipeline = await pipelineService.getPipeline(pipelineId);
        }

        if (cancelled || !pipeline) return;

        store.setPipelineId(pipeline.id);
        store.hydrateGraph(
          pipeline.nodes.map(fromBackendNode),
          pipeline.edges.map((e) => fromBackendEdge(e)),
        );
        store.setSyncStatus('online');

        await useChatStore.getState().loadHistory(pipeline.id);

        if (cancelled) return;
        disconnect = connectPipelineSocket(pipeline.id);
      } catch {
        if (!cancelled) usePipelineStore.getState().setSyncStatus('offline');
      }
    }

    void run();

    return () => {
      cancelled = true;
      disconnect?.();
    };
  }, []);
}
