export type DynamicGraphType =
  | "waterfall-decomposition"
  | "cohort-decay-curve"
  | "state-flow-funnel"
  | "anomaly-ribbon"
  | "pie"
  | "bar"
  | "line"
  | "kpi-table";

export interface GraphTypeOption {
  type: DynamicGraphType;
  label: string;
  isAiRecommended: boolean;
  reasoning: string;
}

export interface WaterfallBarItem {
  id: string;
  label: string;
  amount: number;
  formatted: string;
  type: "base" | "deduction" | "addition" | "subtotal" | "total";
  note?: string;
  driftPct?: string;
}

export interface CohortPoint {
  period: string; // e.g. "Day 0", "Day 30", "Day 60", "Day 90", "Day 120"
  cohortA: number; // e.g. Enterprise Cohort %
  cohortB: number; // e.g. Self-Serve Cohort %
  cohortC?: number; // e.g. Marketplace Cohort %
}

export interface StateFlowStage {
  id: string;
  name: string;
  count: number;
  ratePct: number;
  avgDwellMinutes: number;
  anomalyCount: number;
  status: "normal" | "bottleneck" | "optimal";
  notes: string;
}

export interface AnomalyPoint {
  date: string;
  actual: number;
  expectedUpper: number;
  expectedLower: number;
  isAnomaly: boolean;
  anomalyDelta?: string;
  anomalyCause?: string;
}

export interface InsightProvenance {
  sourceTables: string[];
  executedSql: string;
  rowCount?: number;
  executedAt?: string;
}

export interface AiInsightModel {
  id: string;
  kpiId: string;
  kpiName: string;
  domain: "sales" | "customers" | "operations" | "anomalies";
  categoryLabel: string;
  title: string;
  summary: string;
  aiReasoning: string;
  aiConfidenceScore: number; // e.g. 98.6
  selectedGraphType: DynamicGraphType;
  availableGraphOptions: GraphTypeOption[];
  headlineMetrics: {
    label: string;
    value: string;
    delta: string;
    trend: "up" | "down" | "neutral";
  }[];
  waterfallData?: WaterfallBarItem[];
  cohortData?: CohortPoint[];
  stateFlowData?: StateFlowStage[];
  anomalyData?: AnomalyPoint[];
  pieData?: Array<{
    label: string;
    value: number;
    sharePct: number;
    formatted?: string;
  }>;
  barData?: Array<{
    category: string;
    value: number;
    formatted?: string;
    secondaryValue?: number;
    target?: number;
  }>;
  lineData?: Array<{
    x: string;
    y: number;
    series?: string;
    formatted?: string;
  }>;
  tableData?: { columns: string[]; rows: Record<string, string | number>[] };
  provenance?: InsightProvenance;
  actionableInsights: string[];
}
