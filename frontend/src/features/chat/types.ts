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
  /** Delegated backend agent tasks surfaced alongside an assistant reply. */
  tasks?: AgentTask[];
  system?: boolean;
}
