import type { UiopEnvelope } from "../../contracts/uiop";

export interface AgentTask {
  id: string;
  agent_role: string;
  instruction?: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  input_data?: unknown;
  output_data?: unknown;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text: string;
  /** Optional declarative UIOP v1.0 batch proposed by the AI agent. */
  uiop?: UiopEnvelope | null;
  /** Delegated backend agent tasks surfaced alongside an assistant reply. */
  tasks?: AgentTask[];
  system?: boolean;
}
