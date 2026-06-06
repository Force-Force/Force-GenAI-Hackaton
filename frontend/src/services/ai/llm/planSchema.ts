import { z } from 'zod';
import { aiActionSchema, type AiAction } from '../../../contracts/aiActions';

/**
 * Flat, provider-friendly schema for what the LLM returns. We deliberately keep
 * it flat (optional fields rather than a discriminated union) because JSON-schema
 * conversion across providers handles a single object with optional fields far
 * more reliably than nested discriminated unions with defaults.
 *
 * The flat actions are converted to strict {@link AiAction}s and re-validated
 * against {@link aiActionSchema} before anything touches the canvas.
 */

const llmColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  isPrimaryKey: z.boolean().optional(),
  isForeignKey: z.boolean().optional(),
  fkRefTable: z.string().optional(),
  fkRefColumn: z.string().optional(),
  description: z.string().optional(),
});

export const llmActionSchema = z.object({
  type: z.enum(['create_resource', 'create_processing', 'connect_nodes', 'explain']),
  id: z.string().optional(),
  label: z.string().optional(),
  kind: z.enum(['database', 'warehouse', 'table', 'source', 'external']).optional(),
  warehouseRole: z.enum(['fact', 'dimension', 'source', 'generated']).optional(),
  description: z.string().optional(),
  columns: z.array(llmColumnSchema).optional(),
  language: z.enum(['sql', 'python']).optional(),
  code: z.string().optional(),
  inputColumns: z.array(z.string()).optional(),
  outputColumns: z.array(z.string()).optional(),
  fromNode: z.string().optional(),
  toNode: z.string().optional(),
  fromColumn: z.string().optional(),
  toColumn: z.string().optional(),
  target: z.string().optional(),
});

export const llmPlanSchema = z.object({
  reasoning: z
    .string()
    .describe('One or two sentences explaining the changes you are making to the canvas.'),
  actions: z
    .array(llmActionSchema)
    .describe('Ordered list of canvas changes. Empty if the message implies no changes.'),
});

export type LlmAction = z.infer<typeof llmActionSchema>;
export type LlmPlan = z.infer<typeof llmPlanSchema>;

/** Convert one flat LLM action into a strict, validated AiAction (or null). */
function toAiAction(a: LlmAction): AiAction | null {
  let candidate: unknown;
  switch (a.type) {
    case 'create_resource':
      candidate = {
        type: 'create_resource',
        payload: {
          id: a.id,
          label: a.label ?? a.id,
          kind: a.kind ?? 'table',
          warehouseRole: a.warehouseRole,
          description: a.description ?? '',
          columns: (a.columns ?? []).map((c) => ({
            name: c.name,
            type: c.type,
            isPrimaryKey: c.isPrimaryKey ?? false,
            isForeignKey: c.isForeignKey ?? false,
            fkRefTable: c.fkRefTable,
            fkRefColumn: c.fkRefColumn,
            description: c.description,
          })),
        },
      };
      break;
    case 'create_processing':
      candidate = {
        type: 'create_processing',
        payload: {
          id: a.id,
          label: a.label ?? a.id,
          language: a.language ?? 'sql',
          description: a.description ?? '',
          code: a.code ?? '',
          inputColumns: a.inputColumns ?? [],
          outputColumns: a.outputColumns ?? [],
        },
      };
      break;
    case 'connect_nodes':
      candidate = {
        type: 'connect_nodes',
        payload: {
          fromNode: a.fromNode,
          toNode: a.toNode,
          fromColumn: a.fromColumn,
          toColumn: a.toColumn,
        },
      };
      break;
    case 'explain':
      candidate = { type: 'explain', payload: { target: a.target, note: a.description } };
      break;
    default:
      return null;
  }

  const parsed = aiActionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** Convert an LLM plan into the strict AiActions the reducer accepts. */
export function planToAiActions(plan: LlmPlan): AiAction[] {
  return plan.actions
    .map(toAiAction)
    .filter((a): a is AiAction => a !== null)
    // Drop explain actions: they do not modify the canvas.
    .filter((a) => a.type !== 'explain');
}
