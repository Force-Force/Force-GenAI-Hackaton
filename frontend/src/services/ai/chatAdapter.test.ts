import { describe, expect, it } from 'vitest';
import { adaptChatMessage, adaptChatResponse } from './chatAdapter';
import type { BackendChatResponse, ChatMessageRead } from '../../contracts/backend';

function response(
  metadata: Record<string, unknown> | null,
): BackendChatResponse {
  return {
    user_message: { id: 'u', sender: 'USER', content_md: 'hi', metadata: null },
    agent_message: { id: 'a', sender: 'MASTER_AGENT', content_md: 'reply', metadata },
    agent_tasks: [{ id: 't', agent_role: 'ENGINEER', instruction: 'do', status: 'PENDING' }],
  };
}

describe('adaptChatResponse', () => {
  it('extracts a valid action from agent_message.metadata', () => {
    const adapted = adaptChatResponse(
      response({
        action: {
          type: 'create_resource',
          payload: { id: 'X', label: 'X', kind: 'table', description: '', columns: [] },
        },
      }),
    );
    expect(adapted.text).toBe('reply');
    expect(adapted.action?.type).toBe('create_resource');
    expect(adapted.tasks).toHaveLength(1);
  });

  it('returns a null action when metadata is absent', () => {
    const adapted = adaptChatResponse(response(null));
    expect(adapted.action).toBeNull();
  });

  it('returns a null action when the metadata action is invalid', () => {
    const adapted = adaptChatResponse(response({ action: { type: 'create_resource', payload: {} } }));
    expect(adapted.action).toBeNull();
  });
});

describe('adaptChatMessage', () => {
  it('maps a USER message to a user-sender frontend message', () => {
    const msg: ChatMessageRead = { id: 'm', sender: 'USER', content_md: 'hello', metadata: null };
    const adapted = adaptChatMessage(msg);
    expect(adapted.sender).toBe('user');
    expect(adapted.text).toBe('hello');
    expect(adapted.action).toBeNull();
  });

  it('parses an action only for assistant messages', () => {
    const msg: ChatMessageRead = {
      id: 'm',
      sender: 'MASTER_AGENT',
      content_md: 'done',
      metadata: {
        action: { type: 'connect_nodes', payload: { fromNode: 'A', toNode: 'B' } },
      },
    };
    const adapted = adaptChatMessage(msg);
    expect(adapted.sender).toBe('assistant');
    expect(adapted.action?.type).toBe('connect_nodes');
  });
});
