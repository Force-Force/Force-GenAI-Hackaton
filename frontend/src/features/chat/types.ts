import type { AiAction } from '../../contracts/aiActions';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  /** Optional structured action the user can apply to the graph. */
  action?: AiAction | null;
}
