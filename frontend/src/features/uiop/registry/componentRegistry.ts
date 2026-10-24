import { z } from 'zod';

/**
 * Approved Component Registry for UIOP `panel.add` & `panel.update` operations.
 * Reference: docs/FRONTEND_SPECS (1).md (Sections 5.5 & 7)
 *
 * UIOP must never permit AI-generated JavaScript execution, unrestricted HTML
 * injection, or dynamic loading of arbitrary components. Only components in
 * this registry can be instantiated via `panel.add`.
 */

export const APPROVED_PANEL_COMPONENTS = {
  DataQualityPanel: z.object({
    datasetId: z.string().min(1),
    showMissingValues: z.boolean().default(true),
    nullThresholdPct: z.number().min(0).max(100).default(5),
  }),
  ValidationSummaryPanel: z.object({
    strictMode: z.boolean().default(false),
    focusCategory: z
      .enum(['keys', 'relationships', 'standards', 'naming'])
      .optional(),
  }),
  LineageInspectorPanel: z.object({
    rootNodeId: z.string().min(1),
    depth: z.number().int().min(1).max(10).default(3),
  }),
  KpiReconciliationPanel: z.object({
    kpiIds: z.array(z.string()).default([]),
    presentationFormat: z
      .enum(['reconciliation-table', 'cohort-drift-matrix', 'checksum-parity-log'])
      .default('reconciliation-table'),
  }),
  PlanStageSummaryPanel: z.object({
    stageId: z.string().optional(),
    showSqlPreview: z.boolean().default(true),
  }),
  DynamicInsightsPanel: z.object({
    focusDomain: z
      .enum(['sales', 'customers', 'operations', 'anomalies'])
      .optional(),
    initialGraphType: z
      .enum([
        'waterfall-decomposition',
        'cohort-decay-curve',
        'state-flow-funnel',
        'anomaly-ribbon',
      ])
      .optional(),
  }),
} as const;

export type ApprovedComponentName = keyof typeof APPROVED_PANEL_COMPONENTS;

export function isApprovedComponent(name: string): name is ApprovedComponentName {
  return Object.prototype.hasOwnProperty.call(APPROVED_PANEL_COMPONENTS, name);
}

export function validateComponentConfig(
  component: string,
  config: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  if (!isApprovedComponent(component)) {
    return {
      ok: false,
      error: `Component "${component}" is not registered in the approved UIOP component registry.`,
    };
  }
  const schema = APPROVED_PANEL_COMPONENTS[component];
  const parsed = schema.safeParse(config);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `Invalid config for "${component}" at ${issue?.path.join('.') || '(root)'}: ${issue?.message ?? 'invalid value'}`,
    };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

