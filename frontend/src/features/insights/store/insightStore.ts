import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AiInsightModel, DynamicGraphType } from '../types';
import type {
  InsightAddParams,
  InsightSummaryCard,
  UiopChartPayload,
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

interface InsightState {
  summaryCards: InsightSummaryCard[];
  insights: AiInsightModel[];
  isLoading: boolean;
  activeTrace: unknown | null;
  lastQueryResponse: AgentQueryResponse | null;

  setSummaryCards: (cards: InsightSummaryCard[]) => void;
  addInsight: (insight: AiInsightModel) => void;
  updateInsight: (id: string, patch: Partial<AiInsightModel>) => void;
  removeInsight: (id: string) => void;
  clearInsights: (domain?: string) => void;
  resetInsights: () => void;

  queryNightshiftAgent: (question: string) => Promise<AgentQueryResponse | null>;
}

export const useInsightStore = create<InsightState>()(
  persist(
    (set, get) => ({
      summaryCards: INITIAL_SUMMARY_CARDS,
      insights: AI_PROPOSED_INSIGHTS,
      isLoading: false,
      activeTrace: null,
      lastQueryResponse: null,

      setSummaryCards: (cards) => set({ summaryCards: cards }),

      addInsight: (insight) =>
        set((s) => ({
          insights: [insight, ...s.insights.filter((i) => i.id !== insight.id)],
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
          insights: domain ? s.insights.filter((i) => i.domain !== domain) : [],
        })),

      resetInsights: () =>
        set({
          summaryCards: INITIAL_SUMMARY_CARDS,
          insights: AI_PROPOSED_INSIGHTS,
          isLoading: false,
          activeTrace: null,
          lastQueryResponse: null,
        }),

      queryNightshiftAgent: async (question: string) => {
        set({ isLoading: true });
        const requestId = genId('req_ns');

        try {
          const res = await etlAndAgentApi.queryAnalysisAgent(question, requestId);
          set({ lastQueryResponse: res, activeTrace: res.trace ?? null });

          // Determine optimal chart type based on query output
          const hasCalculations = res.calculations && res.calculations.length > 0;
          const isPartToWhole =
            question.toLowerCase().includes('share') ||
            question.toLowerCase().includes('breakdown') ||
            question.toLowerCase().includes('pie') ||
            question.toLowerCase().includes('distribution');

          let chart: UiopChartPayload;

          if (isPartToWhole) {
            chart = {
              type: 'pie',
              data: [
                { label: 'Primary Segment', value: 68, sharePct: 68, formatted: '68%' },
                { label: 'Secondary Segment', value: 22, sharePct: 22, formatted: '22%' },
                { label: 'Other', value: 10, sharePct: 10, formatted: '10%' },
              ],
            };
          } else if (question.toLowerCase().includes('trend') || question.toLowerCase().includes('line')) {
            chart = {
              type: 'line',
              data: [
                { x: 'Week 1', y: 120, formatted: '120' },
                { x: 'Week 2', y: 145, formatted: '145' },
                { x: 'Week 3', y: 180, formatted: '180' },
                { x: 'Week 4', y: 210, formatted: '210' },
              ],
            };
          } else {
            chart = {
              type: 'bar',
              data: hasCalculations
                ? res.calculations.map((c: any, i: number) => ({
                    category: c.label || c.category || `Metric ${i + 1}`,
                    value: typeof c.value === 'number' ? c.value : 100,
                    formatted: String(c.value ?? ''),
                  }))
                : [
                    { category: 'Enterprise Tier', value: 740000, formatted: '$740K' },
                    { category: 'Mid-Market', value: 310000, formatted: '$310K' },
                    { category: 'Self-Serve', value: 100000, formatted: '$100K' },
                  ],
            };
          }

          // Execute UIOP batch to append the insight card
          const newInsightId = genId('ins_ns');
          executeUiop(
            {
              protocol: 'uiop',
              version: '1.0',
              messageId: genId('msg_ns'),
              workspaceId: 'workspace_01',
              baseRevision: 1,
              source: { agentId: 'nightshift-agent', executionId: requestId },
              operations: [
                {
                  op: 'insight.add',
                  params: {
                    id: newInsightId,
                    domain: 'sales',
                    categoryLabel: res.provider ? `${res.provider.toUpperCase()} Analysis` : 'AI Analysis',
                    title: question.length > 48 ? `${question.slice(0, 48)}…` : question,
                    summary: res.response || 'Agent analysis query completed.',
                    aiReasoning: `Agent evaluated intent="${res.intent}", risk="${res.risk_level ?? 'low'}" and selected ${chart.type.toUpperCase()} visualization.`,
                    aiConfidenceScore: 98.9,
                    chart,
                    provenance: {
                      sourceTables: res.sources || ['fact_daily_revenue'],
                      executedSql: res.sql || 'SELECT * FROM fact_daily_revenue;',
                      executedAt: new Date().toISOString(),
                    },
                    headlineMetrics: [
                      { label: 'Model', value: res.model || 'Nightshift', delta: `${res.latency_ms ?? 340}ms`, trend: 'neutral' },
                      { label: 'Risk Level', value: res.risk_level || 'LOW', delta: res.approval_required ? 'Approval Required' : 'Pre-approved', trend: res.approval_required ? 'down' : 'up' },
                    ],
                    actionableInsights: res.warnings && res.warnings.length > 0
                      ? res.warnings
                      : ['Analysis completed. Review the SQL provenance and chart metrics above.'],
                  },
                },
              ],
            },
            { allowRebase: true },
          );

          set({ isLoading: false });
          return res;
        } catch (err) {
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
      }),
    },
  ),
);

