import { z } from 'zod';

/**
 * Backend API Data Contracts (FastAPI & Nightshift Provider)
 * Reference: docs/integration/FRONTEND_INTEGRATION.md
 */

// ============================================================================
// 1. Health & Server Info
// ============================================================================

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  model: z.string().nullable().optional(),
  llm_configured: z.boolean().default(false),
  provider: z.string().optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// ============================================================================
// 2. ReactFlow Nodes & Edges (Backend Schema)
// ============================================================================

export const backendNodeTypeSchema = z.enum(['SOURCE', 'TRANSFORM', 'SINK']);
export type BackendNodeType = z.infer<typeof backendNodeTypeSchema>;

export const backendNodeSubtypeSchema = z.enum([
  'csv',
  'json',
  'python_script',
  'sql_query',
  'postgres_sink',
  'sqlite',
  'generic',
]);
export type BackendNodeSubtype = z.infer<typeof backendNodeSubtypeSchema>;

export const backendNodeStatusSchema = z.enum(['IDLE', 'PENDING', 'VALID', 'ERROR']);
export type BackendNodeStatus = z.infer<typeof backendNodeStatusSchema>;

export const backendPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const backendNodeSchema = z.object({
  id: z.string().min(1),
  type: backendNodeTypeSchema,
  subtype: backendNodeSubtypeSchema.default('generic'),
  label: z.string().default('Node'),
  position: backendPositionSchema.default({ x: 0, y: 0 }),
  data: z.record(z.string(), z.unknown()).default({}),
  status: backendNodeStatusSchema.default('IDLE'),
});
export type BackendNode = z.infer<typeof backendNodeSchema>;

export const createNodePayloadSchema = z.object({
  type: backendNodeTypeSchema,
  subtype: backendNodeSubtypeSchema.optional().default('generic'),
  label: z.string().optional().default('Node'),
  position: backendPositionSchema.optional().default({ x: 0, y: 0 }),
  data: z.record(z.string(), z.unknown()).optional().default({}),
  status: backendNodeStatusSchema.optional().default('IDLE'),
});
export type CreateNodePayload = z.infer<typeof createNodePayloadSchema>;

export const updateNodePayloadSchema = z.object({
  type: backendNodeTypeSchema.optional(),
  subtype: backendNodeSubtypeSchema.optional(),
  label: z.string().optional(),
  position: backendPositionSchema.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  status: backendNodeStatusSchema.optional(),
});
export type UpdateNodePayload = z.infer<typeof updateNodePayloadSchema>;

export const backendEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});
export type BackendEdge = z.infer<typeof backendEdgeSchema>;

export const createEdgePayloadSchema = z.object({
  source_node_id: z.string().min(1),
  target_node_id: z.string().min(1),
});
export type CreateEdgePayload = z.infer<typeof createEdgePayloadSchema>;

// ============================================================================
// 3. Pipeline Session
// ============================================================================

export const pipelineStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type PipelineStatus = z.infer<typeof pipelineStatusSchema>;

export const backendPipelineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: pipelineStatusSchema.default('DRAFT'),
  architecture_design: z.record(z.string(), z.unknown()).default({}),
  updated_at: z.string().optional(),
  nodes: z.array(backendNodeSchema).default([]),
  edges: z.array(backendEdgeSchema).default([]),
});
export type BackendPipeline = z.infer<typeof backendPipelineSchema>;

export const pipelineListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: pipelineStatusSchema,
  updated_at: z.string(),
});
export type PipelineListItem = z.infer<typeof pipelineListItemSchema>;

export const createPipelinePayloadSchema = z.object({
  name: z.string().min(1).max(255),
});
export type CreatePipelinePayload = z.infer<typeof createPipelinePayloadSchema>;

export const updatePipelinePayloadSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: pipelineStatusSchema.optional(),
  architecture_design: z.record(z.string(), z.unknown()).optional(),
});
export type UpdatePipelinePayload = z.infer<typeof updatePipelinePayloadSchema>;

// ============================================================================
// 4. Chat & Agent Tasks
// ============================================================================

export const backendChatSenderSchema = z.enum(['USER', 'MASTER_AGENT', 'GUARDIAN_AGENT']);
export type BackendChatSender = z.infer<typeof backendChatSenderSchema>;

export const backendChatMessageSchema = z.object({
  id: z.string().min(1),
  pipeline_id: z.string().optional(),
  sender: backendChatSenderSchema,
  content_md: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().optional(),
});
export type BackendChatMessage = z.infer<typeof backendChatMessageSchema>;

export const backendAgentRoleSchema = z.enum([
  'MASTER',
  'PROFILER',
  'ENGINEER',
  'DEBUGGER',
  'GUARDIAN',
  'QA',
  'AUDITOR',
]);
export type BackendAgentRole = z.infer<typeof backendAgentRoleSchema>;

export const backendAgentTaskStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
]);
export type BackendAgentTaskStatus = z.infer<typeof backendAgentTaskStatusSchema>;

export const backendAgentTaskSchema = z.object({
  id: z.string().min(1),
  node_id: z.string().nullable().optional(),
  agent_role: backendAgentRoleSchema,
  instruction: z.string().optional(),
  input_payload: z.unknown().optional(),
  output_payload: z.unknown().optional(),
  status: backendAgentTaskStatusSchema,
  created_at: z.string().optional(),
  completed_at: z.string().nullable().optional(),
});
export type BackendAgentTask = z.infer<typeof backendAgentTaskSchema>;

export const sendChatResponseSchema = z.object({
  user_message: z.record(z.string(), z.unknown()),
  agent_message: z.record(z.string(), z.unknown()),
  agent_tasks: z.array(backendAgentTaskSchema).default([]),
});
export type SendChatResponse = z.infer<typeof sendChatResponseSchema>;

// ============================================================================
// 5. Pipeline Runs, Guardian Approvals & User Questions
// ============================================================================

export const runStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'AWAITING_APPROVAL',
  'AWAITING_USER_INPUT',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);
export type RunStatus = z.infer<typeof runStatusSchema>;

export const backendRunSchema = z.object({
  id: z.string().min(1),
  status: runStatusSchema,
  current_node_id: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  error_message: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  events: z.array(z.record(z.string(), z.unknown())).default([]),
  pending_approvals: z.array(z.record(z.string(), z.unknown())).default([]),
  pending_questions: z.array(z.record(z.string(), z.unknown())).default([]),
});
export type BackendRun = z.infer<typeof backendRunSchema>;

export const startRunResponseSchema = z.object({
  run: backendRunSchema,
  message: z.string().optional(),
});
export type StartRunResponse = z.infer<typeof startRunResponseSchema>;

export const approvalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const backendApprovalSchema = z.object({
  id: z.string().min(1),
  status: approvalStatusSchema.default('PENDING'),
  operation_type: z.string().optional(),
  risk_level: z.string().optional(),
  masked_preview: z.unknown().optional(),
  pii_findings: z.array(z.unknown()).optional(),
  pending_action: z.unknown().optional(),
  resolution: z.unknown().optional(),
  created_at: z.string().optional(),
});
export type BackendApproval = z.infer<typeof backendApprovalSchema>;

export const questionStatusSchema = z.enum(['PENDING', 'ANSWERED', 'CANCELLED']);
export type QuestionStatus = z.infer<typeof questionStatusSchema>;

export const backendQuestionSchema = z.object({
  id: z.string().min(1),
  run_id: z.string().nullable().optional(),
  status: questionStatusSchema.default('PENDING'),
  question: z.string().optional(),
  answer: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
export type BackendQuestion = z.infer<typeof backendQuestionSchema>;

// ============================================================================
// 6. ETL Endpoints
// ============================================================================

export const etlIntrospectResponseSchema = z.object({
  live_data_profile: z.record(z.string(), z.unknown()).default({}),
  message: z.string().optional(),
});
export type EtlIntrospectResponse = z.infer<typeof etlIntrospectResponseSchema>;

export const etlExecuteResponseSchema = z.object({
  instruction: z.string(),
  sql: z.string().default(''),
  explanation: z.string().default(''),
  row_count: z.number().default(0),
  rows: z.array(z.record(z.string(), z.unknown())).default([]),
  summary_md: z.string().default(''),
  stored_in_pipeline: z.boolean().default(false),
});
export type EtlExecuteResponse = z.infer<typeof etlExecuteResponseSchema>;

export const etlResultsResponseSchema = z.object({
  instruction: z.string().optional(),
  sql: z.string().optional(),
  row_count: z.number().optional(),
  rows: z.array(z.record(z.string(), z.unknown())).default([]),
  summary_md: z.string().optional(),
  executed_at: z.string().optional(),
});
export type EtlResultsResponse = z.infer<typeof etlResultsResponseSchema>;

// ============================================================================
// 7. Standalone Analysis Agent (Nightshift Provider)
// ============================================================================

export const agentQueryIntentSchema = z.enum(['informational', 'predictive', 'action-oriented']);
export type AgentQueryIntent = z.infer<typeof agentQueryIntentSchema>;

export const agentQueryResponseSchema = z.object({
  response: z.string(),
  trace: z.unknown().optional(),
  request_id: z.string(),
  status: z.string(),
  sql: z.string().nullable().optional(),
  sources: z.array(z.string()).default([]),
  views_used: z.array(z.string()).default([]),
  model: z.string().nullable().optional(),
  model_route: z.string().nullable().optional(),
  latency_ms: z.number().optional(),
  calculations: z.array(z.unknown()).default([]),
  evidence: z.array(z.unknown()).default([]),
  warnings: z.array(z.string()).default([]),
  provider: z.string().optional().default('nightshift'),
  intent: agentQueryIntentSchema.optional().default('informational'),
  risk_level: z.string().optional(),
  approval_required: z.boolean().optional().default(false),
});
export type AgentQueryResponse = z.infer<typeof agentQueryResponseSchema>;

// ============================================================================
// 8. WebSocket Frames
// ============================================================================

export const backendWsEventTypeSchema = z.enum([
  'pipeline.updated',
  'node.created',
  'node.updated',
  'node.deleted',
  'edge.created',
  'edge.deleted',
  'chat.message',
  'agent_task.updated',
  'guardian.approval_required',
  'guardian.approval_resolved',
  'pipeline.run_updated',
  'pipeline.run_event',
  'user_input.required',
  'user_input.answered',
]);
export type BackendWsEventType = z.infer<typeof backendWsEventTypeSchema>;

export const backendWsFrameSchema = z.object({
  type: z.string(),
  pipeline_id: z.string().optional(),
  payload: z.unknown().default({}),
});
export type BackendWsFrame = z.infer<typeof backendWsFrameSchema>;

