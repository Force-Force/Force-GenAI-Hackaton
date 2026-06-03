import { aiActionSchema, type AiAction } from '../../contracts/aiActions';
import { validateWith } from '../../contracts/api';
import type {
  AgentTask,
  BackendChatResponse,
  ChatMessageRead,
} from '../../contracts/backend';

/**
 * Bridges the documented backend chat contract
 * (`user_message` / `agent_message` / `agent_tasks`) to the frontend's internal
 * chat shape (`text` / `action` / `tasks`).
 *
 * The backend MVP does not return a structured graph action, so we look for an
 * optional `action` object on `agent_message.metadata`. When present and valid,
 * the Apply-to-canvas flow is offered; otherwise the message is advisory and
 * any delegated agent tasks are surfaced as a task list.
 */
export interface AdaptedChat {
  text: string;
  action: AiAction | null;
  tasks: AgentTask[];
}

function parseAction(metadata: ChatMessageRead['metadata']): AiAction | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const candidate = (metadata as Record<string, unknown>).action;
  if (!candidate) return null;
  const parsed = validateWith(aiActionSchema, candidate);
  return parsed.ok ? parsed.data : null;
}

function formatTime(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  const value = Number.isNaN(date.getTime()) ? new Date() : date;
  return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function adaptChatResponse(res: BackendChatResponse): AdaptedChat {
  return {
    text: res.agent_message.content_md || '',
    action: parseAction(res.agent_message.metadata),
    tasks: res.agent_tasks ?? [],
  };
}

export interface AdaptedMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  action: AiAction | null;
}

/** Map a persisted backend chat message to a frontend chat message. */
export function adaptChatMessage(message: ChatMessageRead): AdaptedMessage {
  const sender = message.sender === 'USER' ? 'user' : 'assistant';
  return {
    id: message.id,
    sender,
    timestamp: formatTime(message.created_at),
    text: message.content_md || '',
    action: sender === 'assistant' ? parseAction(message.metadata) : null,
  };
}
