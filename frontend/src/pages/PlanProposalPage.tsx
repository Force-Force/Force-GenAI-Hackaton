import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Brain,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Database,
  Code2,
  Boxes,
  Layers,
  PlayCircle,
  Check,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Send,
  Sliders,
  Workflow,
  ArrowUpRight,
  ShieldCheck,
  FileCode2,
  Eye,
  Loader2,
  FastForward,
  Activity,
  Terminal,
} from 'lucide-react';
import { navigateTo } from '../utils/navigation';
import { cn } from '../utils/cn';
import { useWorkspaceStore } from '../features/workspace/store/workspaceStore';
import { useChatStore } from '../features/chat/store/chatStore';

interface PlanStage {
  id: string;
  number: string;
  title: string;
  category: 'ingestion' | 'transformation' | 'mart' | 'virtualization';
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

const DEFAULT_STAGES: PlanStage[] = [
  {
    id: 'stage-1',
    number: '01',
    title: 'Raw Source Ingestion & Bronze Staging',
    category: 'ingestion',
    description:
      'Virtualize and extract raw transaction streams from transactional databases into an immutable bronze delta lake staging zone.',
    tables: ['stg_raw_transactions', 'stg_customer_events', 'stg_inventory_levels'],
    technologies: ['PostgreSQL', 'Stripe API', 'Zetaris Connector'],
  },
  {
    id: 'stage-2',
    number: '02',
    title: 'Data Cleansing, Deduplication & SCD-2',
    category: 'transformation',
    description:
      'Apply business sanitization, resolve surrogate foreign keys, deduplicate order idempotency tokens, and construct SCD Type-2 historical timeline records.',
    tables: ['transform_orders_clean', 'transform_scd2_customers', 'transform_currency_norm'],
    technologies: ['SQL dbt', 'Python / PySpark', 'DuckDB Engine'],
  },
  {
    id: 'stage-3',
    number: '03',
    title: 'Curated Dimensional Star Schema (Silver/Gold)',
    category: 'mart',
    description:
      'Assemble Kimball-style dimensional model featuring high-velocity Fact tables surrounded by conformed Dimensions with pre-calculated metrics.',
    tables: ['fact_daily_revenue', 'dim_customer_360', 'dim_product_sku', 'dim_calendar'],
    technologies: ['Snowflake Lakehouse', 'Star Schema DDL'],
  },
  {
    id: 'stage-4',
    number: '04',
    title: 'Unified Zetaris SQL Virtualization Endpoint',
    category: 'virtualization',
    description:
      'Publish unified multi-cloud federated SQL view with zero-copy caching, role-based column masking, and sub-second BI aggregations.',
    tables: ['v_bi_executive_sales', 'v_customer_retention_cohorts'],
    technologies: ['Zetaris Lakehouse Gateway', 'ANSI SQL-92'],
  },
];

const CLARIFYING_QUESTIONS: ClarifyingQuestion[] = [
  {
    id: 'scd-strategy',
    question: 'How should historical customer profile mutations be preserved?',
    context:
      'Customer addresses and credit tiers change over time. Choose how downstream reporting tracks changes.',
    options: [
      {
        id: 'scd-2',
        label: '(Recommended) SCD Type 2 (Historical timeline with valid_from / valid_to)',
        description:
          'Maintains complete historical records for point-in-time auditability and retroactive cohort analysis.',
        isRecommended: true,
      },
      {
        id: 'scd-1',
        label: 'SCD Type 1 (Overwrite with latest values)',
        description: 'Overwrites existing fields in-place. Simplest storage footprint, but loses previous states.',
      },
      {
        id: 'append-only',
        label: 'Immutable Event Log (Append-Only Delta)',
        description: 'Every edit is stored as a distinct immutable event with monotonic sequence IDs.',
      },
    ],
  },
  {
    id: 'ingestion-frequency',
    question: 'What is the required data freshness SLA for revenue reporting?',
    context: 'Dictates whether the pipeline triggers on a schedule or streams continuously.',
    options: [
      {
        id: 'microbatch-15m',
        label: '(Recommended) 15-Minute Micro-batch',
        description: 'Strikes the ideal balance between low latency and cloud warehouse compute efficiency.',
        isRecommended: true,
      },
      {
        id: 'hourly-batch',
        label: 'Hourly Batch Ingestion',
        description: 'Cost-optimized scheduled sync with predictable execution windows.',
      },
      {
        id: 'streaming-realtime',
        label: 'Continuous Real-Time Streaming (< 30s)',
        description: 'Low-latency CDC (Change Data Capture) with active streaming workers.',
      },
    ],
  },
  {
    id: 'data-quality-strategy',
    question: 'How should schema drifts and malformed payload records be handled?',
    context: 'Defines error boundaries when external source APIs introduce unexpected nulls or types.',
    options: [
      {
        id: 'quarantine-dlq',
        label: '(Recommended) Quarantine to Dead-Letter Queue (DLQ)',
        description: 'Quarantines failed rows to a review table without stopping the main pipeline flow.',
        isRecommended: true,
      },
      {
        id: 'strict-fail',
        label: 'Strict Fail-Fast (Halt Execution)',
        description: 'Immediately halts the stage and alerts data engineers on any constraint violation.',
      },
      {
        id: 'impute-defaults',
        label: 'Auto-Coalesce & Impute Default Constants',
        description: 'Replaces missing values with predefined fallback constants and logs an audit warning.',
      },
    ],
  },
];

/**
 * Live Simulation Steps:
 * 0: Initial prompt analysis & connection
 * 1: Phase 1: Source Discovery & Profiling
 * 2: Phase 2: Architectural Modeling
 * 3: Phase 3: Pre-flight & Constraints
 * 4: Plan Synthesis Revealed
 * 5: Clarifying Questions & Actions Fully Interactive
 */
export function PlanProposalPage() {
  const [liveStep, setLiveStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'architecture' | 'ddl' | 'impact'>('architecture');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({
    'scd-strategy': 'scd-2',
    'ingestion-frequency': 'microbatch-15m',
    'data-quality-strategy': 'quarantine-dlq',
  });

  const [expandedThought, setExpandedThought] = useState<boolean>(true);
  const [refinementText, setRefinementText] = useState('');
  const [refinementsList, setRefinementsList] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState(false);

  const setProjectName = useWorkspaceStore((s) => s.setProjectName);
  const chatMessages = useChatStore((s) => s.messages);
  const userPrompt =
    [...chatMessages].reverse().find((m) => m.sender === 'user')?.text ||
    'Build an end-to-end data lakehouse pipeline connecting PostgreSQL transactions, Stripe payment events, and customer dimension analytics into a Star Schema with Zetaris virtualization.';

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live animation sequence simulation
  useEffect(() => {
    if (!isSimulating) return;

    if (liveStep === 0) {
      timerRef.current = setTimeout(() => setLiveStep(1), 900);
    } else if (liveStep === 1) {
      timerRef.current = setTimeout(() => setLiveStep(2), 1400);
    } else if (liveStep === 2) {
      timerRef.current = setTimeout(() => setLiveStep(3), 1400);
    } else if (liveStep === 3) {
      timerRef.current = setTimeout(() => {
        setLiveStep(4);
      }, 1200);
    } else if (liveStep === 4) {
      timerRef.current = setTimeout(() => {
        setLiveStep(5);
        setIsSimulating(false);
      }, 900);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [liveStep, isSimulating]);

  const handleRestartAnimation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLiveStep(0);
    setIsSimulating(true);
    setExpandedThought(true);
  };

  const handleSkipAnimation = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLiveStep(5);
    setIsSimulating(false);
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleAddRefinement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementText.trim()) return;
    setRefinementsList((prev) => [...prev, refinementText.trim()]);
    setRefinementText('');
  };

  const handleApprovePlan = () => {
    setIsApproving(true);
    setProjectName('Retail Lakehouse Master Pipeline');
    setTimeout(() => {
      navigateTo('/workspace');
    }, 450);
  };

  return (
    <div
      style={{ backgroundColor: '#FDFFFC' }}
      className="min-h-screen w-full flex flex-col font-sans text-[#334139] selection:bg-[#064C1C]/15 antialiased"
    >
      {/* Top Navigation Bar: Seamless Porcelain with 80% Gradient */}
      <header
        style={{
          background:
            'linear-gradient(to bottom, rgba(253, 255, 252, 0.95) 0%, rgba(253, 255, 252, 0.8) 70%, transparent 100%)',
        }}
        className="w-full flex items-center justify-between px-6 py-4 shrink-0 sticky top-0 z-40 backdrop-blur-xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
            aria-label="Return to Agent Home"
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

          <span className="text-[#334139]/30">/</span>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#334139]">
            <span className="font-mono text-[#064C1C] font-bold">Proposal</span>
            <span className="text-[#334139]/40">•</span>
            {isSimulating ? (
              <span className="flex items-center gap-1.5 text-[#D66F14] font-mono animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                <span>AI Analyzing & Synthesizing...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#064C1C] font-mono">
                <CheckCircle2 size={12} />
                <span>Plan Ready & Verified</span>
              </span>
            )}
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2">
          {isSimulating ? (
            <button
              type="button"
              onClick={handleSkipAnimation}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#D66F14]/10 text-[#D66F14] hover:bg-[#D66F14]/20 transition-colors cursor-pointer"
              title="Skip live animation"
            >
              <FastForward size={13} />
              <span>Fast Forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRestartAnimation}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
              title="Re-run live simulation"
            >
              <RotateCcw size={13} />
              <span>Replay Live</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigateTo('/components')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
          >
            <Sliders size={13} />
            <span className="hidden sm:inline">Design Tokens</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('/workspace')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
          >
            <Workflow size={13} />
            <span>Workspace</span>
          </button>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-6 space-y-7 pb-32">
        {/* User Prompt / Intent Card */}
        <section className="p-5 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#064C1C] uppercase tracking-wider flex items-center gap-1.5">
              <Bot size={14} className="text-[#064C1C]" />
              User Architectural Intent
            </span>
            <span className="text-[10px] text-[#334139]/50 font-mono">
              Step 1 of 3: Planning & Validation
            </span>
          </div>
          <p className="text-sm md:text-base font-medium text-[#334139] leading-relaxed">
            "{userPrompt}"
          </p>
        </section>

        {/* Live Simulation Progress Banner */}
        {isSimulating && (
          <div className="p-3.5 rounded-2xl bg-[#D66F14]/8 border border-[#D66F14]/25 flex items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D66F14] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D66F14]" />
              </span>
              <span className="font-mono font-bold text-[#D66F14]">
                {liveStep === 0 && 'Decomposing architectural prompt...'}
                {liveStep === 1 && 'Profiling data sources & discovering foreign keys...'}
                {liveStep === 2 && 'Evaluating Star Schema trade-offs & staging layers...'}
                {liveStep === 3 && 'Verifying constraints & compiling Zetaris DDL...'}
                {liveStep === 4 && 'Generating final architectural proposal...'}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#334139]/60">
              <span>Stage {Math.min(liveStep + 1, 4)} / 4</span>
            </div>
          </div>
        )}

        {/* AI Thought Process & Live Analysis Section (Transparent & Borderless Bullets) */}
        <section className="rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm overflow-hidden transition-all">
          <div
            onClick={() => setExpandedThought(!expandedThought)}
            className="px-5 py-4 border-b border-[#334139]/12 flex items-center justify-between cursor-pointer select-none bg-[#FDFFFC]"
          >
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: isSimulating ? '#D66F14' : '#064C1C' }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#FDFFFC] shadow-2xs transition-colors shrink-0"
              >
                {isSimulating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Brain size={16} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#334139]">
                    AI Thinking & Analysis Process
                  </h2>
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-colors',
                      isSimulating
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    )}
                  >
                    {isSimulating ? 'Streaming Live Trace' : 'Transparent Trace • Verified'}
                  </span>
                </div>
                <p className="text-[11px] text-[#334139]/60 font-mono">
                  {liveStep < 4
                    ? `Reasoning step ${liveStep} active...`
                    : '4 analytical reasoning stages completed with automated constraint profiling'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="text-[#334139]/50 hover:text-[#334139] transition-colors p-1"
              aria-label="Toggle AI thoughts breakdown"
            >
              {expandedThought ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {expandedThought && (
            <div className="p-5 space-y-4 text-xs font-sans">
              {/* Bullet Stage 1 */}
              {liveStep >= 1 && (
                <div className="space-y-1 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#064C1C] leading-none">•</span>
                    <h3 className="font-bold text-[#334139] text-xs flex items-center gap-2">
                      <span>Phase 1: Source Discovery & Schema Profiling</span>
                      {liveStep === 1 && (
                        <span className="text-[9px] font-mono text-[#D66F14] bg-[#D66F14]/10 px-1.5 py-0.5 rounded animate-pulse">
                          Running
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="pl-4 space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#334139]/70 flex items-center gap-1.5">
                      <PlayCircle size={11} className="text-[#064C1C]" />
                      <span>Execution steps:</span>
                    </div>
                    <ul className="space-y-1 pl-1 text-[11px] text-[#334139]/80 font-mono">
                      <li className="flex items-center gap-1.5">
                        <span className="text-[#334139]/40">•</span>
                        <code className="text-[#064C1C] bg-[#064C1C]/8 px-1.5 py-0.5 rounded flex items-center gap-1">
                          {liveStep === 1 ? <Loader2 size={10} className="animate-spin text-[#D66F14]" /> : null}
                          executing source_catalog_inspector.py...
                        </code>
                      </li>
                      {liveStep >= 2 && (
                        <li className="flex items-center gap-1.5 animate-fadeIn">
                          <span className="text-[#334139]/40">•</span>
                          <code className="text-[#064C1C] bg-[#064C1C]/8 px-1.5 py-0.5 rounded">
                            executing postgres_foreign_keys_profiler.sql...
                          </code>
                        </li>
                      )}
                    </ul>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D66F14] flex items-center gap-1.5 pt-1">
                      <Brain size={11} className="text-[#D66F14]" />
                      <span>Thought process:</span>
                    </div>
                    <p className="text-[11.5px] text-[#334139]/85 leading-relaxed pl-1">
                      Identified transactional PostgreSQL cluster and Stripe payment event payloads. Detected candidate primary keys on `customer_id` and idempotency tokens on `stripe_charge_id`. Determined zero-copy federation approach via Zetaris gateway to avoid redundant database strain.
                    </p>
                  </div>
                </div>
              )}

              {/* Bullet Stage 2 */}
              {liveStep >= 2 && (
                <div className="space-y-1 pt-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#064C1C] leading-none">•</span>
                    <h3 className="font-bold text-[#334139] text-xs flex items-center gap-2">
                      <span>Phase 2: Architectural Modeling & Dimensional Trade-off Evaluation</span>
                      {liveStep === 2 && (
                        <span className="text-[9px] font-mono text-[#D66F14] bg-[#D66F14]/10 px-1.5 py-0.5 rounded animate-pulse">
                          Running
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="pl-4 space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#334139]/70 flex items-center gap-1.5">
                      <PlayCircle size={11} className="text-[#064C1C]" />
                      <span>Execution steps:</span>
                    </div>
                    <ul className="space-y-1 pl-1 text-[11px] text-[#334139]/80 font-mono">
                      <li className="flex items-center gap-1.5">
                        <span className="text-[#334139]/40">•</span>
                        <code className="text-[#064C1C] bg-[#064C1C]/8 px-1.5 py-0.5 rounded flex items-center gap-1">
                          {liveStep === 2 ? <Loader2 size={10} className="animate-spin text-[#D66F14]" /> : null}
                          executing star_schema_generator.sql...
                        </code>
                      </li>
                    </ul>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D66F14] flex items-center gap-1.5 pt-1">
                      <Brain size={11} className="text-[#D66F14]" />
                      <span>Thought process:</span>
                    </div>
                    <p className="text-[11.5px] text-[#334139]/85 leading-relaxed pl-1">
                      Evaluated Inmon 3NF vs Kimball Star Schema. Because user requests sales & customer metrics, chosen Kimball architecture with a high-performance central Fact table (`fact_daily_revenue`) surrounded by conformed Dimensions (`dim_customer_360`, `dim_product_sku`). Added SCD Type-2 tracking recommendation to preserve customer history accurately.
                    </p>
                  </div>
                </div>
              )}

              {/* Bullet Stage 3 */}
              {liveStep >= 3 && (
                <div className="space-y-1 pt-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#064C1C] leading-none">•</span>
                    <h3 className="font-bold text-[#334139] text-xs flex items-center gap-2">
                      <span>Phase 3: Pre-flight Verification & Constraint Checking</span>
                      {liveStep === 3 && (
                        <span className="text-[9px] font-mono text-[#D66F14] bg-[#D66F14]/10 px-1.5 py-0.5 rounded animate-pulse">
                          Running
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="pl-4 space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#334139]/70 flex items-center gap-1.5">
                      <PlayCircle size={11} className="text-[#064C1C]" />
                      <span>Execution steps:</span>
                    </div>
                    <ul className="space-y-1 pl-1 text-[11px] text-[#334139]/80 font-mono">
                      <li className="flex items-center gap-1.5">
                        <span className="text-[#334139]/40">•</span>
                        <code className="text-[#064C1C] bg-[#064C1C]/8 px-1.5 py-0.5 rounded flex items-center gap-1">
                          {liveStep === 3 ? <Loader2 size={10} className="animate-spin text-[#D66F14]" /> : null}
                          executing nullability_constraints_verifier.py...
                        </code>
                      </li>
                      {liveStep >= 4 && (
                        <li className="flex items-center gap-1.5 animate-fadeIn">
                          <span className="text-[#334139]/40">•</span>
                          <code className="text-[#064C1C] bg-[#064C1C]/8 px-1.5 py-0.5 rounded">
                            executing ddl_syntax_compiler.sql...
                          </code>
                        </li>
                      )}
                    </ul>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D66F14] flex items-center gap-1.5 pt-1">
                      <Brain size={11} className="text-[#D66F14]" />
                      <span>Thought process:</span>
                    </div>
                    <p className="text-[11.5px] text-[#334139]/85 leading-relaxed pl-1">
                      Verified foreign key reference consistency between dimension surrogate keys and fact inlets. Generated clean ANSI DDL with appropriate primary key constraints, indexing strategies, and automated partitioned date dimensions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Proposed Architecture Plan Section: Cascades in when liveStep >= 4 */}
        {liveStep >= 4 && (
          <section className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#334139] flex items-center gap-2">
                  <span>Proposed Pipeline Architecture</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Generated
                  </span>
                </h2>
                <p className="text-xs text-[#334139]/60">
                  End-to-end data flow designed for fault-tolerance, zero-copy querying, and Kimball analytics.
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center bg-[#334139]/8 p-1 rounded-xl shrink-0 self-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('architecture')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                    activeTab === 'architecture'
                      ? 'bg-white text-[#334139] shadow-xs'
                      : 'text-[#334139]/60 hover:text-[#334139]'
                  )}
                >
                  Stages (4)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ddl')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                    activeTab === 'ddl'
                      ? 'bg-white text-[#334139] shadow-xs'
                      : 'text-[#334139]/60 hover:text-[#334139]'
                  )}
                >
                  DDL Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('impact')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                    activeTab === 'impact'
                      ? 'bg-white text-[#334139] shadow-xs'
                      : 'text-[#334139]/60 hover:text-[#334139]'
                  )}
                >
                  Compute & SLA
                </button>
              </div>
            </div>

            {/* Architecture Stages Grid */}
            {activeTab === 'architecture' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEFAULT_STAGES.map((stage, idx) => (
                  <div
                    key={stage.id}
                    style={{ animationDelay: `${idx * 120}ms` }}
                    className="p-5 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm space-y-3 flex flex-col justify-between animate-fadeIn hover:border-[#064C1C]/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#064C1C]/10 text-[#064C1C]">
                          STAGE {stage.number}
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D66F14]">
                          {stage.category}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-[#334139]">
                        {stage.title}
                      </h3>

                      <p className="text-xs text-[#334139]/70 leading-relaxed">
                        {stage.description}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-3 border-t border-[#334139]/10">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-[#334139]/50 block mb-1">
                          Synthesized Tables ({stage.tables.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {stage.tables.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-md bg-[#334139]/5 text-[10.5px] font-mono font-semibold text-[#334139]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-[#334139]/50 block mb-1">
                          Engine & Target
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {stage.technologies.map((tech) => (
                            <span
                              key={tech}
                              className="px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-800 border border-emerald-200"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DDL Schema Preview Tab */}
            {activeTab === 'ddl' && (
              <div className="p-5 rounded-2xl md:rounded-3xl bg-[#1E2D24] text-[#FDFFFC] font-mono text-xs space-y-3 shadow-sm custom-scrollbar overflow-x-auto animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] text-[#FDFFFC]/60 border-b border-[#FDFFFC]/15 pb-2">
                  <span>-- Compiled Target Lakehouse DDL (Zetaris & Snowflake dialect)</span>
                  <span className="text-[#D66F14]">ANSI SQL-92</span>
                </div>
                <pre className="text-[11px] leading-relaxed text-emerald-300">
{`-- Stage 1: Bronze Staging Table
CREATE TABLE stg_raw_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    event_timestamp TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stage 2 & 3: Conformed SCD Type-2 Customer Dimension
CREATE TABLE dim_customer_360 (
    customer_key BIGINT PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    customer_name VARCHAR(255),
    tier VARCHAR(50),
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP,
    is_current BOOLEAN DEFAULT TRUE
);

-- Central Fact Table
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

            {/* Compute & SLA Tab */}
            {activeTab === 'impact' && (
              <div className="p-6 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fadeIn">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-[#334139]/60 uppercase">Data Freshness SLA</span>
                  <p className="text-2xl font-bold text-[#064C1C]">15 Min</p>
                  <p className="text-xs text-[#334139]/70 leading-snug">Micro-batch cadence via automated Zetaris change listeners.</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-[#334139]/60 uppercase">Data Nodes Generated</span>
                  <p className="text-2xl font-bold text-[#334139]">9 Nodes</p>
                  <p className="text-xs text-[#334139]/70 leading-snug">3 Sources, 2 Transforms, 4 Curated Analytics Marts.</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-[#334139]/60 uppercase">Zero-Copy Virtualization</span>
                  <p className="text-2xl font-bold text-[#D66F14]">Enabled</p>
                  <p className="text-xs text-[#334139]/70 leading-snug">Zetaris gateway federates live without duplicating data lakes.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Clarifying Questions & Architectural Decision Matrix: Cascades in when liveStep >= 5 */}
        {liveStep >= 5 && (
          <section className="space-y-4 animate-fadeIn">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-[#D66F14]" />
                <h2 className="text-lg font-bold text-[#334139]">
                  Architectural Clarifying Questions
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#D66F14]/10 text-[#D66F14]">
                  3 Decisions Needed
                </span>
              </div>
              <p className="text-xs text-[#334139]/60">
                The AI architect identified critical design choices. Select your preferred options before building.
              </p>
            </div>

            <div className="space-y-4">
              {CLARIFYING_QUESTIONS.map((q, idx) => (
                <div
                  key={q.id}
                  style={{ animationDelay: `${idx * 150}ms` }}
                  className="p-5 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm space-y-3 animate-fadeIn"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#D66F14]">
                        QUESTION 0{idx + 1}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#334139]">
                      {q.question}
                    </h3>
                    <p className="text-xs text-[#334139]/60 leading-relaxed">
                      {q.context}
                    </p>
                  </div>

                  {/* Options Choice Pills / Cards */}
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = selectedAnswers[q.id] === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(q.id, opt.id)}
                          className={cn(
                            'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none',
                            isSelected
                              ? 'border-[#064C1C] bg-[#064C1C]/5 ring-1 ring-[#064C1C]'
                              : 'border-[#334139]/15 hover:border-[#334139]/30 bg-white'
                          )}
                        >
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                              isSelected
                                ? 'bg-[#064C1C] text-white'
                                : 'border border-[#334139]/30 bg-transparent'
                            )}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-[#334139]">
                                {opt.label}
                              </span>
                              {opt.isRecommended && (
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#D66F14] text-white">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#334139]/70 mt-0.5 leading-relaxed">
                              {opt.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Refinements & User Feedback Section: Cascades in when liveStep >= 5 */}
        {liveStep >= 5 && (
          <section className="p-5 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#334139] flex items-center gap-2">
                <Bot size={15} className="text-[#064C1C]" />
                Need to adjust this plan?
              </h3>
              <span className="text-[10px] font-mono text-[#334139]/50">
                Live Interactive Prompting
              </span>
            </div>
            <p className="text-xs text-[#334139]/70 leading-relaxed">
              Provide additional constraints or requirements (e.g. "Also calculate monthly customer churn rate" or "Add Snowflake staging").
            </p>

            {/* User Added Refinements List */}
            {refinementsList.length > 0 && (
              <div className="space-y-1.5 py-1">
                {refinementsList.map((refine, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2"
                  >
                    <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                    <span className="font-medium">Applied constraint: "{refine}"</span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddRefinement} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={refinementText}
                onChange={(e) => setRefinementText(e.target.value)}
                placeholder="e.g., Include customer cohort retention matrix and currency conversion..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#334139]/20 text-xs font-sans text-[#334139] placeholder:text-[#334139]/40 outline-none focus:border-[#064C1C] focus:ring-2 focus:ring-[#064C1C]/10 transition-all bg-[#FDFFFC]"
              />
              <button
                type="submit"
                disabled={!refinementText.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#334139] hover:bg-[#1E2D24] disabled:opacity-40 text-white transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>Refine</span>
              </button>
            </form>
          </section>
        )}
      </main>

      {/* Sticky Bottom Action Dock */}
      <footer
        style={{ backgroundColor: '#FDFFFC' }}
        className="fixed bottom-0 left-0 right-0 py-3.5 px-6 border-t border-[#334139]/15 shadow-xl z-40 backdrop-blur-md"
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#334139]">
            {isSimulating ? (
              <>
                <Loader2 size={14} className="animate-spin text-[#D66F14]" />
                <span className="font-semibold text-[#D66F14]">
                  AI Data Architect is formulating proposal...
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-[#064C1C]">
                  Architecture Plan Ready for Canvas Synthesis
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleApprovePlan}
              disabled={isSimulating || isApproving}
              style={{ backgroundColor: isSimulating ? '#334139' : '#064C1C' }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-[#FDFFFC] hover:brightness-110 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isApproving ? 'Building Pipeline...' : 'Approve & Build Pipeline'}</span>
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
