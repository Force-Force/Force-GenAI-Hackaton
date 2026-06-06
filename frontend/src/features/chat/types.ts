import type { AiAction } from '../../contracts/aiActions';
import type { AgentTask } from '../../contracts/backend';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  /** Optional structured action the user can apply to the graph. */
  action?: AiAction | null;
  /** Delegated backend agent tasks surfaced alongside an assistant reply. */
  tasks?: AgentTask[];
  /** Marks messages generated locally (e.g. the apply-agent summary) so they
   * are excluded from re-processing by the frontend agent. */
  system?: boolean;
}
