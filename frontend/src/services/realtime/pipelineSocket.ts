import { buildWsUrl } from '../http/config';
import type { BackendWsEventType, BackendWsFrame } from '../../contracts/backendApi';
import {
  handleBackendEdgeCreated,
  handleBackendEdgeDeleted,
  handleBackendNodeCreated,
  handleBackendNodeDeleted,
  handleBackendNodeUpdated,
  handleBackendQuestionPrompt,
} from '../mapping/backendToUiopBridge';

export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
export type WsEventListener = (frame: BackendWsFrame) => void;

class PipelineSocketManager {
  private socket: WebSocket | null = null;
  private pipelineId: string | null = null;
  private status: WebSocketStatus = 'disconnected';
  private listeners: Map<string, Set<WsEventListener>> = new Map();
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private isIntentionallyClosed = false;

  getStatus(): WebSocketStatus {
    return this.status;
  }

  getPipelineId(): string | null {
    return this.pipelineId;
  }

  onStatusChange(listener: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  on(eventType: BackendWsEventType | '*', listener: WsEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  connect(pipelineId: string) {
    if (this.pipelineId === pipelineId && (this.status === 'connected' || this.status === 'connecting')) {
      return;
    }

    this.disconnect();
    this.pipelineId = pipelineId;
    this.isIntentionallyClosed = false;
    this.reconnectAttempt = 0;
    this.initiateSocket();
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    this.clearReconnect();

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }

    this.setStatus('disconnected');
    this.pipelineId = null;
  }

  send(data: string | object) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(payload);
    }
  }

  private setStatus(next: WebSocketStatus) {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
  }

  private initiateSocket() {
    if (!this.pipelineId || this.isIntentionallyClosed) return;

    this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    const wsUrl = buildWsUrl(`/ws/pipelines/${this.pipelineId}`);

    try {
      this.socket = new WebSocket(wsUrl);
    } catch (err) {
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.setStatus('connected');
      this.reconnectAttempt = 0;
      this.startHeartbeat();
      // Notify wildcard listeners that connection/reconnect succeeded
      this.emit({ type: 'ws.connected', pipeline_id: this.pipelineId ?? undefined, payload: {} });
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      if (!this.isIntentionallyClosed) {
        this.setStatus('reconnecting');
        this.scheduleReconnect();
      } else {
        this.setStatus('disconnected');
      }
    };

    this.socket.onerror = () => {
      // onclose will follow and trigger reconnect
    };

    this.socket.onmessage = (event: MessageEvent) => {
      this.handleIncomingMessage(event.data);
    };
  }

  private handleIncomingMessage(raw: unknown) {
    if (typeof raw !== 'string') return;
    if (raw === 'pong' || raw === 'ping') return;

    let frame: BackendWsFrame;
    try {
      frame = JSON.parse(raw) as BackendWsFrame;
    } catch {
      return;
    }

    // Default UIOP v1.0 bridging for graph/run events
    this.bridgeEventToUiop(frame);

    // Notify listeners
    this.emit(frame);
  }

  private bridgeEventToUiop(frame: BackendWsFrame) {
    const payload = frame.payload as Record<string, any>;
    if (!payload) return;

    try {
      switch (frame.type) {
        case 'node.created':
          if (payload.id && payload.type) {
            handleBackendNodeCreated(payload as any);
          }
          break;
        case 'node.updated':
          if (payload.id) {
            handleBackendNodeUpdated(payload.id, payload);
          }
          break;
        case 'node.deleted':
          if (payload.id) {
            handleBackendNodeDeleted(payload.id);
          }
          break;
        case 'edge.created':
          if (payload.id && payload.source && payload.target) {
            handleBackendEdgeCreated(payload as any);
          }
          break;
        case 'edge.deleted':
          if (payload.id) {
            handleBackendEdgeDeleted(payload.id);
          }
          break;
        case 'user_input.required':
          if (payload.id) {
            handleBackendQuestionPrompt(payload as any);
          }
          break;
      }
    } catch {
      // safe fallback
    }
  }

  private emit(frame: BackendWsFrame) {
    const directListeners = this.listeners.get(frame.type);
    if (directListeners) {
      directListeners.forEach((fn) => {
        try {
          fn(frame);
        } catch (e) {
          console.error('[WebSocket] Listener error:', e);
        }
      });
    }

    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((fn) => {
        try {
          fn(frame);
        } catch (e) {
          console.error('[WebSocket] Wildcard listener error:', e);
        }
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send('ping');
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    this.clearReconnect();
    if (this.isIntentionallyClosed) return;

    // Backoff: 1s, 2s, 4s, 8s, max 15s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 15000);
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.initiateSocket();
    }, delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const pipelineSocket = new PipelineSocketManager();

