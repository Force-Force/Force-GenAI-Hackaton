import { z } from 'zod';
import { runStatusSchema } from './backendApi';

export const pipelineRevisionAuthorSchema = z.enum([
  'USER',
  'MASTER_AGENT',
  'PLANNER_AGENT',
  'GUARDIAN_AGENT',
  'AUDITOR_AGENT',
]);
export type PipelineRevisionAuthor = z.infer<typeof pipelineRevisionAuthorSchema>;

export const pipelineRevisionSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().min(1),
  pipeline_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  author_type: pipelineRevisionAuthorSchema,
  author_name: z.string().default('AuraBI System'),
  created_at: z.string(),
  node_count: z.number().int().min(0),
  edge_count: z.number().int().min(0),
  stage_count: z.number().int().min(0).default(0),
  operations_summary: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  snapshot: z
    .object({
      nodes: z.array(z.any()).default([]),
      edges: z.array(z.any()).default([]),
      planTitle: z.string().optional(),
      stages: z.array(z.any()).optional(),
      kpis: z.array(z.any()).optional(),
    })
    .optional(),
});
export type PipelineRevision = z.infer<typeof pipelineRevisionSchema>;

export const pipelineRunEventItemSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string(),
  phase: z.string(),
  status: z.enum(['INFO', 'RUNNING', 'SUCCESS', 'WARNING', 'ERROR']),
  message: z.string(),
  node_id: z.string().optional(),
  duration_ms: z.number().optional(),
});
export type PipelineRunEventItem = z.infer<typeof pipelineRunEventItemSchema>;

export const pipelineRunHistoryItemSchema = z.object({
  id: z.string().min(1),
  pipeline_id: z.string().min(1),
  run_number: z.number().int().min(1),
  status: runStatusSchema,
  trigger_type: z.enum(['MANUAL', 'SCHEDULED', 'AGENT_OPTIMIZATION', 'WEBHOOK']).default('MANUAL'),
  started_at: z.string(),
  completed_at: z.string().optional(),
  duration_seconds: z.number().min(0).default(0),
  records_processed: z.number().int().min(0).default(0),
  nodes_executed: z.number().int().min(0).default(0),
  total_nodes: z.number().int().min(0).default(0),
  error_message: z.string().nullable().optional(),
  events: z.array(pipelineRunEventItemSchema).default([]),
});
export type PipelineRunHistoryItem = z.infer<typeof pipelineRunHistoryItemSchema>;

export const rollbackResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  previous_revision: z.number().int(),
  new_revision: z.number().int(),
  restored_snapshot: z.record(z.string(), z.unknown()).optional(),
});
export type RollbackResponse = z.infer<typeof rollbackResponseSchema>;

