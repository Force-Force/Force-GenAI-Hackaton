import { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronsUpDown,
  RotateCcw,
  Workflow,
  Palette,
  ArrowUpRight,
  Loader2,
  FastForward,
  X,
  Eye,
  Download,
  Copy,
  ArrowRight,
  SkipForward,
  Sliders,
  PanelRightClose,
  ShieldCheck,
  Scale,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { navigateTo } from '../utils/navigation';
import { cn } from '../utils/cn';
import { useWorkspaceStore } from '../features/workspace/store/workspaceStore';
import { useChatStore } from '../features/chat/store/chatStore';
import { WorkspacePromptBar } from '../features/workspace/components/WorkspacePromptBar';

interface PlanStage {
  id: string;
  number: string;
  title: string;
  category: string;
  description: string;
  tables: string[];
  technologies: string[];
}

interface ClarifyingQuestion {
  id: string;
  question: string;
  context: string;
  options: {
    id: string;
    label: string;
    description: string;
    isRecommended?: boolean;
  }[];
}

interface ReasoningPhase {
  id: string;
  stepIndex: number;
  title: string;
  scripts: string[];
  reasoning: string;
}

export interface KpiDefinition {
  id: string;
  name: string;
  category: 'Finance' | 'Customer' | 'Integrity' | 'Custom';
  formula: string;
  sourceSystem: string;
  targetMart: string;
  sourceLedgerValue: string;
  martOutputValue: string;
  variance: string;
  tolerance: string;
  description: string;
}

const DEFAULT_KPIS: KpiDefinition[] = [
  {
    id: 'net-recognized-revenue',
    name: 'Net Recognized Revenue',
    category: 'Finance',
    formula: 'SUM(gross_amount - tax_amount - refund_amount)',
    sourceSystem: 'Stripe + Postgres Ledger',
    targetMart: 'fact_daily_revenue',
    sourceLedgerValue: '$4,829,140.50',
    martOutputValue: '$4,829,140.50',
    variance: '$0.00 (0.00%)',
    tolerance: '±0.00%',
    description: 'Reconciles net settled revenue across Stripe webhooks and operational orders against the central revenue fact table.',
  },
  {
    id: 'gross-merchandise-volume',
    name: 'Gross Merchandise Volume (GMV)',
    category: 'Finance',
    formula: 'SUM(gross_volume)',
    sourceSystem: 'stg_raw_transactions',
    targetMart: 'v_bi_executive_sales',
    sourceLedgerValue: '$5,412,800.00',
    martOutputValue: '$5,412,800.00',
    variance: '$0.00 (0.00%)',
    tolerance: '±0.00%',
    description: 'Verifies zero dollar leakage between raw bronze ingestion and the federated Zetaris executive BI view.',
  },
  {
    id: 'idempotent-charge-parity',
    name: 'Idempotent Charge Parity',
    category: 'Integrity',
    formula: 'COUNT(DISTINCT charge_id) - COUNT(charge_id)',
    sourceSystem: 'Stripe Webhook Stream',
    targetMart: 'transform_orders_clean',
    sourceLedgerValue: '142,890 txns',
    martOutputValue: '142,890 txns',
    variance: '0 dupes (0.00%)',
    tolerance: 'Strict 0',
    description: 'Ensures retried payment webhooks produce zero duplicate order rows in the cleansed transformation layer.',
  },
  {
    id: 'active-customer-360',
    name: 'Active Customer 360 Cohort',
    category: 'Customer',
    formula: 'COUNT(DISTINCT customer_id) WHERE is_current = TRUE',
    sourceSystem: 'stg_customer_events',
    targetMart: 'dim_customer_360',
    sourceLedgerValue: '28,450 entities',
    martOutputValue: '28,450 entities',
    variance: '0 orphans',
    tolerance: '0 orphans',
    description: 'Audits SCD Type-2 timeline windows to guarantee every active customer has exactly one current dimension record.',
  },
  {
    id: 'net-aov',
    name: 'Net Average Order Value (AOV)',
    category: 'Finance',
    formula: 'SUM(net_volume) / SUM(transaction_count)',
    sourceSystem: 'Operational Ledger',
    targetMart: 'fact_daily_revenue',
    sourceLedgerValue: '$33.80',
    martOutputValue: '$33.80',
    variance: '$0.00 (0.00%)',
    tolerance: '±0.01%',
    description: 'Cross-checks unit economics ratio stability before and after currency normalization.',
  },
];

const REASONING_PHASES: ReasoningPhase[] = [
  {
    id: 'phase-1',
    stepIndex: 1,
    title: 'Phase 1: Source Discovery & Schema Profiling',
    scripts: [
      'executing source_catalog_inspector.py...',
      'executing postgres_foreign_keys_profiler.sql...',
    ],
    reasoning:
      'Identified transactional PostgreSQL cluster and Stripe payment event payloads. Detected candidate primary keys on customer_id and idempotency tokens on stripe_charge_id. Selected zero-copy federation via Zetaris gateway to avoid physical replication.',
  },
  {
    id: 'phase-2',
    stepIndex: 2,
    title: 'Phase 2: Dimensional Modeling & Trade-off Analysis',
    scripts: ['executing star_schema_generator.sql...'],
    reasoning:
      'Evaluated Inmon 3NF against Kimball Star Schema. Selected a central fact table (fact_daily_revenue) joined to conformed dimensions (dim_customer_360, dim_product_sku) with SCD Type-2 history tracking.',
  },
  {
    id: 'phase-3',
    stepIndex: 3,
    title: 'Phase 3: Pre-flight Verification & DDL Compilation',
    scripts: [
      'executing nullability_constraints_verifier.py...',
      'executing ddl_syntax_compiler.sql...',
    ],
    reasoning:
      'Verified foreign key referential integrity between dimension surrogate keys and fact measures. Compiled ANSI SQL-92 DDL with partitioned date keys.',
  },
  {
    id: 'phase-4',
    stepIndex: 4,
    title: 'Phase 4: KPI Verification & Reconciliation Setup',
    scripts: [
      'executing configure_kpi_reconciliation.py...',
      'executing compile_ledger_assertions.sql...',
    ],
    reasoning:
      'Configured automated verification checks for your selected KPIs and established a financial reconciliation table comparing source ledgers against target marts.',
  },
];

const DEFAULT_STAGES: PlanStage[] = [
  {
    id: 'stage-1',
    number: '01',
    title: 'Raw Source Ingestion & Bronze Staging',
    category: 'Ingestion',
    description:
      'Virtualize and extract raw transaction streams from operational databases into an immutable staging zone.',
    tables: ['stg_raw_transactions', 'stg_customer_events', 'stg_inventory_levels'],
    technologies: ['PostgreSQL', 'Stripe API', 'Zetaris Connector'],
  },
  {
    id: 'stage-2',
    number: '02',
    title: 'Data Cleansing, Deduplication & SCD-2',
    category: 'Transformation',
    description:
      'Resolve surrogate foreign keys, deduplicate idempotency tokens, and maintain SCD Type-2 historical timeline records.',
    tables: ['transform_orders_clean', 'transform_scd2_customers', 'transform_currency_norm'],
    technologies: ['SQL dbt', 'PySpark', 'DuckDB Engine'],
  },
  {
    id: 'stage-3',
    number: '03',
    title: 'Curated Dimensional Star Schema',
    category: 'Data Mart',
    description:
      'Assemble Kimball dimensional model with high-velocity fact measures surrounded by conformed dimensions.',
    tables: ['fact_daily_revenue', 'dim_customer_360', 'dim_product_sku', 'dim_calendar'],
    technologies: ['Snowflake Lakehouse', 'Star Schema DDL'],
  },
  {
    id: 'stage-4',
    number: '04',
    title: 'Unified Zetaris SQL Virtualization Endpoint',
    category: 'Virtualization',
    description:
      'Publish federated SQL views with zero-copy caching, role-based column masking, and sub-second BI aggregations.',
    tables: ['v_bi_executive_sales', 'v_customer_retention_cohorts'],
    technologies: ['Zetaris Gateway', 'ANSI SQL-92'],
  },
  {
    id: 'stage-5',
    number: '05',
    title: 'Independent KPI Verification & Reconciliation',
    category: 'Verification',
    description:
      'Automatically verifies your selected KPIs against raw source data to ensure numbers reconcile before pipeline deployment.',
    tables: ['audit_kpi_reconciliation_ledger', 'audit_variance_assertions'],
    technologies: ['Automated Verifier', 'Zero-Variance Assertions'],
  },
];

const CLARIFYING_QUESTIONS: ClarifyingQuestion[] = [
  {
    id: 'scd-strategy',
    question: 'How should historical customer profile mutations be preserved?',
    context: 'Customer addresses and tiers change over time.',
    options: [
      {
        id: 'scd-2',
        label: 'SCD Type 2 (valid_from / valid_to)',
        description:
          'Maintains full historical records for point-in-time auditability and cohort analysis.',
        isRecommended: true,
      },
      {
        id: 'scd-1',
        label: 'SCD Type 1 (Overwrite in place)',
        description: 'Overwrites existing fields with the latest values. Lowest storage footprint, no history.',
      },
      {
        id: 'append-only',
        label: 'Immutable Event Log',
        description: 'Stores every change as an append-only delta event with monotonic sequence IDs.',
      },
    ],
  },
  {
    id: 'ingestion-frequency',
    question: 'What is the required data freshness SLA for revenue reporting?',
    context: 'Determines whether the pipeline runs on a micro-batch schedule or continuous stream.',
    options: [
      {
        id: 'microbatch-15m',
        label: '15-Minute Micro-batch',
        description: 'Balances low latency with warehouse compute efficiency.',
        isRecommended: true,
      },
      {
        id: 'hourly-batch',
        label: 'Hourly Batch Sync',
        description: 'Cost-optimized scheduled ingestion with predictable compute windows.',
      },
      {
        id: 'streaming-realtime',
        label: 'Real-Time CDC (< 30s)',
        description: 'Continuous Change Data Capture with always-on streaming workers.',
      },
    ],
  },
  {
    id: 'data-quality-strategy',
    question: 'How should schema drift and malformed records be handled?',
    context: 'Defines error boundaries when external APIs introduce unexpected nulls or types.',
    options: [
      {
        id: 'quarantine-dlq',
        label: 'Quarantine to Dead-Letter Queue',
        description: 'Routes failed rows to a quarantine table without halting the pipeline.',
        isRecommended: true,
      },
      {
        id: 'strict-fail',
        label: 'Strict Fail-Fast',
        description: 'Immediately halts execution and alerts engineers on any constraint violation.',
      },
      {
        id: 'impute-defaults',
        label: 'Auto-Coalesce Defaults',
        description: 'Replaces missing values with fallback constants and logs an audit warning.',
      },
    ],
  },
  {
    id: 'audit-presentation-format',
    question: 'How would you like your KPI verification results presented?',
    context:
      'Choose the presentation format that best fits your workflow and team.',
    options: [
      {
        id: 'reconciliation-table',
        label: 'Financial Reconciliation Table',
        description:
          'Side-by-side ledger vs. mart balance sheet with exact variance and match checks.',
        isRecommended: true,
      },
      {
        id: 'cohort-drift-matrix',
        label: 'Cohort & Distribution Drift Matrix',
        description:
          'Tracks customer cohort counts and historical SCD-2 timelines across dimensions.',
      },
      {
        id: 'checksum-parity-log',
        label: 'Checksum & Row Parity Log',
        description:
          'Row counts and parity verification across each pipeline stage.',
      },
    ],
  },
];

const COMPILED_SQL_PREVIEW = `-- AuraBI Auto-Compiled Warehouse DDL
-- Dialect: ANSI SQL-92 / Zetaris Virtualization Gateway
-- Generated at: ${new Date().toISOString()}

-- Stage 01: Bronze Staging Table
CREATE TABLE stg_raw_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    event_timestamp TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stage 02: Cleaned & Normalized Orders
CREATE TABLE transform_orders_clean (
    order_id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    gross_amount DECIMAL(14,2) NOT NULL,
    tax_amount DECIMAL(14,2) DEFAULT 0.00,
    net_amount DECIMAL(14,2) NOT NULL,
    is_valid_transaction BOOLEAN DEFAULT TRUE
);

-- Stage 02 & 03: Conformed SCD Type-2 Customer Dimension
CREATE TABLE dim_customer_360 (
    customer_key BIGINT PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    customer_name VARCHAR(255),
    tier VARCHAR(50),
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP,
    is_current BOOLEAN DEFAULT TRUE
);

-- Stage 03: Central Fact Table
CREATE TABLE fact_daily_revenue (
    revenue_key BIGINT PRIMARY KEY,
    date_key INT NOT NULL,
    customer_key BIGINT REFERENCES dim_customer_360(customer_key),
    gross_volume DECIMAL(18,2) NOT NULL,
    net_volume DECIMAL(18,2) NOT NULL,
    transaction_count INT NOT NULL
);

-- Stage 04: Zetaris SQL Virtualization Endpoint
CREATE OR REPLACE VIEW v_bi_executive_sales AS
SELECT 
    d.date_key,
    c.customer_name,
    c.tier,
    f.gross_volume,
    f.net_volume,
    f.transaction_count
FROM fact_daily_revenue f
JOIN dim_customer_360 c ON f.customer_key = c.customer_key
WHERE c.is_current = TRUE;

-- Stage 05: Independent Audit Agent Reconciliation Assertions (Author-Isolated)
CREATE OR REPLACE VIEW audit_kpi_reconciliation_ledger AS
SELECT
    'Net Recognized Revenue' AS kpi_name,
    (SELECT SUM(amount) FROM stg_raw_transactions) AS source_ledger_total,
    (SELECT SUM(net_volume) FROM fact_daily_revenue) AS mart_output_total,
    (SELECT SUM(amount) FROM stg_raw_transactions) - (SELECT SUM(net_volume) FROM fact_daily_revenue) AS variance_delta;
`;

export function PlanProposalPage() {
  const [liveStep, setLiveStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});

  // 45% - 60% Docked side panel state
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [panelTab, setPanelTab] = useState<'overview' | 'audit' | 'ddl'>('overview');
  const [copiedFormat, setCopiedFormat] = useState<'sql' | 'json' | null>(null);

  // Stepped questions state & completion tracker
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [questionsFinished, setQuestionsFinished] = useState<boolean>(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({
    'scd-strategy': 'scd-2',
    'ingestion-frequency': 'microbatch-15m',
    'data-quality-strategy': 'quarantine-dlq',
    'audit-presentation-format': 'reconciliation-table',
  });

  // KPI Selection & Independent Audit Agent state
  const [kpis, setKpis] = useState<KpiDefinition[]>(DEFAULT_KPIS);
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([
    'net-recognized-revenue',
    'gross-merchandise-volume',
    'idempotent-charge-parity',
    'active-customer-360',
  ]);
  const [customPromptOverride, setCustomPromptOverride] = useState<string | null>(null);

  const [isApproving, setIsApproving] = useState(false);

  const setProjectName = useWorkspaceStore((s) => s.setProjectName);
  const chatMessages = useChatStore((s) => s.messages);
  const userPrompt =
    customPromptOverride ||
    [...chatMessages].reverse().find((m) => m.sender === 'user')?.text ||
    'Build an end-to-end data lakehouse pipeline connecting PostgreSQL transactions, Stripe payment events, and customer dimension analytics into a Star Schema with Zetaris virtualization.';

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Staged live simulation progression
  useEffect(() => {
    if (!isSimulating) return;

    if (liveStep === 0) {
      timerRef.current = setTimeout(() => setLiveStep(1), 650);
    } else if (liveStep === 1) {
      timerRef.current = setTimeout(() => setLiveStep(2), 1000);
    } else if (liveStep === 2) {
      timerRef.current = setTimeout(() => setLiveStep(3), 1000);
    } else if (liveStep === 3) {
      timerRef.current = setTimeout(() => setLiveStep(4), 1000);
    } else if (liveStep === 4) {
      timerRef.current = setTimeout(() => {
        setLiveStep(5);
        setIsSimulating(false);
      }, 850);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [liveStep, isSimulating]);

  // Live elapsed counter
  useEffect(() => {
    if (!isSimulating) return;
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [isSimulating]);

  // Smoothly scroll the chat body when new steps or questions appear
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [liveStep, activeQuestionIndex, questionsFinished]);

  const handleRestartAnimation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExpandedPhases({});
    setElapsed(0);
    setLiveStep(0);
    setIsSimulating(true);
    setActiveQuestionIndex(0);
    setQuestionsFinished(false);
    setIsPanelOpen(false);
  };

  const handleSkipAnimation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLiveStep(5);
    setIsSimulating(false);
  };

  // Phase collapse logic
  const isPhaseOpen = (phase: ReasoningPhase) =>
    expandedPhases[phase.id] ?? liveStep === phase.stepIndex;

  const togglePhase = (phase: ReasoningPhase) => {
    setExpandedPhases((prev) => ({ ...prev, [phase.id]: !isPhaseOpen(phase) }));
  };

  const visiblePhases = REASONING_PHASES.filter((p) => liveStep >= p.stepIndex);
  const allPhasesCollapsed =
    visiblePhases.length > 0 && visiblePhases.every((p) => !isPhaseOpen(p));

  const toggleAllPhases = () => {
    const next: Record<string, boolean> = {};
    visiblePhases.forEach((p) => {
      next[p.id] = allPhasesCollapsed;
    });
    setExpandedPhases(next);
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const toggleKpiSelection = (kpiId: string) => {
    setSelectedKpiIds((prev) => {
      if (prev.includes(kpiId)) {
        // Keep at least 1 KPI selected for audit compliance
        return prev.length > 1 ? prev.filter((id) => id !== kpiId) : prev;
      }
      return [...prev, kpiId];
    });
  };

  const selectedKpis = kpis.filter((k) => selectedKpiIds.includes(k.id));

  const handleNextQuestion = () => {
    if (activeQuestionIndex < CLARIFYING_QUESTIONS.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else {
      setQuestionsFinished(true);
    }
  };

  const handleSkipQuestion = () => {
    if (activeQuestionIndex < CLARIFYING_QUESTIONS.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else {
      setQuestionsFinished(true);
    }
  };

  const handleSkipAllQuestions = () => {
    setQuestionsFinished(true);
  };

  const handleApprovePlan = () => {
    setIsApproving(true);
    setProjectName('Retail Lakehouse Master Pipeline');
    setTimeout(() => {
      navigateTo('/workspace');
    }, 400);
  };

  const handleExportSql = () => {
    const blob = new Blob([COMPILED_SQL_PREVIEW], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurabi_pipeline_plan.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const planPayload = {
      name: 'Retail Lakehouse Master Pipeline',
      generatedAt: new Date().toISOString(),
      prompt: userPrompt,
      stages: DEFAULT_STAGES,
      decisions: selectedAnswers,
      auditAgent: {
        role: 'Independent Audit Agent',
        separationOfDuties: 'Author-isolated from Builder Agents; read-only verification context',
        presentationFormat: selectedAnswers['audit-presentation-format'],
        verifiedKpis: selectedKpis,
      },
      sql: COMPILED_SQL_PREVIEW,
    };
    const blob = new Blob([JSON.stringify(planPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurabi_pipeline_plan.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(COMPILED_SQL_PREVIEW);
    setCopiedFormat('sql');
    setTimeout(() => setCopiedFormat(null), 1600);
  };

  const handlePromptSubmit = (text: string) => {
    setCustomPromptOverride(text);
    // Synthesize a domain KPI if the user prompts for a new metric/KPI
    const cleaned = text.trim();
    const customId = `custom-kpi-${Date.now()}`;
    const newKpi: KpiDefinition = {
      id: customId,
      name: cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned,
      category: 'Custom',
      formula: 'SUM(verified_measure) OVER (PARTITION BY date_key)',
      sourceSystem: 'Raw Ingestion Ledger',
      targetMart: 'fact_daily_revenue',
      sourceLedgerValue: '$1,240,000.00',
      martOutputValue: '$1,240,000.00',
      variance: '$0.00 (0.00%)',
      tolerance: '±0.00%',
      description: `User-prompted KPI included in automated reconciliation checks: "${cleaned}"`,
    };
    setKpis((prev) => [...prev, newKpi]);
    setSelectedKpiIds((prev) => [...prev, customId]);
    setIsSimulating(true);
    setLiveStep(1);
    setElapsed(0);
    setQuestionsFinished(false);
  };

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const currentQuestion = CLARIFYING_QUESTIONS[activeQuestionIndex];
  const isLastQuestion = activeQuestionIndex === CLARIFYING_QUESTIONS.length - 1;
  const isFirstQuestion = activeQuestionIndex === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{ backgroundColor: '#FDFFFC' }}
      className="h-screen w-screen flex flex-col font-sans text-[#334139] selection:bg-[#064C1C]/15 antialiased overflow-hidden"
    >
      {/* Pinned Top Header with Porcelain Gradient (No Border) */}
      <header
        style={{
          background:
            'linear-gradient(to bottom, rgba(253, 255, 252, 1) 0%, rgba(253, 255, 252, 0.95) 60%, rgba(253, 255, 252, 0) 100%)',
        }}
        className="w-full px-6 pt-3.5 pb-6 flex items-center justify-between shrink-0 z-20 pointer-events-auto"
      >
        <div
          onClick={() => navigateTo('/')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
          aria-label="Return to Welcome Page"
        >
          <div
            style={{ backgroundColor: '#064C1C' }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FDFFFC] shadow-xs"
          >
            <Bot size={15} />
          </div>
          <span className="font-bold text-base tracking-tight text-[#334139]">
            AuraBI
          </span>
          <span
            style={{ backgroundColor: '#D66F14' }}
            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider ml-1"
          >
            Agent First
          </span>
        </div>

        <nav className="flex items-center gap-1.5">
          {isSimulating ? (
            <button
              type="button"
              onClick={handleSkipAnimation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#D66F14] hover:bg-[#D66F14]/10 transition-colors cursor-pointer"
              title="Skip live animation"
            >
              <FastForward size={13} />
              <span>Fast Forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRestartAnimation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
              title="Replay live simulation"
            >
              <RotateCcw size={13} />
              <span>Replay Live</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigateTo('/workspace')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
          >
            <Workflow size={13} />
            <span>Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('/components')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
          >
            <Palette size={13} />
            <span className="hidden sm:inline">Design Tokens</span>
          </button>
        </nav>
      </header>

      {/* Main Layout Area: Split between Chat (Left) and Docked Plan Panel (Right, 45%-60% width) */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
        {/* Left Column: Chat Body + Bottom Prompt Bar */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {/* ONLY THE CHAT BODY IS SCROLLABLE (Fades under top and bottom porcelain gradients) */}
          <div
            ref={chatBodyRef}
            className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 md:px-6 -mt-6 pt-8 -mb-10 pb-16"
          >
            <div className={cn(
              "w-full mx-auto space-y-8 pb-10 transition-all",
              isPanelOpen ? "max-w-2xl" : "max-w-3xl"
            )}>
              {/* User Prompt Editorial Lead */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  {isSimulating ? (
                    <div className="flex items-center gap-2 text-[#D66F14] font-medium">
                      <Loader2 size={13} className="animate-spin shrink-0" />
                      <span>Analyzing… {formatElapsed(elapsed)}</span>
                      <span className="text-[#334139]/40">·</span>
                      <span className="text-[#334139]/65 font-normal">
                        {liveStep === 0 && 'Decomposing architectural prompt'}
                        {liveStep === 1 && 'Profiling sources & foreign keys'}
                        {liveStep === 2 && 'Modeling dimensional star schema'}
                        {liveStep === 3 && 'Verifying constraints & compiling DDL'}
                        {liveStep === 4 && 'Provisioning Independent Audit Agent & KPI selection'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#064C1C] font-medium">
                      <Check size={13} strokeWidth={3} className="shrink-0" />
                      <span>
                        {questionsFinished
                          ? 'Architecture blueprint & KPI audit contract synthesized'
                          : 'KPI selection & architectural decisions required'}
                      </span>
                      <span className="text-[#334139]/40">·</span>
                      <span className="text-[#334139]/55 font-normal">
                        {questionsFinished
                          ? `${selectedKpis.length} KPIs verified by Independent Audit Agent`
                          : `${CLARIFYING_QUESTIONS.length} decisions pending`}
                      </span>
                    </div>
                  )}
                </div>

                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#334139] leading-snug">
                  {userPrompt}
                </h1>
              </section>

              {/* 1. Kept: Cool AI Thought Process Timeline */}
              {liveStep >= 1 && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#334139]/12">
                    <div className="flex items-center gap-2">
                      <div
                        style={{ backgroundColor: '#064C1C' }}
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[#FDFFFC]"
                      >
                        <Bot size={12} />
                      </div>
                      <span className="text-xs font-bold text-[#334139]">
                        AI Thought Process
                      </span>
                      <span className="text-[11px] text-[#334139]/50">
                        {visiblePhases.length} of {REASONING_PHASES.length} phases
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={toggleAllPhases}
                      className="inline-flex items-center gap-1 text-[11px] text-[#334139]/55 hover:text-[#334139] transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-[#334139]/5"
                    >
                      <ChevronsUpDown size={12} />
                      <span>{allPhasesCollapsed ? 'Expand all' : 'Collapse all'}</span>
                    </button>
                  </div>

                  <div className="relative pt-1">
                    {/* Vertical Timeline Rail */}
                    <span className="absolute left-[8.5px] top-3 bottom-3 w-px bg-[#334139]/15" />

                    <div className="space-y-0.5">
                      {visiblePhases.map((phase) => {
                        const running = liveStep === phase.stepIndex && isSimulating;
                        const open = isPhaseOpen(phase);

                        return (
                          <div key={phase.id} className="relative pl-7 animate-fadeIn">
                            {/* Status Node on Rail */}
                            <span className="absolute left-0 top-[7px] z-10">
                              {running ? (
                                <span className="w-[18px] h-[18px] rounded-full bg-[#FDFFFC] flex items-center justify-center">
                                  <Loader2 size={14} className="animate-spin text-[#D66F14]" />
                                </span>
                              ) : (
                                <span className="w-[18px] h-[18px] rounded-full bg-[#334139]/10 flex items-center justify-center">
                                  <Check size={11} strokeWidth={3} className="text-[#064C1C]" />
                                </span>
                              )}
                            </span>

                            {/* Phase Header Row */}
                            <div
                              onClick={() => togglePhase(phase)}
                              className="flex items-start justify-between gap-2 py-1.5 pr-1 -ml-1 pl-1 rounded-lg hover:bg-[#334139]/[0.04] cursor-pointer select-none"
                            >
                              <div className="min-w-0 flex-1">
                                <h3 className="text-xs font-semibold text-[#334139] leading-snug">
                                  {phase.title}
                                </h3>
                                {!open && (
                                  <p className="text-[10.5px] text-[#334139]/55 mt-0.5">
                                    {phase.scripts.length} script{phase.scripts.length > 1 ? 's' : ''} executed
                                  </p>
                                )}
                              </div>

                              <span className="text-[#334139]/45 mt-0.5 shrink-0">
                                {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </span>
                            </div>

                            {/* Expanded Scripts & Reasoning */}
                            {open && (
                              <div className="pb-3 pt-0.5 space-y-2.5 text-xs">
                                <ul className="space-y-1 rounded-lg bg-[#334139]/[0.05] px-3 py-2">
                                  {phase.scripts.map((script, idx) => {
                                    const scriptRunning =
                                      running && idx === phase.scripts.length - 1;
                                    return (
                                      <li
                                        key={script}
                                        className="flex items-center gap-2 text-[11px] font-mono text-[#334139]"
                                      >
                                        {scriptRunning ? (
                                          <Loader2
                                            size={11}
                                            className="animate-spin text-[#D66F14] shrink-0"
                                          />
                                        ) : (
                                          <Check
                                            size={11}
                                            strokeWidth={3}
                                            className="text-[#334139]/40 shrink-0"
                                          />
                                        )}
                                        <span>{script}</span>
                                      </li>
                                    );
                                  })}
                                </ul>

                                <p className="text-xs leading-relaxed text-[#334139]/80">
                                  {phase.reasoning}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* 2. Clarifying Questions: Stepped Flow (Must be answered or skipped BEFORE the blueprint appears) */}
              {liveStep >= 5 && !questionsFinished && currentQuestion && (
                <section className="space-y-3 pt-1 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1 border-b border-[#334139]/12">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#334139]">
                        Architectural Decisions Required
                      </span>
                      <span className="text-[11px] text-[#334139]/50 font-mono">
                        Question {activeQuestionIndex + 1} of {CLARIFYING_QUESTIONS.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Mini stepper indicator dots */}
                      <div className="flex items-center gap-1.5">
                        {CLARIFYING_QUESTIONS.map((q, idx) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveQuestionIndex(idx)}
                            className={cn(
                              'w-2 h-2 rounded-full transition-all cursor-pointer',
                              activeQuestionIndex === idx
                                ? 'bg-[#064C1C] scale-125'
                                : 'bg-[#334139]/20 hover:bg-[#334139]/40',
                            )}
                            aria-label={`Go to question ${idx + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleSkipAllQuestions}
                        className="text-[11px] font-semibold text-[#D66F14] hover:underline cursor-pointer"
                      >
                        Skip all
                      </button>
                    </div>
                  </div>

                  {/* Active Question Box */}
                  <div className="p-4 md:p-5 rounded-2xl bg-white border border-[#334139]/15 shadow-2xs space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#D66F14]">
                          0{activeQuestionIndex + 1}
                        </span>
                        <h3 className="text-sm font-bold text-[#334139]">
                          {currentQuestion.question}
                        </h3>
                      </div>
                      <p className="text-xs text-[#334139]/60 leading-relaxed pl-5">
                        {currentQuestion.context}
                      </p>
                    </div>

                    {/* Options Pills with md size bullets */}
                    <div className="pl-5 flex flex-wrap items-center gap-2 pt-1">
                      {currentQuestion.options.map((opt) => {
                        const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                            className={cn(
                              'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none',
                              isSelected
                                ? 'bg-[#064C1C] text-[#FDFFFC] border-[#064C1C]'
                                : 'bg-transparent text-[#334139] border-[#334139]/25 hover:border-[#334139]/60',
                            )}
                          >
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full shrink-0 transition-all',
                                isSelected
                                  ? 'bg-[#FDFFFC]'
                                  : opt.isRecommended
                                  ? 'bg-[#D66F14]'
                                  : 'bg-[#334139]/35',
                              )}
                            />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Option Description */}
                    {(() => {
                      const activeOption =
                        currentQuestion.options.find(
                          (o) => o.id === selectedAnswers[currentQuestion.id],
                        ) || currentQuestion.options[0];
                      return (
                        <p className="pl-5 text-xs text-[#334139]/65 leading-relaxed">
                          {activeOption.description}
                          {activeOption.isRecommended && (
                            <span className="ml-1.5 text-[11px] font-medium text-[#D66F14]">
                              · Recommended
                            </span>
                          )}
                        </p>
                      );
                    })()}

                    {/* Stepper Navigation: Previous, Skip, Next */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#334139]/10 text-xs">
                      <div>
                        {!isFirstQuestion && (
                          <button
                            type="button"
                            onClick={() => setActiveQuestionIndex((prev) => Math.max(prev - 1, 0))}
                            className="inline-flex items-center gap-1 font-semibold text-[#334139]/70 hover:text-[#334139] transition-colors cursor-pointer px-2 py-1 rounded"
                          >
                            <ChevronLeft size={13} />
                            <span>Previous</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSkipQuestion}
                          className="inline-flex items-center gap-1 font-semibold text-[#334139]/50 hover:text-[#334139] transition-colors cursor-pointer px-2.5 py-1 rounded"
                        >
                          <SkipForward size={12} />
                          <span>{isLastQuestion ? 'Skip & Finish' : 'Skip'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleNextQuestion}
                          className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full font-bold bg-[#064C1C] hover:bg-[#1E2D24] text-[#FDFFFC] transition-colors cursor-pointer"
                        >
                          <span>{isLastQuestion ? 'Confirm & Generate Blueprint' : 'Next'}</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 3. Architectural Blueprint Card: ONLY APPEARS ONCE ALL QUESTIONS ARE ANSWERED OR SKIPPED */}
              {questionsFinished && (
                <section className="space-y-3 animate-fadeIn">
                  {/* Status header indicating decisions were resolved */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="flex items-center gap-1.5 text-[#064C1C] font-semibold">
                      <Check size={14} strokeWidth={3} />
                      Decisions & {selectedKpis.length} KPI audit contracts applied to final blueprint
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuestionsFinished(false)}
                      className="text-[11px] font-semibold text-[#334139]/60 hover:text-[#334139] underline cursor-pointer"
                    >
                      Modify decisions
                    </button>
                  </div>

                  {/* Blueprint Card */}
                  <div className="p-5 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm hover:border-[#064C1C]/40 transition-all space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#064C1C]/10 text-[#064C1C] uppercase tracking-wider">
                            Architectural Blueprint
                          </span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#064C1C]/10 text-[#064C1C] uppercase tracking-wider inline-flex items-center gap-1">
                            <ShieldCheck size={11} />
                            {selectedKpis.length} Verified KPIs
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#334139] leading-snug">
                          Retail Lakehouse Master Pipeline
                        </h3>

                        <p className="text-xs text-[#334139]/70 leading-relaxed max-w-xl">
                          Kimball star schema architecture connecting raw PostgreSQL & Stripe streams into curated analytics marts with automated KPI reconciliation.
                        </p>
                      </div>

                      {/* View Plan & Audit Buttons: Toggles the 48% - 50% wide docked side panel */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setPanelTab('audit');
                            setIsPanelOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border border-[#D66F14]/40 bg-[#D66F14]/10 text-[#D66F14] hover:bg-[#D66F14] hover:text-[#FDFFFC] transition-all cursor-pointer"
                        >
                          <Scale size={13} />
                          <span>Audit & KPIs ({selectedKpis.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsPanelOpen(!isPanelOpen)}
                          className={cn(
                            'flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm',
                            isPanelOpen
                              ? 'bg-[#334139] text-[#FDFFFC] hover:bg-[#1E2D24]'
                              : 'bg-[#064C1C] text-[#FDFFFC] hover:bg-[#1E2D24]',
                          )}
                        >
                          <Eye size={14} />
                          <span>{isPanelOpen ? 'Close Plan View' : 'View Plan'}</span>
                          <ChevronRight
                            size={14}
                            className={cn('transition-transform', isPanelOpen ? 'rotate-90' : '')}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* PINNED BOTTOM PROMPT BAR with Porcelain Gradient (No Border, Subtle Fade) */}
          <footer
            style={{
              background:
                'linear-gradient(to top, rgba(253, 255, 252, 1) 0%, rgba(253, 255, 252, 0.95) 55%, rgba(253, 255, 252, 0) 100%)',
            }}
            className="shrink-0 w-full pt-10 pb-4 px-4 z-20 flex flex-col items-center pointer-events-none"
          >
            <div className={cn(
              "w-full pointer-events-auto transition-all",
              isPanelOpen ? "max-w-xl" : "max-w-2xl"
            )}>
              <WorkspacePromptBar
                className="relative bottom-auto left-auto translate-x-0 w-full px-0"
                disabled={isSimulating || isApproving}
                placeholder={
                  isSimulating
                    ? 'AI is formulating architecture plan... Please wait'
                    : isApproving
                    ? 'Building workspace pipeline... Please wait'
                    : 'Ask AuraBI to add a KPI or refine your pipeline plan... (Shift+Enter for new line)'
                }
                onSend={handlePromptSubmit}
              />
            </div>
          </footer>
        </div>

        {/* Right Column: Docked Plan Panel (Takes 48% to 50% of the page's width) */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.aside
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{ backgroundColor: '#FDFFFC' }}
              className="w-full md:w-[50%] lg:w-[48%] shrink-0 h-full flex flex-col border-l border-[#334139]/12 z-20 overflow-hidden shadow-xl"
              aria-label="Pipeline Architecture Plan Panel"
            >
              {/* Panel Header */}
              <div className="px-6 py-4 border-b border-[#334139]/12 flex items-center justify-between shrink-0 bg-[#FDFFFC]">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    style={{ backgroundColor: '#064C1C' }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[#FDFFFC] shadow-2xs shrink-0"
                  >
                    <Bot size={16} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#334139] truncate">
                      Pipeline Architecture Plan
                    </h2>
                    <p className="text-[11px] text-[#334139]/60 font-mono truncate">
                      Retail Lakehouse Master Pipeline · 5 Stages · Isolated Audit Agent
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="p-1.5 rounded-lg text-[#334139]/60 hover:text-[#334139] hover:bg-[#334139]/8 transition-colors cursor-pointer shrink-0"
                  aria-label="Close plan panel"
                  title="Close panel"
                >
                  <PanelRightClose size={18} />
                </button>
              </div>

              {/* Panel Nav Tabs & Export Actions */}
              <div className="px-6 pt-3 border-b border-[#334139]/12 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-[#FDFFFC]">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPanelTab('overview')}
                    className={cn(
                      'pb-2.5 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer',
                      panelTab === 'overview'
                        ? 'border-[#064C1C] text-[#064C1C]'
                        : 'border-transparent text-[#334139]/50 hover:text-[#334139]',
                    )}
                  >
                    Stages (5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelTab('audit')}
                    className={cn(
                      'pb-2.5 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer inline-flex items-center gap-1.5',
                      panelTab === 'audit'
                        ? 'border-[#064C1C] text-[#064C1C]'
                        : 'border-transparent text-[#334139]/50 hover:text-[#334139]',
                    )}
                  >
                    <ShieldCheck size={13} className="text-[#D66F14]" />
                    <span>Audit & KPIs ({selectedKpis.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelTab('ddl')}
                    className={cn(
                      'pb-2.5 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer',
                      panelTab === 'ddl'
                        ? 'border-[#064C1C] text-[#064C1C]'
                        : 'border-transparent text-[#334139]/50 hover:text-[#334139]',
                    )}
                  >
                    Compiled DDL
                  </button>
                </div>

                {/* Export Actions */}
                <div className="flex items-center gap-1.5 pb-2">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
                    title="Copy compiled DDL to clipboard"
                  >
                    {copiedFormat === 'sql' ? (
                      <Check size={12} strokeWidth={3} className="text-[#064C1C]" />
                    ) : (
                      <Copy size={12} />
                    )}
                    <span>{copiedFormat === 'sql' ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSql}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
                    title="Export as .sql file"
                  >
                    <Download size={12} />
                    <span>.SQL</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
                    title="Export as .json specification"
                  >
                    <Download size={12} />
                    <span>.JSON</span>
                  </button>
                </div>
              </div>

              {/* Panel Scrollable Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
                {panelTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-[#064C1C]/5 border border-[#064C1C]/20 text-xs text-[#064C1C] space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <Check size={14} strokeWidth={3} />
                        Automated Schema & Independent Audit Verification Passed
                      </span>
                      <p className="text-[11.5px] text-[#334139]/75 leading-relaxed">
                        Surrogate keys, nullability checks, Zetaris virtualization mappings, and {selectedKpis.length} KPI reconciliation contracts have been verified.
                      </p>
                    </div>

                    <div className="divide-y divide-[#334139]/10">
                      {DEFAULT_STAGES.map((stage) => (
                        <div key={stage.id} className="py-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#064C1C]">
                              STAGE {stage.number}
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#D66F14]">
                              {stage.category}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-[#334139]">
                            {stage.title}
                          </h4>

                          <p className="text-xs text-[#334139]/75 leading-relaxed">
                            {stage.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {stage.tables.map((t) => (
                              <code
                                key={t}
                                className="px-2 py-0.5 rounded bg-[#334139]/[0.06] font-mono text-[10.5px] text-[#334139]"
                              >
                                {t}
                              </code>
                            ))}
                            <span className="text-[11px] text-[#334139]/45 pl-1">
                              {stage.technologies.join(' · ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {panelTab === 'audit' && (
                  <div className="space-y-5">
                    {/* Automated Verification Summary */}
                    <div className="p-4 rounded-2xl bg-[#334139]/[0.03] border border-[#334139]/15 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#064C1C]">
                          <ShieldCheck size={13} />
                          Automated KPI Verification
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#064C1C]/10 text-[#064C1C] font-mono text-[10px] font-bold">
                          Independent Check
                        </span>
                      </div>
                      <p className="text-xs text-[#334139]/80 leading-relaxed">
                        To ensure numbers are accurate and trustworthy, an independent audit check reconciles your selected KPIs directly against raw source records before any reports are finalized.
                      </p>
                    </div>

                    {/* Interactive KPI Selection inside the Panel */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#334139]/60">
                          Selected KPIs Under Audit ({selectedKpis.length})
                        </span>
                        <span className="text-[10.5px] text-[#334139]/50">
                          Click to toggle KPI inclusion
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {kpis.map((kpi) => {
                          const active = selectedKpiIds.includes(kpi.id);
                          return (
                            <button
                              key={kpi.id}
                              type="button"
                              onClick={() => toggleKpiSelection(kpi.id)}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer',
                                active
                                  ? 'bg-[#064C1C] text-[#FDFFFC] border-[#064C1C]'
                                  : 'bg-[#FDFFFC] text-[#334139]/70 border-[#334139]/20 hover:border-[#334139]/50',
                              )}
                            >
                              {active ? <Check size={11} strokeWidth={3} /> : <Plus size={11} />}
                              <span>{kpi.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Domain-Suited Presentation: Financial Reconciliation Table (with sticky column & row headers) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-[#1E2D24] flex items-center gap-1.5">
                          <Scale size={13} className="text-[#064C1C]" />
                          <span>
                            {selectedAnswers['audit-presentation-format'] === 'cohort-drift-matrix'
                              ? 'Audit Findings: Cohort & Distribution Drift Matrix'
                              : selectedAnswers['audit-presentation-format'] === 'checksum-parity-log'
                              ? 'Audit Findings: Cryptographic Checksum & Parity Log'
                              : 'Audit Findings: Financial Reconciliation Table'}
                          </span>
                        </h3>
                        <span className="font-mono text-[10px] text-[#064C1C] font-bold">
                          All {selectedKpis.length} KPIs Reconciled
                        </span>
                      </div>

                      <div className="overflow-auto max-w-full max-h-[min(500px,80vh)] [container-type:inline-size] rounded-2xl border border-[#334139]/15 bg-[#FDFFFC]">
                        <table className="w-full text-left border-separate border-spacing-0 text-[11px]">
                          <thead className="sticky top-0 z-10 bg-[#FDFFFC]">
                            <tr className="font-mono text-[10px] uppercase tracking-wider text-[#334139]/60">
                              <th scope="col" className="py-2.5 px-3 border-b border-[#334139]/15 bg-[#FDFFFC] sticky left-0 z-20">
                                KPI Metric
                              </th>
                              <th scope="col" className="py-2.5 px-3 border-b border-[#334139]/15 bg-[#FDFFFC]">
                                Source Ledger (Raw)
                              </th>
                              <th scope="col" className="py-2.5 px-3 border-b border-[#334139]/15 bg-[#FDFFFC]">
                                Warehouse Mart (Built)
                              </th>
                              <th scope="col" className="py-2.5 px-3 border-b border-[#334139]/15 bg-[#FDFFFC]">
                                Variance (Δ)
                              </th>
                              <th scope="col" className="py-2.5 px-3 border-b border-[#334139]/15 bg-[#FDFFFC] text-right">
                                Audit Verdict
                              </th>
                            </tr>
                          </thead>
                          <tbody className="tabular-nums">
                            {selectedKpis.map((kpi) => (
                              <tr key={kpi.id} className="hover:bg-[#334139]/[0.02]">
                                <th
                                  scope="row"
                                  className="py-3 px-3 border-b border-[#334139]/10 font-semibold text-[#1E2D24] bg-[#FDFFFC] sticky left-0 z-10 align-top"
                                >
                                  <div>{kpi.name}</div>
                                  <div className="font-mono text-[9.5px] font-normal text-[#334139]/55 mt-0.5">
                                    {kpi.formula}
                                  </div>
                                </th>
                                <td className="py-3 px-3 border-b border-[#334139]/10 font-mono text-[#334139] align-top">
                                  <div className="font-bold">{kpi.sourceLedgerValue}</div>
                                  <div className="text-[9.5px] text-[#334139]/50">{kpi.sourceSystem}</div>
                                </td>
                                <td className="py-3 px-3 border-b border-[#334139]/10 font-mono text-[#334139] align-top">
                                  <div className="font-bold">{kpi.martOutputValue}</div>
                                  <div className="text-[9.5px] text-[#334139]/50">{kpi.targetMart}</div>
                                </td>
                                <td className="py-3 px-3 border-b border-[#334139]/10 font-mono text-[#064C1C] font-bold align-top">
                                  <div>{kpi.variance}</div>
                                  <div className="text-[9.5px] font-normal text-[#334139]/50">
                                    SLA: {kpi.tolerance}
                                  </div>
                                </td>
                                <td className="py-3 px-3 border-b border-[#334139]/10 text-right align-top">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#064C1C]/10 text-[#064C1C] font-mono text-[10px] font-bold">
                                    <Check size={10} strokeWidth={3} />
                                    PASS
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {panelTab === 'ddl' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#334139]/60 font-mono">
                      <span>Dialect: ANSI SQL-92 / Zetaris</span>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="hover:text-[#064C1C] underline cursor-pointer"
                      >
                        Copy All
                      </button>
                    </div>

                    <pre className="p-4 rounded-2xl bg-[#334139]/[0.05] text-[#334139] font-mono text-[11px] leading-relaxed overflow-x-auto custom-scrollbar">
                      {COMPILED_SQL_PREVIEW}
                    </pre>
                  </div>
                )}
              </div>

              {/* Panel Footer Action */}
              <div className="px-6 py-4 border-t border-[#334139]/12 bg-[#FDFFFC] flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleApprovePlan}
                  disabled={isApproving}
                  style={{ backgroundColor: '#064C1C' }}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-[#FDFFFC] hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <span>{isApproving ? 'Building Pipeline…' : 'Validate & Build Pipeline'}</span>
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
