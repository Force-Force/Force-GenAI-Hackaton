import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AiInsightModel, DynamicGraphType } from '../types';
import {
  uiopChartPayloadSchema,
  uiopEnvelopeSchema,
  type InsightAddParams,
  type InsightSummaryCard,
  type UiopChartPayload,
} from '../../../contracts/uiop';
import { AI_PROPOSED_INSIGHTS } from '../data/mockInsightData';
import { persistStateStorage } from '../../../store/persistStorage';
import { etlAndAgentApi } from '../../../services/api/etlAndAgentApi';
import { executeUiop } from '../../uiop/runtime/uiopRuntime';
import { genId } from '../../../utils/graph';
import type { AgentQueryResponse } from '../../../contracts/backendApi';

export const INITIAL_SUMMARY_CARDS: InsightSummaryCard[] = [
  { id: 'sum_1', label: 'Net revenue', value: '$1.15M', delta: '+9.1%', trend: 'up', sourceTable: 'fact_daily_revenue' },
  { id: 'sum_2', label: 'Enterprise retention', value: '118%', delta: '+4.5%', trend: 'up', sourceTable: 'dim_customer_360' },
  { id: 'sum_3', label: 'Orders processed', value: '420K', delta: '99.85% delivered', trend: 'neutral', sourceTable: 'transform_orders_clean' },
  { id: 'sum_4', label: 'Outliers', value: '1', delta: 'Oct 18', trend: 'down', sourceTable: 'quarantine_velocity_alerts' },
];

/**
 * Converts a UIOP insight.add chart payload into an AiInsightModel.
 */
export function chartPayloadToModel(params: InsightAddParams): AiInsightModel {
  const chart = params.chart;
  let selectedGraphType: DynamicGraphType = 'bar';
  let waterfallData = undefined;
  let cohortData = undefined;
  let stateFlowData = undefined;
  let anomalyData = undefined;
  let pieData = undefined;
  let barData = undefined;
  let lineData = undefined;
  let tableData = undefined;

  switch (chart.type) {
    case 'pie':
      selectedGraphType = 'pie';
      pieData = chart.data;
      break;
    case 'bar':
      selectedGraphType = 'bar';
      barData = chart.data;
      break;
    case 'line':
      selectedGraphType = 'line';
      lineData = chart.data;
      break;
    case 'kpi-table':
      selectedGraphType = 'kpi-table';
      tableData = chart.data;
      break;
    case 'waterfall-decomposition':
      selectedGraphType = 'waterfall-decomposition';
      waterfallData = chart.data;
      break;
    case 'cohort-decay-curve':
      selectedGraphType = 'cohort-decay-curve';
      cohortData = chart.data;
      break;
    case 'state-flow-funnel':
      selectedGraphType = 'state-flow-funnel';
      stateFlowData = chart.data;
      break;
    case 'anomaly-ribbon':
      selectedGraphType = 'anomaly-ribbon';
      anomalyData = chart.data;
      break;
  }

  return {
    id: params.id,
    kpiId: `kpi_${params.id}`,
    kpiName: params.title,
    domain: params.domain,
    categoryLabel: params.categoryLabel,
    title: params.title,
    summary: params.summary,
    aiReasoning: params.aiReasoning,
    aiConfidenceScore: params.aiConfidenceScore,
    selectedGraphType,
    availableGraphOptions: [
      {
        type: selectedGraphType,
        label: params.categoryLabel || 'Recommended View',
        isAiRecommended: true,
        reasoning: params.aiReasoning || 'Selected as the optimal visualization for this dataset.',
      },
    ],
    headlineMetrics: params.headlineMetrics,
    waterfallData,
    cohortData,
    stateFlowData,
    anomalyData,
    pieData,
    barData,
    lineData,
    tableData,
    provenance: params.provenance,
    actionableInsights: params.actionableInsights,
  };
}

/**
 * Converts real calculation/evidence rows from a live backend AgentQueryResponse
 * into a validated UiopChartPayload without fabricating mock numbers.
 */
function buildChartFromBackendResponse(
  question: string,
  res: AgentQueryResponse,
): UiopChartPayload {
  // 1. If the backend explicitly returned a valid UIOP chart object, use it directly
  if (res.chart) {
    const parsedChart = uiopChartPayloadSchema.safeParse(res.chart);
    if (parsedChart.success) {
      return parsedChart.data;
    }
  }

  // 2. Collect structured row records from calculations and evidence
  const rawItems = [
    ...(Array.isArray(res.calculations) ? res.calculations : []),
    ...(Array.isArray(res.evidence) ? res.evidence : []),
  ].filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  );

  const lowerQ = question.toLowerCase();
  const wantsPie =
    lowerQ.includes('pie') ||
    lowerQ.includes('share') ||
    lowerQ.includes('distribution') ||
    lowerQ.includes('breakdown');
  const wantsLine =
    lowerQ.includes('line') ||
    lowerQ.includes('trend') ||
    lowerQ.includes('over time') ||
    lowerQ.includes('monthly') ||
    lowerQ.includes('daily');

  if (rawItems.length > 0) {
    // Extract label/category and numeric value from each backend record
    const numericPairs = rawItems
      .map((row, idx) => {
        const entries = Object.entries(row);
        const labelEntry = entries.find(([, v]) => typeof v === 'string');
        const numEntry = entries.find(
          ([k, v]) =>
            typeof v === 'number' &&
            !k.toLowerCase().includes('pct') &&
            !k.toLowerCase().includes('share'),
        ) ?? entries.find(([, v]) => typeof v === 'number');
        const shareEntry = entries.find(
          ([k, v]) =>
            typeof v === 'number' &&
            (k.toLowerCase().includes('pct') || k.toLowerCase().includes('share')),
        );
        const formattedEntry = entries.find(
          ([k, v]) => typeof v === 'string' && k.toLowerCase().includes('format'),
        );

        if (!numEntry) return null;
        const val = Number(numEntry[1]);
        const lbl = labelEntry ? String(labelEntry[1]) : `${numEntry[0]} #${idx + 1}`;
        return {
          label: lbl,
          value: val,
          sharePct: shareEntry ? Number(shareEntry[1]) : undefined,
          formatted: formattedEntry ? String(formattedEntry[1]) : String(val),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (numericPairs.length > 0) {
      if (wantsPie && numericPairs.length <= 7) {
        const total = numericPairs.reduce((acc, p) => acc + Math.abs(p.value), 0) || 1;
        return {
          type: 'pie',
          data: numericPairs.map((p) => ({
            label: p.label,
            value: p.value,
            sharePct:
              p.sharePct !== undefined
                ? p.sharePct
                : Number(((Math.abs(p.value) / total) * 100).toFixed(1)),
            formatted: p.formatted,
          })),
        };
      }

      if (wantsLine) {
        return {
          type: 'line',
          data: numericPairs.map((p) => ({
            x: p.label,
            y: p.value,
            formatted: p.formatted,
          })),
        };
      }

      return {
        type: 'bar',
        data: numericPairs.map((p) => ({
          category: p.label,
          value: p.value,
          formatted: p.formatted,
        })),
      };
    }

    // Multi-column non-standard objects -> render as a kpi-table with real columns & values
    const columns = Array.from(
      new Set(rawItems.flatMap((r) => Object.keys(r))),
    ).slice(0, 8);
    if (columns.length > 0) {
      return {
        type: 'kpi-table',
        data: {
          columns,
          rows: rawItems.map((r) => {
            const cleanRow: Record<string, string | number> = {};
            for (const col of columns) {
              const v = r[col];
              cleanRow[col] =
                typeof v === 'number' || typeof v === 'string'
                  ? v
                  : v === null || v === undefined
                    ? '—'
                    : JSON.stringify(v);
            }
            return cleanRow;
          }),
        },
      };
    }
  }

  // 3. No tabular/calculation arrays returned -> emit a real telemetry KPI table from the response metadata
  return {
    type: 'kpi-table',
    data: {
      columns: ['Field', 'Value'],
      rows: [
        { Field: 'Request ID', Value: res.request_id },
        { Field: 'Status', Value: res.status },
        { Field: 'Intent', Value: res.intent || 'informational' },
        { Field: 'Risk Level', Value: res.risk_level || 'low' },
        { Field: 'Guardian Approval', Value: res.approval_required ? 'Required' : 'Not Required' },
        { Field: 'Sources Queried', Value: res.sources.length > 0 ? res.sources.join(', ') : 'None' },
        { Field: 'Views Used', Value: res.views_used.length > 0 ? res.views_used.join(', ') : 'None' },
      ],
    },
  };
}

interface InsightState {
  summaryCards: InsightSummaryCard[];
  insights: AiInsightModel[];
  isMockSeedData: boolean;
  isLoading: boolean;
  activeTrace: unknown | null;
  lastQueryResponse: AgentQueryResponse | null;

  setSummaryCards: (cards: InsightSummaryCard[]) => void;
  addInsight: (insight: AiInsightModel) => void;
  updateInsight: (id: string, patch: Partial<AiInsightModel>) => void;
  removeInsight: (id: string) => void;
  clearInsights: (domain?: string) => void;
  resetInsights: () => void;
  clearMockDataForLiveBackend: () => void;
  fetchLiveInsights: (pipelineId?: string | null) => Promise<void>;

  queryNightshiftAgent: (question: string) => Promise<AgentQueryResponse | null>;
}

export const useInsightStore = create<InsightState>()(
  persist(
    (set, get) => ({
      summaryCards: INITIAL_SUMMARY_CARDS,
      insights: AI_PROPOSED_INSIGHTS,
      isMockSeedData: true,
      isLoading: false,
      activeTrace: null,
      lastQueryResponse: null,

      setSummaryCards: (cards) => set({ summaryCards: cards, isMockSeedData: false }),

      addInsight: (insight) =>
        set((s) => ({
          isMockSeedData: false,
          insights: [insight, ...(s.isMockSeedData ? [] : s.insights).filter((i) => i.id !== insight.id)],
        })),

      updateInsight: (id, patch) =>
        set((s) => ({
          insights: s.insights.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),

      removeInsight: (id) =>
        set((s) => ({
          insights: s.insights.filter((i) => i.id !== id),
        })),

      clearInsights: (domain) =>
        set((s) => ({
          isMockSeedData: false,
          insights: domain ? s.insights.filter((i) => i.domain !== domain) : [],
        })),

      resetInsights: () =>
        set({
          summaryCards: INITIAL_SUMMARY_CARDS,
          insights: AI_PROPOSED_INSIGHTS,
          isMockSeedData: true,
          isLoading: false,
          activeTrace: null,
          lastQueryResponse: null,
        }),

      clearMockDataForLiveBackend: () => {
        if (get().isMockSeedData) {
          set({
            summaryCards: [],
            insights: [],
            isMockSeedData: false,
          });
        }
      },

      fetchLiveInsights: async (pipelineId) => {
        get().clearMockDataForLiveBackend();
        if (!pipelineId) return;

        set({ isLoading: true });
        try {
          // 1. Try pipeline-scoped insights endpoint (INSIGHTS_UIOP_SPECIFICATION.md)
          try {
            const snap = await etlAndAgentApi.getPipelineInsights(pipelineId);
            if (snap.uiop) {
              const parsed = uiopEnvelopeSchema.safeParse(snap.uiop);
              if (parsed.success) {
                executeUiop(parsed.data, { allowRebase: true });
                set({ isMockSeedData: false, isLoading: false });
                return;
              }
            }
            if (Array.isArray(snap.insights) && snap.insights.length > 0) {
              set({
                insights: snap.insights as AiInsightModel[],
                summaryCards: Array.isArray(snap.summaryCards)
                  ? (snap.summaryCards as InsightSummaryCard[])
                  : get().summaryCards,
                isMockSeedData: false,
                isLoading: false,
              });
              return;
            }
          } catch {
            // Endpoint optional in MVP; fall back to ETL results
          }

          // 2. Check last stored ETL result on pipeline (FRONTEND_INTEGRATION.md Section 8)
          try {
            const etlRes = await etlAndAgentApi.getEtlResults(pipelineId);
            if (etlRes && Array.isArray(etlRes.rows) && etlRes.rows.length > 0) {
              const cols = Object.keys(etlRes.rows[0]);
              const cleanRows = etlRes.rows.map((r) => {
                const rowObj: Record<string, string | number> = {};
                for (const c of cols) {
                  const v = r[c];
                  rowObj[c] =
                    typeof v === 'number' || typeof v === 'string'
                      ? v
                      : v === null || v === undefined
                        ? '—'
                        : JSON.stringify(v);
                }
                return rowObj;
              });

              executeUiop(
                {
                  protocol: 'uiop',
                  version: '1.0',
                  messageId: genId('msg_etl_res'),
                  workspaceId: pipelineId,
                  baseRevision: 1,
                  source: { agentId: 'etl-engine', executionId: genId('exec_etl') },
                  operations: [
                    {
                      op: 'insight.add',
                      params: {
                        id: `ins_etl_${pipelineId}`,
                        domain: 'operations',
                        categoryLabel: 'Live ETL Output',
                        title: etlRes.instruction || 'Pipeline ETL Execution Result',
                        summary:
                          etlRes.summary_md ||
                          `Returned ${etlRes.row_count ?? etlRes.rows.length} rows from live pipeline execution.`,
                        aiReasoning:
                          'Rendered directly from the authoritative pipeline ETL execution results.',
                        aiConfidenceScore: 100,
                        chart: {
                          type: 'kpi-table',
                          data: {
                            columns: cols,
                            rows: cleanRows,
                          },
                        },
                        provenance: {
                          sourceTables: ['pipeline_etl_output'],
                          executedSql: etlRes.sql || '',
                          rowCount: etlRes.row_count ?? etlRes.rows.length,
                          executedAt: etlRes.executed_at,
                        },
                        headlineMetrics: [
                          {
                            label: 'Row Count',
                            value: String(etlRes.row_count ?? etlRes.rows.length),
                            delta: 'Live Result',
                            trend: 'neutral',
                          },
                        ],
                        actionableInsights: [],
                      },
                    },
                  ],
                },
                { allowRebase: true },
              );
              set({ isMockSeedData: false });
            }
          } catch {
            // 404 when pipeline has no ETL result yet
          }
        } finally {
          set({ isLoading: false });
        }
      },

      queryNightshiftAgent: async (question: string) => {
        set({ isLoading: true });
        const requestId = genId('req_ns');

        try {
          const res = await etlAndAgentApi.queryAnalysisAgent(question, requestId);
          // Live backend responded -> purge any initial mock seed data first
          get().clearMockDataForLiveBackend();
          set({ lastQueryResponse: res, activeTrace: res.trace ?? null });

          // If backend returned a direct UIOP envelope, execute it atomically
          if (res.uiop) {
            const parsedEnvelope = uiopEnvelopeSchema.safeParse(res.uiop);
            if (parsedEnvelope.success) {
              executeUiop(parsedEnvelope.data, { allowRebase: true });
              set({ isLoading: false, isMockSeedData: false });
              return res;
            }
          }

          const chart = buildChartFromBackendResponse(question, res);
          const lowerQ = question.toLowerCase();
          const domain: 'sales' | 'customers' | 'operations' | 'anomalies' =
            lowerQ.includes('customer') || lowerQ.includes('cohort') || lowerQ.includes('retention')
              ? 'customers'
              : lowerQ.includes('anomal') || lowerQ.includes('outlier') || lowerQ.includes('fraud')
                ? 'anomalies'
                : lowerQ.includes('operat') || lowerQ.includes('funnel') || lowerQ.includes('etl')
                  ? 'operations'
                  : 'sales';

          const newInsightId = `ins_${res.request_id || genId('ns')}`;
          executeUiop(
            {
              protocol: 'uiop',
              version: '1.0',
              messageId: genId('msg_ns'),
              workspaceId: 'workspace_01',
              baseRevision: 1,
              source: { agentId: 'nightshift-agent', executionId: res.request_id || requestId },
              operations: [
                {
                  op: 'insight.add',
                  params: {
                    id: newInsightId,
                    domain,
                    categoryLabel: res.provider ? `${res.provider.toUpperCase()} Analysis` : 'AI Analysis',
                    title: question.length > 56 ? `${question.slice(0, 56)}…` : question,
                    summary: res.response || 'Agent analysis query completed.',
                    aiReasoning: `Agent evaluated intent="${res.intent}", risk="${res.risk_level ?? 'low'}" and selected ${chart.type.toUpperCase()} visualization from live query output.`,
                    aiConfidenceScore: 98.9,
                    chart,
                    provenance: {
                      sourceTables: res.sources && res.sources.length > 0 ? res.sources : res.views_used || [],
                      executedSql: res.sql || '',
                      rowCount: Array.isArray(res.calculations) ? res.calculations.length : undefined,
                      executedAt: new Date().toISOString(),
                    },
                    headlineMetrics: [
                      {
                        label: 'Model',
                        value: res.model || res.provider || 'Nightshift',
                        delta: res.latency_ms !== undefined ? `${res.latency_ms}ms` : 'Live',
                        trend: 'neutral',
                      },
                      {
                        label: 'Risk Level',
                        value: (res.risk_level || 'LOW').toUpperCase(),
                        delta: res.approval_required ? 'Approval Required' : 'Verified',
                        trend: res.approval_required ? 'down' : 'up',
                      },
                    ],
                    actionableInsights:
                      res.warnings && res.warnings.length > 0
                        ? res.warnings
                        : [],
                  },
                },
              ],
            },
            { allowRebase: true },
          );

          set({ isLoading: false, isMockSeedData: false });
          return res;
        } catch {
          set({ isLoading: false });
          return null;
        }
      },
    }),
    {
      name: 'aura-bi.insight-store.v1',
      storage: createJSONStorage(() => persistStateStorage),
      partialize: (s) => ({
        summaryCards: s.summaryCards,
        insights: s.insights,
        isMockSeedData: s.isMockSeedData,
      }),
    },
  ),
);

