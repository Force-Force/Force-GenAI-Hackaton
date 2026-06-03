import { buildWsUrl } from '../http/config';
import { validateWith } from '../../contracts/api';
import {
  edgeReadSchema,
  nodeReadSchema,
  wsEventSchema,
} from '../../contracts/backend';
import { fromBackendEdge, fromBackendNode } from '../mapping/graphMapping';
import { usePipelineStore } from '../../features/workspace/store/pipelineStore';

/**
 * Subscribes to the pipeline's realtime channel and reconciles inbound graph
 * events into the pipeline store. Returns a disconnect function.
 *
 * Notes:
 *  - Graph upserts are idempotent, so echoes of the client's own optimistic
 *    mutations are harmless.
 *  - `chat.message` is intentionally ignored: chat replies are already rendered
 *    from the POST .../chat response, and backend ids would otherwise duplicate
 *    locally-appended messages.
 */
export function connectPipelineSocket(pipelineId: string): () => void {
  let socket: WebSocket | null = null;
  let closedByClient = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  function dispatch(raw: unknown): void {
    const parsed = validateWith(wsEventSchema, raw);
    if (!parsed.ok) return;
    const event = parsed.data;
    const store = usePipelineStore.getState();

    switch (event.type) {
      case 'node.created':
      case 'node.updated': {
        const node = validateWith(nodeReadSchema, event.payload);
        if (node.ok) store.applyRemoteNode(fromBackendNode(node.data));
        break;
      }
      case 'node.deleted': {
        const id = extractId(event.payload);
        if (id) store.removeRemoteNode(id);
        break;
      }
      case 'edge.created': {
        const edge = validateWith(edgeReadSchema, event.payload);
        if (edge.ok) store.applyRemoteEdge(fromBackendEdge(edge.data));
        break;
      }
      case 'edge.deleted': {
        const id = extractId(event.payload);
        if (id) store.removeRemoteEdge(id);
        break;
      }
      // pipeline.updated, chat.message, agent_task.updated: no graph effect.
      default:
        break;
    }
  }

  function connect(): void {
    try {
      socket = new WebSocket(buildWsUrl(`/ws/pipelines/${pipelineId}`));
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onmessage = (ev) => {
      try {
        dispatch(JSON.parse(ev.data));
      } catch {
        // Ignore non-JSON frames (e.g. keep-alive text).
      }
    };

    socket.onopen = () => {
      // Periodic keep-alive ping; the server accepts arbitrary client text.
      keepAlive = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send('ping');
      }, 30000);
    };

    socket.onclose = () => {
      if (keepAlive) clearInterval(keepAlive);
      if (!closedByClient) scheduleReconnect();
    };

    socket.onerror = () => {
      socket?.close();
    };
  }

  function scheduleReconnect(): void {
    if (closedByClient) return;
    reconnectTimer = setTimeout(connect, 3000);
  }

  connect();

  return () => {
    closedByClient = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (keepAlive) clearInterval(keepAlive);
    socket?.close();
  };
}

function extractId(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'id' in payload) {
    const id = (payload as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  if (typeof payload === 'string') return payload;
  return null;
}
