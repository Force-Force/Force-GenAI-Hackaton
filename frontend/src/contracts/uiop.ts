import { z } from "zod";

/**
 * UI Operations Protocol (UIOP) v1.0 — Declarative Contract & Schemas
 * Reference: docs/FRONTEND_SPECS (1).md (Sections 5, 6, 7)
 *
 * Agents propose interface, canvas, plan, and clarifying-question changes
 * through versioned, declarative UIOP envelopes. Every envelope and operation
 * is validated with Zod before semantic and revision checks run.
 */

export const UIOP_PROTOCOL = "uiop" as const;
export const UIOP_VERSION = "1.0" as const;
export const MAX_UIOP_OPERATIONS = 50;

export const uiopPositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const uiopColumnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  isPrimaryKey: z.boolean().default(false),
  isForeignKey: z.boolean().default(false),
  fkRefTable: z.string().optional(),
  fkRefColumn: z.string().optional(),
  description: z.string().optional(),
});

// ============================================================================
// 1. Canvas / Graph Operations (node.*, edge.*, layout.update)
// ============================================================================

export const uiopNodeTypeSchema = z.enum([
  "dataModel",
  "resource",
  "processing",
  "datamart",
]);

export const nodeAddParamsSchema = z.object({
  id: z.string().min(1),
  type: uiopNodeTypeSchema.default("dataModel"),
  position: uiopPositionSchema.optional(),
  data: z
    .object({
      label: z.string().min(1),
      description: z.string().default(""),
      kind: z
        .enum(["database", "warehouse", "table", "source", "external"])
        .optional(),
      warehouseRole: z
        .enum(["fact", "dimension", "source", "generated"])
        .optional(),
      format: z
        .enum([
          "csv",
          "xlsx",
          "json",
          "parquet",
          "api",
          "postgresql",
          "mysql",
          "snowflake",
          "salesforce",
          "stripe",
          "mongodb",
          "generic",
        ])
        .optional(),
      columns: z.array(uiopColumnSchema).default([]),
      language: z.enum(["sql", "python"]).optional(),
      engine: z.enum(["sql", "python", "spark", "pandas", "dbt"]).optional(),
      code: z.string().optional(),
      inputColumns: z.array(z.string()).optional(),
      outputColumns: z.array(z.string()).optional(),
      containerKind: z.enum(["warehouse", "database", "datamart"]).optional(),
      expanded: z.boolean().optional(),
      /** Optional parent container ID if adding a table directly inside a container. */
      targetContainerId: z.string().optional(),
    })
    .passthrough(),
});

export const nodeUpdateParamsSchema = z.object({
  id: z.string().min(1),
  position: uiopPositionSchema.optional(),
  data: z
    .object({
      label: z.string().min(1).optional(),
      description: z.string().optional(),
      kind: z
        .enum(["database", "warehouse", "table", "source", "external"])
        .optional(),
      warehouseRole: z
        .enum(["fact", "dimension", "source", "generated"])
        .optional(),
      columns: z.array(uiopColumnSchema).optional(),
      language: z.enum(["sql", "python"]).optional(),
      engine: z.enum(["sql", "python", "spark", "pandas", "dbt"]).optional(),
      code: z.string().optional(),
      inputColumns: z.array(z.string()).optional(),
      outputColumns: z.array(z.string()).optional(),
      expanded: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
});

export const nodeRemoveParamsSchema = z.object({
  id: z.string().min(1),
  /**
   * When false, removing a node that still has connected edges fails semantic
   * validation. Defaults to true (cascade-removes incident edges).
   */
  cascadeEdges: z.boolean().default(true),
});

export const edgeAddParamsSchema = z.object({
  id: z.string().min(1).optional(),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z
    .enum(["relationship", "data_flow", "foreign_key"])
    .default("relationship"),
  data: z
    .object({
      label: z.string().optional(),
      fromColumn: z.string().optional(),
      toColumn: z.string().optional(),
      relationship: z.enum(["data_flow", "foreign_key"]).optional(),
    })
    .optional(),
});

export const edgeUpdateParamsSchema = z.object({
  id: z.string().min(1),
  data: z.object({
    label: z.string().optional(),
    fromColumn: z.string().optional(),
    toColumn: z.string().optional(),
    relationship: z.enum(["data_flow", "foreign_key"]).optional(),
  }),
});

export const edgeRemoveParamsSchema = z.object({
  id: z.string().min(1),
});

export const layoutUpdateParamsSchema = z.object({
  direction: z.enum(["LR", "TB"]).default("LR"),
  positions: z.record(z.string(), uiopPositionSchema).optional(),
});

// ============================================================================
// 2. UI Panel & Structured Report Operations (panel.*, report.update)
// ============================================================================

export const panelAddParamsSchema = z.object({
  id: z.string().min(1),
  component: z.string().min(1),
  title: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const panelUpdateParamsSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  open: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const panelRemoveParamsSchema = z.object({
  id: z.string().min(1),
});

export const reportSectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  bodyMd: z.string(),
  verified: z.boolean().default(false),
  evidenceRefs: z.array(z.string()).default([]),
});

export const reportUpdateParamsSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  sections: z.array(reportSectionSchema).default([]),
});

// ============================================================================
// 3. Plan & Proposed Clarifying Questions Operations (plan.*, question.*)
// ============================================================================

export const planStageSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  tables: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

export const reasoningPhaseSchema = z.object({
  id: z.string().min(1),
  stepIndex: z.number().int().positive(),
  title: z.string().min(1),
  scripts: z.array(z.string()).default([]),
  reasoning: z.string(),
});

export const kpiDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z
    .enum(["Finance", "Customer", "Integrity", "Custom"])
    .default("Custom"),
  formula: z.string().min(1),
  sourceSystem: z.string().default("Raw Ingestion Ledger"),
  targetMart: z.string().default("fact_daily_revenue"),
  sourceLedgerValue: z.string().default("$0.00"),
  martOutputValue: z.string().default("$0.00"),
  variance: z.string().default("$0.00 (0.00%)"),
  tolerance: z.string().default("±0.00%"),
  description: z.string().default(""),
});

export const planCreateParamsSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  prompt: z.string().optional(),
  summary: z.string().optional(),
  stages: z.array(planStageSchema).min(1),
  reasoningPhases: z.array(reasoningPhaseSchema).optional(),
  kpis: z.array(kpiDefinitionSchema).optional(),
  compiledSql: z.string().optional(),
});

export const planUpdateParamsSchema = z.object({
  title: z.string().min(1).optional(),
  prompt: z.string().optional(),
  summary: z.string().optional(),
  stages: z.array(planStageSchema).optional(),
  reasoningPhases: z.array(reasoningPhaseSchema).optional(),
  kpis: z.array(kpiDefinitionSchema).optional(),
  selectedKpiIds: z.array(z.string()).optional(),
  compiledSql: z.string().optional(),
});

export const questionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(""),
  isRecommended: z.boolean().optional(),
});

export const questionProposeParamsSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  context: z.string().default(""),
  options: z.array(questionOptionSchema).min(2),
  selectedOptionId: z.string().optional(),
});

export const questionAnswerParamsSchema = z.object({
  id: z.string().min(1),
  optionId: z.string().min(1),
});

export const questionRemoveParamsSchema = z.object({
  id: z.string().min(1),
});

// ============================================================================
// 4. Discriminated Union of All Supported UIOP Operations
// ============================================================================

export const uiopOperationSchema = z.discriminatedUnion("op", [
  // Graph / Canvas
  z.object({ op: z.literal("node.add"), params: nodeAddParamsSchema }),
  z.object({ op: z.literal("node.update"), params: nodeUpdateParamsSchema }),
  z.object({ op: z.literal("node.remove"), params: nodeRemoveParamsSchema }),
  z.object({ op: z.literal("edge.add"), params: edgeAddParamsSchema }),
  z.object({ op: z.literal("edge.update"), params: edgeUpdateParamsSchema }),
  z.object({ op: z.literal("edge.remove"), params: edgeRemoveParamsSchema }),
  z.object({
    op: z.literal("layout.update"),
    params: layoutUpdateParamsSchema,
  }),
  // Panels & Reports
  z.object({ op: z.literal("panel.add"), params: panelAddParamsSchema }),
  z.object({ op: z.literal("panel.update"), params: panelUpdateParamsSchema }),
  z.object({ op: z.literal("panel.remove"), params: panelRemoveParamsSchema }),
  z.object({
    op: z.literal("report.update"),
    params: reportUpdateParamsSchema,
  }),
  // Plans & Clarifying Questions
  z.object({ op: z.literal("plan.create"), params: planCreateParamsSchema }),
  z.object({ op: z.literal("plan.update"), params: planUpdateParamsSchema }),
  z.object({
    op: z.literal("question.propose"),
    params: questionProposeParamsSchema,
  }),
  z.object({
    op: z.literal("question.answer"),
    params: questionAnswerParamsSchema,
  }),
  z.object({
    op: z.literal("question.remove"),
    params: questionRemoveParamsSchema,
  }),
]);

// ============================================================================
// 5. UIOP Message Envelope Schema
// ============================================================================

export const uiopSourceSchema = z.object({
  agentId: z.string().min(1),
  executionId: z.string().min(1),
});

export const uiopEnvelopeSchema = z.object({
  protocol: z.literal(UIOP_PROTOCOL),
  version: z.literal(UIOP_VERSION),
  messageId: z.string().min(1),
  workspaceId: z.string().min(1),
  baseRevision: z.number().int().nonnegative(),
  source: uiopSourceSchema,
  operations: z.array(uiopOperationSchema).min(1).max(MAX_UIOP_OPERATIONS),
});

// ============================================================================
// 6. Exported TypeScript Types
// ============================================================================

export type UiopPosition = z.infer<typeof uiopPositionSchema>;
export type UiopColumn = z.infer<typeof uiopColumnSchema>;
export type UiopNodeType = z.infer<typeof uiopNodeTypeSchema>;
export type NodeAddParams = z.infer<typeof nodeAddParamsSchema>;
export type NodeUpdateParams = z.infer<typeof nodeUpdateParamsSchema>;
export type NodeRemoveParams = z.infer<typeof nodeRemoveParamsSchema>;
export type EdgeAddParams = z.infer<typeof edgeAddParamsSchema>;
export type EdgeUpdateParams = z.infer<typeof edgeUpdateParamsSchema>;
export type EdgeRemoveParams = z.infer<typeof edgeRemoveParamsSchema>;
export type LayoutUpdateParams = z.infer<typeof layoutUpdateParamsSchema>;
export type PanelAddParams = z.infer<typeof panelAddParamsSchema>;
export type PanelUpdateParams = z.infer<typeof panelUpdateParamsSchema>;
export type PanelRemoveParams = z.infer<typeof panelRemoveParamsSchema>;
export type ReportSection = z.infer<typeof reportSectionSchema>;
export type ReportUpdateParams = z.infer<typeof reportUpdateParamsSchema>;
export type PlanStage = z.infer<typeof planStageSchema>;
export type ReasoningPhase = z.infer<typeof reasoningPhaseSchema>;
export type KpiDefinition = z.infer<typeof kpiDefinitionSchema>;
export type PlanCreateParams = z.infer<typeof planCreateParamsSchema>;
export type PlanUpdateParams = z.infer<typeof planUpdateParamsSchema>;
export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type QuestionProposeParams = z.infer<typeof questionProposeParamsSchema>;
export type QuestionAnswerParams = z.infer<typeof questionAnswerParamsSchema>;
export type QuestionRemoveParams = z.infer<typeof questionRemoveParamsSchema>;
export type UiopOperation = z.infer<typeof uiopOperationSchema>;
export type UiopOperationType = UiopOperation["op"];
export type UiopSource = z.infer<typeof uiopSourceSchema>;
export type UiopEnvelope = z.infer<typeof uiopEnvelopeSchema>;

export type UiopErrorCode =
  | "INVALID_ENVELOPE"
  | "UNSUPPORTED_VERSION"
  | "SCHEMA_VALIDATION_FAILED"
  | "DUPLICATE_MESSAGE"
  | "STALE_REVISION"
  | "UNREGISTERED_COMPONENT"
  | "INVALID_COMPONENT_CONFIG"
  | "DUPLICATE_ENTITY_ID"
  | "ENTITY_NOT_FOUND"
  | "DEPENDENCY_CONFLICT"
  | "INVALID_OPTION";

export interface UiopValidationError {
  code: UiopErrorCode;
  message: string;
  operationIndex?: number;
  op?: string;
}

export interface UiopExecutionReport {
  ok: boolean;
  status: "applied" | "rejected";
  messageId: string;
  workspaceId: string;
  baseRevision: number;
  newRevision: number;
  source?: UiopSource;
  appliedCount: number;
  summary: string[];
  focusNodeId?: string;
  navigatedTo?: "/workspace" | "/plan" | "/audit";
  errors: UiopValidationError[];
  timestamp: string;
}
