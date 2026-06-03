import { z } from 'zod';

/**
 * Standardized AI action contract shared between the FastAPI backend responses
 * and the frontend action handlers.
 *
 * Every action is a discriminated union on `type` with a uniform `payload`
 * field. The backend MUST conform to this shape; the frontend validates every
 * response against these schemas before mutating the graph and rejects anything
 * that does not parse.
 */

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const aiColumnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  isPrimaryKey: z.boolean().default(false),
  isForeignKey: z.boolean().default(false),
  fkRefTable: z.string().optional(),
  fkRefColumn: z.string().optional(),
  description: z.string().optional(),
});

export const createResourcePayloadSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z
    .enum(['database', 'warehouse', 'table', 'source', 'external'])
    .default('table'),
  warehouseRole: z
    .enum(['fact', 'dimension', 'source', 'generated'])
    .optional(),
  description: z.string().default(''),
  columns: z.array(aiColumnSchema).default([]),
  position: positionSchema.optional(),
});

export const createProcessingPayloadSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  language: z.enum(['sql', 'python']).default('sql'),
  description: z.string().default(''),
  code: z.string().default(''),
  inputColumns: z.array(z.string()).default([]),
  outputColumns: z.array(z.string()).default([]),
  position: positionSchema.optional(),
});

export const connectNodesPayloadSchema = z.object({
  fromNode: z.string().min(1),
  fromColumn: z.string().optional(),
  toNode: z.string().min(1),
  toColumn: z.string().optional(),
});

export const explainPayloadSchema = z.object({
  target: z.string().optional(),
  note: z.string().optional(),
});

export const aiActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_resource'), payload: createResourcePayloadSchema }),
  z.object({ type: z.literal('create_processing'), payload: createProcessingPayloadSchema }),
  z.object({ type: z.literal('connect_nodes'), payload: connectNodesPayloadSchema }),
  z.object({ type: z.literal('explain'), payload: explainPayloadSchema.default({}) }),
]);

export const chatResponseSchema = z.object({
  text: z.string(),
  action: aiActionSchema.nullable().default(null),
});

export type AiColumn = z.infer<typeof aiColumnSchema>;
export type CreateResourcePayload = z.infer<typeof createResourcePayloadSchema>;
export type CreateProcessingPayload = z.infer<typeof createProcessingPayloadSchema>;
export type ConnectNodesPayload = z.infer<typeof connectNodesPayloadSchema>;
export type ExplainPayload = z.infer<typeof explainPayloadSchema>;
export type AiAction = z.infer<typeof aiActionSchema>;
export type AiActionType = AiAction['type'];
export type ChatResponse = z.infer<typeof chatResponseSchema>;
