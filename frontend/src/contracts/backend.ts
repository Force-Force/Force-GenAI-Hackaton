import { z } from 'zod';

/**
 * Zod schemas mirroring the DataPipe FastAPI contracts (see
 * Documentation/API_ROUTES.md). These describe the wire format exchanged with
 * the backend. The frontend's internal domain model lives in types/pipeline.ts
 * and is translated to/from these shapes by services/mapping/graphMapping.ts.
 */

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const backendNodeTypeSchema = z.enum(['SOURCE', 'TRANSFORM', 'SINK']);
export const backendNodeSubtypeSchema = z.enum([
  'csv',
  'json',
  'python_script',
  'sql_query',
  'postgres_sink',
  'sqlite',
  'generic',
]);
export const backendNodeStatusSchema = z.enum([
  'IDLE',
  'PENDING',
  'VALID',
  'ERROR',
]);

export const pipelineStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

/** Free-form node data the backend stores as opaque JSON. */
export const nodeDataSchema = z.record(z.string(), z.unknown());

export const nodeReadSchema = z.object({
  id: z.string(),
  type: backendNodeTypeSchema,
  subtype: backendNodeSubtypeSchema.optional().default('generic'),
  label: z.string().default(''),
  position: positionSchema,
  data: nodeDataSchema.optional().default({}),
  status: backendNodeStatusSchema.optional().default('IDLE'),
});

export const edgeReadSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

export const architectureDesignSchema = z
  .object({
    model_type: z.enum(['STAR', 'SNOWFLAKE', 'OLAP_CUBE', 'FLAT']).optional(),
    scd_type: z.string().optional(),
    justification: z.string().optional(),
  })
  .passthrough();

export const pipelineReadSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: pipelineStatusSchema.optional().default('DRAFT'),
  architecture_design: architectureDesignSchema.nullable().optional(),
  updated_at: z.string().optional(),
  nodes: z.array(nodeReadSchema).default([]),
  edges: z.array(edgeReadSchema).default([]),
});

export const pipelineListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: pipelineStatusSchema.optional().default('DRAFT'),
  updated_at: z.string().optional(),
});

export const pipelineListSchema = z.array(pipelineListItemSchema);

/** Chat message persisted by the backend. */
export const chatMessageReadSchema = z.object({
  id: z.string(),
  sender: z.enum(['USER', 'MASTER_AGENT']),
  content_md: z.string().default(''),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string().optional(),
});

export const agentTaskSchema = z.object({
  id: z.string(),
  agent_role: z
    .enum(['ANALYST', 'PROFILER', 'ENGINEER', 'QA', 'REPORTER', 'GUARDIAN'])
    .or(z.string()),
  instruction: z.string().default(''),
  status: z
    .enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'])
    .optional()
    .default('PENDING'),
  input_data: z.unknown().optional(),
  output_data: z.unknown().optional(),
});

export const chatHistorySchema = z.array(chatMessageReadSchema);

/** Response shape for POST .../chat. */
export const backendChatResponseSchema = z.object({
  user_message: chatMessageReadSchema,
  agent_message: chatMessageReadSchema,
  agent_tasks: z.array(agentTaskSchema).default([]),
});

/** Validation engine contracts (Routes.md routes 7-9). */
export const validationSeveritySchema = z.enum(['ERROR', 'WARNING', 'INFO']);
export const validationStatusSchema = z.enum(['PASSED', 'FAILED']);

export const validationIssueSchema = z.object({
  severity: validationSeveritySchema,
  code: z.string().default(''),
  message: z.string().default(''),
  node_id: z.string().nullable().optional(),
});

export const validationRunSchema = z.object({
  id: z.string(),
  pipeline_id: z.string().optional(),
  score: z.number(),
  grade: z.string().optional(),
  status: validationStatusSchema,
  issues: z.array(validationIssueSchema).default([]),
  summary: z.string().default(''),
  created_at: z.string().optional(),
});

/** Realtime event envelope pushed over the WebSocket channel. */
export const wsEventSchema = z.object({
  type: z.enum([
    'pipeline.updated',
    'node.created',
    'node.updated',
    'node.deleted',
    'edge.created',
    'edge.deleted',
    'chat.message',
    'agent_task.updated',
    'validation.completed',
  ]),
  pipeline_id: z.string().optional(),
  payload: z.unknown().optional(),
});

export type BackendNodeType = z.infer<typeof backendNodeTypeSchema>;
export type BackendNodeSubtype = z.infer<typeof backendNodeSubtypeSchema>;
export type BackendNodeStatus = z.infer<typeof backendNodeStatusSchema>;
export type NodeRead = z.infer<typeof nodeReadSchema>;
export type EdgeRead = z.infer<typeof edgeReadSchema>;
export type PipelineRead = z.infer<typeof pipelineReadSchema>;
export type PipelineListItem = z.infer<typeof pipelineListItemSchema>;
export type ChatMessageRead = z.infer<typeof chatMessageReadSchema>;
export type AgentTask = z.infer<typeof agentTaskSchema>;
export type BackendChatResponse = z.infer<typeof backendChatResponseSchema>;
export type WsEvent = z.infer<typeof wsEventSchema>;
export type ArchitectureDesign = z.infer<typeof architectureDesignSchema>;
export type PipelineStatus = z.infer<typeof pipelineStatusSchema>;
export type ValidationSeverity = z.infer<typeof validationSeveritySchema>;
export type ValidationStatus = z.infer<typeof validationStatusSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ValidationRun = z.infer<typeof validationRunSchema>;
export type WsEventType = WsEvent['type'];
