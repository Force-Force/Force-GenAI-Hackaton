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
    category: 'Mart',
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
`;

export function PlanProposalPage() {
  const [liveStep, setLiveStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});

  // 45% - 60% Docked side panel state
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [panelTab, setPanelTab] = useState<'overview' | 'ddl' | 'impact'>('overview');
  const [copiedFormat, setCopiedFormat] = useState<'sql' | 'json' | null>(null);

  // Stepped questions state & completion tracker
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [questionsFinished, setQuestionsFinished] = useState<boolean>(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({
    'scd-strategy': 'scd-2',
    'ingestion-frequency': 'microbatch-15m',
    'data-quality-strategy': 'quarantine-dlq',
  });

  const [isApproving, setIsApproving] = useState(false);

  const setProjectName = useWorkspaceStore((s) => s.setProjectName);
  const chatMessages = useChatStore((s) => s.messages);
  const userPrompt =
    [...chatMessages].reverse().find((m) => m.sender === 'user')?.text ||
    'Build an end-to-end data lakehouse pipeline connecting PostgreSQL transactions, Stripe payment events, and customer dimension analytics into a Star Schema with Zetaris virtualization.';

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Staged live simulation progression
  useEffect(() => {
    if (!isSimulating) return;

    if (liveStep === 0) {
      timerRef.current = setTimeout(() => setLiveStep(1), 700);
    } else if (liveStep === 1) {
      timerRef.current = setTimeout(() => setLiveStep(2), 1200);
    } else if (liveStep === 2) {
      timerRef.current = setTimeout(() => setLiveStep(3), 1200);
    } else if (liveStep === 3) {
      timerRef.current = setTimeout(() => {
        setLiveStep(4);
        setIsSimulating(false);
      }, 900);
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
    setLiveStep(4);
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
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#064C1C] font-medium">
                      <Check size={13} strokeWidth={3} className="shrink-0" />
                      <span>
                        {questionsFinished
                          ? 'Architecture blueprint synthesized'
                          : 'Decisions required for final blueprint'}
                      </span>
                      <span className="text-[#334139]/40">·</span>
                      <span className="text-[#334139]/55 font-normal">
                        {questionsFinished ? 'Ready to inspect & validate' : '3 questions pending'}
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
              {liveStep >= 4 && !questionsFinished && currentQuestion && (
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

                    {/* Options Pills */}
                    <div className="pl-5 flex flex-wrap items-center gap-2 pt-1">
                      {currentQuestion.options.map((opt) => {
                        const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none',
                              isSelected
                                ? 'bg-[#064C1C] text-[#FDFFFC] border-[#064C1C]'
                                : 'bg-transparent text-[#334139] border-[#334139]/25 hover:border-[#334139]/60',
                            )}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                            <span>{opt.label}</span>
                            {opt.isRecommended && !isSelected && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[#D66F14]"
                                title="Recommended"
                              />
                            )}
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
                      Decisions applied to final architectural blueprint
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
                  <div className="p-5 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm hover:border-[#064C1C]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#064C1C]/10 text-[#064C1C] uppercase tracking-wider">
                          Architectural Blueprint
                        </span>
                        <span className="text-[11px] font-mono text-[#334139]/50">
                          4 Stages • 9 Entities • Zero-Copy
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#334139] leading-snug">
                        Retail Lakehouse Master Pipeline
                      </h3>

                      <p className="text-xs text-[#334139]/70 leading-relaxed max-w-xl">
                        Kimball star schema architecture connecting raw PostgreSQL & Stripe streams into curated analytics marts with unified Zetaris SQL federation.
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {['Bronze Staging', 'SCD-2 Customer', 'Fact Daily Revenue', 'Zetaris View'].map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-[#334139]/[0.05] text-[10.5px] font-mono text-[#334139]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* View Plan Button: Toggles the 45% - 60% wide docked side panel */}
                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <button
                        type="button"
                        onClick={() => setIsPanelOpen(!isPanelOpen)}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm",
                          isPanelOpen
                            ? "bg-[#334139] text-[#FDFFFC] hover:bg-[#1E2D24]"
                            : "bg-[#064C1C] text-[#FDFFFC] hover:bg-[#1E2D24]"
                        )}
                      >
                        <Eye size={14} />
                        <span>{isPanelOpen ? 'Close Plan View' : 'View Plan'}</span>
                        <ChevronRight size={14} className={cn("transition-transform", isPanelOpen ? "rotate-90" : "")} />
                      </button>
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
                    : 'Ask AuraBI to refine or adjust your pipeline plan... (Shift+Enter for new line)'
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
                      Retail Lakehouse Master Pipeline · 4 Stages · Zero-copy Zetaris Gateway
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
                    Stages (4)
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
                  <button
                    type="button"
                    onClick={() => setPanelTab('impact')}
                    className={cn(
                      'pb-2.5 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer',
                      panelTab === 'impact'
                        ? 'border-[#064C1C] text-[#064C1C]'
                        : 'border-transparent text-[#334139]/50 hover:text-[#334139]',
                    )}
                  >
                    SLA & Specs
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
                        Automated Schema Verification Passed
                      </span>
                      <p className="text-[11.5px] text-[#334139]/75 leading-relaxed">
                        Surrogate keys, nullability checks, and Zetaris virtualization mappings have been verified without circular dependencies.
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

                {panelTab === 'impact' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl border border-[#334139]/12 space-y-1">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#334139]/50">
                        Data Freshness SLA
                      </span>
                      <p className="text-xl font-bold text-[#334139]">
                        {selectedAnswers['ingestion-frequency'] === 'streaming-realtime'
                          ? 'Real-Time (< 30s)'
                          : selectedAnswers['ingestion-frequency'] === 'hourly-batch'
                          ? 'Hourly Batch'
                          : '15-Minute Micro-batch'}
                      </p>
                      <p className="text-xs text-[#334139]/65">
                        Automated sync via Zetaris change event listeners.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-[#334139]/12 space-y-1">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#334139]/50">
                        Historical Preservation
                      </span>
                      <p className="text-xl font-bold text-[#064C1C]">
                        {selectedAnswers['scd-strategy'] === 'scd-2'
                          ? 'SCD Type 2 Timeline'
                          : selectedAnswers['scd-strategy'] === 'append-only'
                          ? 'Append-Only Event Log'
                          : 'SCD Type 1 Overwrite'}
                      </p>
                      <p className="text-xs text-[#334139]/65">
                        Retains point-in-time auditability across customer cohorts.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-[#334139]/12 space-y-1">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#334139]/50">
                        Error Policy
                      </span>
                      <p className="text-xl font-bold text-[#D66F14]">
                        {selectedAnswers['data-quality-strategy'] === 'quarantine-dlq'
                          ? 'Dead-Letter Queue'
                          : selectedAnswers['data-quality-strategy'] === 'strict-fail'
                          ? 'Strict Fail-Fast'
                          : 'Auto-Coalesce Defaults'}
                      </p>
                      <p className="text-xs text-[#334139]/65">
                        Malformed payloads are isolated without halting pipeline stages.
                      </p>
                    </div>
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
