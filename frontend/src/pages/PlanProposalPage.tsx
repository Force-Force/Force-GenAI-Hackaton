import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import {
  Sparkles,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  RotateCcw,
  Workflow,
  Palette,
  ArrowUpRight,
  ArrowLeft,
  Loader2,
  FastForward,
  Plus,
  X,
} from 'lucide-react';
import { navigateTo } from '../utils/navigation';
import { cn } from '../utils/cn';
import { useWorkspaceStore } from '../features/workspace/store/workspaceStore';
import { useChatStore } from '../features/chat/store/chatStore';

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

/**
 * Live Simulation Steps:
 * 0: Initial prompt decomposition
 * 1: Phase 1 running (Source Discovery)
 * 2: Phase 2 running (Dimensional Modeling)
 * 3: Phase 3 running (Verification & DDL)
 * 4: Architecture Plan Revealed
 * 5: Clarifying Questions & Approval Ready
 */
export function PlanProposalPage() {
  const [liveStep, setLiveStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'architecture' | 'ddl' | 'impact'>('architecture');
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({
    'scd-strategy': 'scd-2',
    'ingestion-frequency': 'microbatch-15m',
    'data-quality-strategy': 'quarantine-dlq',
  });

  const [refinementText, setRefinementText] = useState('');
  const [refinementsList, setRefinementsList] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState(false);

  const setProjectName = useWorkspaceStore((s) => s.setProjectName);
  const chatMessages = useChatStore((s) => s.messages);
  const userPrompt =
    [...chatMessages].reverse().find((m) => m.sender === 'user')?.text ||
    'Build an end-to-end data lakehouse pipeline connecting PostgreSQL transactions, Stripe payment events, and customer dimension analytics into a Star Schema with Zetaris virtualization.';

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Staged live simulation progression
  useEffect(() => {
    if (!isSimulating) return;

    if (liveStep === 0) {
      timerRef.current = setTimeout(() => setLiveStep(1), 700);
    } else if (liveStep === 1) {
      timerRef.current = setTimeout(() => setLiveStep(2), 1300);
    } else if (liveStep === 2) {
      timerRef.current = setTimeout(() => setLiveStep(3), 1300);
    } else if (liveStep === 3) {
      timerRef.current = setTimeout(() => setLiveStep(4), 1100);
    } else if (liveStep === 4) {
      timerRef.current = setTimeout(() => {
        setLiveStep(5);
        setIsSimulating(false);
      }, 800);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [liveStep, isSimulating]);

  // Live elapsed counter while simulating
  useEffect(() => {
    if (!isSimulating) return;
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [isSimulating]);

  const handleRestartAnimation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExpandedPhases({});
    setElapsed(0);
    setLiveStep(0);
    setIsSimulating(true);
  };

  const handleSkipAnimation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLiveStep(5);
    setIsSimulating(false);
  };

  // A phase is open if explicitly toggled by user, or while it is the currently running step
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

  const handleAddRefinement = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!refinementText.trim()) return;
    setRefinementsList((prev) => [...prev, refinementText.trim()]);
    setRefinementText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const removeRefinement = (index: number) => {
    setRefinementsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (refinementText.trim()) {
        handleAddRefinement();
      } else if (!isSimulating && !isApproving) {
        handleApprovePlan();
      }
    }
  };

  const handleApprovePlan = () => {
    setIsApproving(true);
    setProjectName('Retail Lakehouse Master Pipeline');
    setTimeout(() => {
      navigateTo('/workspace');
    }, 400);
  };

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div
      style={{ backgroundColor: '#FDFFFC' }}
      className="min-h-screen flex flex-col font-sans text-[#334139] selection:bg-[#064C1C]/15 antialiased"
    >
      {/* Blended Top Header — Identical to AgentEntryPage */}
      <header className="w-full px-6 py-4 flex items-center justify-between shrink-0 bg-transparent">
        <div
          onClick={() => navigateTo('/')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
          aria-label="Return to Welcome Page"
        >
          <div
            style={{ backgroundColor: '#064C1C' }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FDFFFC] shadow-xs"
          >
            <Sparkles size={15} />
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

      {/* Single Centered Editorial Column (max-w-3xl, flat on Porcelain) */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 pt-4 pb-16 space-y-10">
        {/* 1. User Prompt Editorial Lead */}
        <section className="space-y-2.5">
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
                  {liveStep === 4 && 'Synthesizing pipeline proposal'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#064C1C] font-medium">
                <Check size={13} strokeWidth={3} className="shrink-0" />
                <span>Architecture proposal ready</span>
                <span className="text-[#334139]/40">·</span>
                <span className="text-[#334139]/55 font-normal">
                  4 stages · 3 clarifying decisions
                </span>
              </div>
            )}
          </div>

          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#334139] leading-snug">
            {userPrompt}
          </h1>
        </section>

        {/* 2. Flat Thinking Timeline (Matches AiThoughtPanel) */}
        {liveStep >= 1 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#334139]/12">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#334139]">
                  Thinking process
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

        {/* 3. Proposed Architecture (Flat Numbered List, No Cards) */}
        {liveStep >= 4 && (
          <section className="space-y-2 animate-fadeIn">
            {/* Minimal Hairline Tab Bar */}
            <div className="flex items-center justify-between border-b border-[#334139]/12">
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => setActiveTab('architecture')}
                  className={cn(
                    'pb-2 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer',
                    activeTab === 'architecture'
                      ? 'border-[#334139] text-[#334139]'
                      : 'border-transparent text-[#334139]/50 hover:text-[#334139]',
                  )}
                >
                  Proposed architecture (4)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ddl')}
                  className={cn(
                    'pb-2 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer',
                    activeTab === 'ddl'
                      ? 'border-[#334139] text-[#334139]'
                      : 'border-transparent text-[#334139]/50 hover:text-[#334139]',
                  )}
                >
                  SQL DDL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('impact')}
                  className={cn(
                    'pb-2 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer',
                    activeTab === 'impact'
                      ? 'border-[#334139] text-[#334139]'
                      : 'border-transparent text-[#334139]/50 hover:text-[#334139]',
                  )}
                >
                  SLA & metrics
                </button>
              </div>
            </div>

            {/* Tab 1: Flat Architecture Rows */}
            {activeTab === 'architecture' && (
              <div className="divide-y divide-[#334139]/10">
                {DEFAULT_STAGES.map((stage, idx) => (
                  <div
                    key={stage.id}
                    style={{ animationDelay: `${idx * 90}ms` }}
                    className="py-4 flex items-start gap-4 animate-fadeIn"
                  >
                    <span className="font-mono text-xs font-bold text-[#334139]/40 pt-0.5 w-6 shrink-0">
                      {stage.number}
                    </span>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#334139]">
                          {stage.title}
                        </h3>
                        <span className="text-[10.5px] font-mono text-[#334139]/50 uppercase tracking-wider">
                          {stage.category}
                        </span>
                      </div>

                      <p className="text-xs text-[#334139]/75 leading-relaxed">
                        {stage.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {stage.tables.map((t) => (
                          <code
                            key={t}
                            className="px-2 py-0.5 rounded bg-[#334139]/[0.06] text-[10.5px] font-mono text-[#334139]"
                          >
                            {t}
                          </code>
                        ))}
                        <span className="text-[11px] text-[#334139]/45 pl-1">
                          {stage.technologies.join(' · ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Clean Light DDL Preview */}
            {activeTab === 'ddl' && (
              <div className="pt-2 animate-fadeIn">
                <pre className="p-4 rounded-xl bg-[#334139]/[0.05] text-[#334139] font-mono text-[11px] leading-relaxed overflow-x-auto custom-scrollbar">
{`-- Stage 01: Bronze Staging Table
CREATE TABLE stg_raw_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    event_timestamp TIMESTAMP NOT NULL
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
);`}
                </pre>
              </div>
            )}

            {/* Tab 3: Flat Typographic SLA Strip */}
            {activeTab === 'impact' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#334139]/12 py-4 animate-fadeIn">
                <div className="pb-3 sm:pb-0 sm:pr-6 space-y-1">
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#334139]/50">
                    Data Freshness SLA
                  </span>
                  <p className="text-xl font-bold text-[#334139]">15 min</p>
                  <p className="text-xs text-[#334139]/65">
                    Micro-batch cadence via Zetaris change listeners.
                  </p>
                </div>

                <div className="py-3 sm:py-0 sm:px-6 space-y-1">
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#334139]/50">
                    Synthesized Entities
                  </span>
                  <p className="text-xl font-bold text-[#334139]">9 nodes</p>
                  <p className="text-xs text-[#334139]/65">
                    3 sources, 2 transforms, and 4 dimensional marts.
                  </p>
                </div>

                <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#334139]/50">
                    Federation Mode
                  </span>
                  <p className="text-xl font-bold text-[#064C1C]">Zero-copy</p>
                  <p className="text-xs text-[#334139]/65">
                    Queries execute live without physical duplication.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 4. Clarifying Questions (Flat Rows + Welcome-Style Pill Choices) */}
        {liveStep >= 5 && (
          <section className="space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#334139]/12">
              <span className="text-xs font-bold text-[#334139]">
                Clarifying questions
              </span>
              <span className="text-[11px] text-[#334139]/50">
                Select options before building
              </span>
            </div>

            <div className="divide-y divide-[#334139]/10">
              {CLARIFYING_QUESTIONS.map((q, idx) => {
                const selectedId = selectedAnswers[q.id];
                const activeOption =
                  q.options.find((o) => o.id === selectedId) || q.options[0];

                return (
                  <div
                    key={q.id}
                    style={{ animationDelay: `${idx * 100}ms` }}
                    className="py-4 space-y-2.5 animate-fadeIn"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs font-bold text-[#334139]/40 shrink-0">
                        0{idx + 1}
                      </span>
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-[#334139]">
                          {q.question}
                        </h3>
                        <p className="text-xs text-[#334139]/60">{q.context}</p>
                      </div>
                    </div>

                    {/* Flat Pill Buttons (Coherent with AgentEntryPage Source Buttons) */}
                    <div className="pl-7 flex flex-wrap items-center gap-2 pt-0.5">
                      {q.options.map((opt) => {
                        const isSelected = selectedId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.id)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer',
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

                    {/* Single quiet line explaining the selected option */}
                    <p className="pl-7 text-xs text-[#334139]/65 leading-relaxed">
                      {activeOption.description}
                      {activeOption.isRecommended && (
                        <span className="ml-1.5 text-[11px] font-medium text-[#D66F14]">
                          · Recommended
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. Unified Prompt / Refinement & Approval Box (Mirrors Welcome Page Prompt Box) */}
        <section className="space-y-3 pt-2">
          {refinementsList.length > 0 && (
            <div className="space-y-1.5">
              {refinementsList.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 text-xs text-[#334139] py-1 border-b border-[#334139]/10"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Check size={12} strokeWidth={3} className="text-[#064C1C] shrink-0" />
                    <span className="truncate">
                      Added constraint: <strong className="font-semibold">"{item}"</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRefinement(i)}
                    className="text-[#334139]/45 hover:text-[#334139] p-0.5 cursor-pointer shrink-0"
                    aria-label="Remove constraint"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleAddRefinement}
            className="w-full bg-white rounded-2xl md:rounded-3xl border border-[#334139]/20 shadow-sm focus-within:border-[#064C1C] focus-within:ring-2 focus-within:ring-[#064C1C]/10 transition-all p-4 md:p-5 flex flex-col gap-3"
          >
            <textarea
              ref={textareaRef}
              value={refinementText}
              onChange={(e) => {
                setRefinementText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Add a constraint or refinement before building (e.g., include monthly customer churn cohort)..."
              className="w-full bg-transparent resize-none outline-none text-[#334139] placeholder:text-[#334139]/40 text-sm leading-relaxed font-sans custom-scrollbar"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#334139]/10">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#334139]/65 hover:text-[#334139] transition-colors cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Back to prompt</span>
              </button>

              <div className="flex items-center gap-2">
                {refinementText.trim() && (
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-semibold text-[#334139] border border-[#334139]/25 hover:border-[#334139] transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add constraint</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApprovePlan}
                  disabled={isSimulating || isApproving}
                  style={{
                    backgroundColor: isSimulating ? '#334139' : '#064C1C',
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold text-[#FDFFFC] hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                >
                  <span>
                    {isApproving
                      ? 'Building Pipeline…'
                      : 'Approve & Build Pipeline'}
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>

      {/* Blended Footer — Identical to AgentEntryPage */}
      <footer className="w-full py-4 text-center text-[11px] font-mono text-[#334139]/50 bg-transparent shrink-0">
        AuraBI • Autonomous Data Warehouse Architect • Porcelain Edition
      </footer>
    </div>
  );
}
