import { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronsUpDown,
  Workflow,
  ArrowUpRight,
  Loader2,
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
  FileCode,
  FileText,
  Sparkles,
  Database,
  TrendingUp,
  Lightbulb,
  Wifi,
  WifiOff,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { navigateTo } from "../utils/navigation";
import { cn } from "../utils/cn";
import { Dropdown } from "../components/ui";
import { useWorkspaceStore } from "../features/workspace/store/workspaceStore";
import { useChatStore } from "../features/chat/store/chatStore";
import { usePipelineStore } from "../features/workspace/store/pipelineStore";
import { useBackendStore } from "../services/session/backendSession";
import { useHistoryStore } from "../features/history/store/historyStore";
import { pipelineApi } from "../services/api/pipelineApi";
import { toBackendNode } from "../services/mapping/backendGraphMapper";
import { WorkspacePromptBar } from "../features/workspace/components/WorkspacePromptBar";
import {
  usePlanStore,
  INITIAL_PLAN_MARKDOWN,
} from "../features/uiop/store/planStore";
import { Markdown } from "../features/chat/components/Markdown";
import { createUiopEnvelope } from "../features/uiop/adapter/promptToUiopAdapter";
import { executeUiop } from "../features/uiop/runtime/uiopRuntime";
import type { KpiDefinition, ReasoningPhase } from "../contracts/uiop";
import logoUrl from "../assets/logo.png";

export type { KpiDefinition };

export function PlanProposalPage() {
  const [liveStep, setLiveStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    {},
  );

  // 45% - 60% Docked side panel state
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [panelTab, setPanelTab] = useState<"overview" | "audit" | "ddl">(
    "overview",
  );
  const [copiedFormat, setCopiedFormat] = useState<
    "sql" | "json" | "plan" | null
  >(null);

  // Stepped questions state & completion tracker
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [questionsFinished, setQuestionsFinished] = useState<boolean>(false);

  // Plan & Clarifying Questions state managed via UIOP store
  const stages = usePlanStore((s) => s.stages);
  const reasoningPhases = usePlanStore((s) => s.reasoningPhases);
  const questions = usePlanStore((s) => s.questions);
  const selectedAnswers = usePlanStore((s) => s.selectedAnswers);
  const kpis = usePlanStore((s) => s.kpis);
  const selectedKpiIds = usePlanStore((s) => s.selectedKpiIds);
  const compiledSql = usePlanStore((s) => s.compiledSql);
  const planMarkdown =
    usePlanStore((s) => s.planMarkdown) || INITIAL_PLAN_MARKDOWN;
  const toggleKpiSelection = usePlanStore((s) => s.toggleKpiSelection);
  const isPlanning = usePlanStore((s) => s.isPlanning);
  const planError = usePlanStore((s) => s.planError);

  const [customPromptOverride, setCustomPromptOverride] = useState<
    string | null
  >(null);

  const [isApproving, setIsApproving] = useState(false);

  const setProjectName = useWorkspaceStore((s) => s.setProjectName);
  const chatMessages = useChatStore((s) => s.messages);
  const isOnline = useBackendStore((s) => s.isOnline);
  const planTitle = usePlanStore((s) => s.planTitle);
  const userPrompt =
    customPromptOverride ||
    [...chatMessages].reverse().find((m) => m.sender === "user")?.text ||
    (isOnline
      ? planTitle || "Awaiting architectural prompt..."
      : "Build an end-to-end data lakehouse pipeline connecting PostgreSQL transactions, Stripe payment events, and customer dimension analytics into a Star Schema with Zetaris virtualization.");

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
    } else if (liveStep === 4 && !isPlanning) {
      // While the planner agent works on the backend, stay on this step.
      timerRef.current = setTimeout(() => {
        setLiveStep(5);
        setIsSimulating(false);
      }, 850);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [liveStep, isSimulating, isPlanning]);

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
        behavior: "smooth",
      });
    }
  }, [liveStep, activeQuestionIndex, questionsFinished]);

  // Phase collapse logic
  const isPhaseOpen = (phase: ReasoningPhase) =>
    expandedPhases[phase.id] ?? liveStep === phase.stepIndex;

  const togglePhase = (phase: ReasoningPhase) => {
    setExpandedPhases((prev) => ({ ...prev, [phase.id]: !isPhaseOpen(phase) }));
  };

  const visiblePhases = reasoningPhases.filter((p) => liveStep >= p.stepIndex);
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
    executeUiop(
      createUiopEnvelope(
        [
          {
            op: "question.answer",
            params: { id: questionId, optionId },
          },
        ],
        "user-decision-agent",
      ),
    );
    if (useBackendStore.getState().isOnline) {
      void useBackendStore.getState().answerQuestion(questionId, optionId);
    }
  };

  const selectedKpis = kpis.filter((k) => selectedKpiIds.includes(k.id));

  const handleNextQuestion = () => {
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else {
      setQuestionsFinished(true);
    }
  };

  const handleSkipQuestion = () => {
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else {
      setQuestionsFinished(true);
    }
  };

  const handleSkipAllQuestions = () => {
    setQuestionsFinished(true);
  };

  const handleApprovePlan = async () => {
    setIsApproving(true);
    const backendStore = useBackendStore.getState();
    const targetName =
      backendStore.activePipeline?.name ||
      usePlanStore.getState().planTitle ||
      "Data Lakehouse Pipeline";
    setProjectName(targetName);

    if (backendStore.isOnline) {
      try {
        let pipelineId = backendStore.activePipelineId;
        if (!pipelineId) {
          const newPipe = await backendStore.createPipeline(targetName);
          pipelineId = newPipe?.id || null;
        }

        if (pipelineId) {
          await pipelineApi.updatePipeline(pipelineId, {
            status: "ACTIVE",
            architecture_design: {
              stages: stages.map((s) => ({
                id: s.id,
                title: s.title,
                category: s.category,
                tables: s.tables,
              })),
              decisions: selectedAnswers,
              kpiCount: selectedKpiIds.length,
            },
          });

          // Sync initial pipeline nodes to backend if available and not mock seed data
          const pipeState = usePipelineStore.getState();
          const localNodes = pipeState.isMockSeedData ? [] : pipeState.nodes;
          for (const node of localNodes) {
            try {
              const bNode = toBackendNode(node);
              await pipelineApi.createNode(pipelineId, bNode);
            } catch {
              // Ignore if already created
            }
          }
        }
      } catch (err) {
        console.warn(
          "Backend sync during plan approval failed, proceeding with local canvas:",
          err,
        );
      }
    }

    setTimeout(() => {
      navigateTo("/workspace");
    }, 400);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([planMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aurabi_pipeline_plan.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSql = () => {
    const blob = new Blob([compiledSql], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aurabi_pipeline_plan.sql";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const planPayload = {
      name: "Retail Lakehouse Master Pipeline",
      generatedAt: new Date().toISOString(),
      prompt: userPrompt,
      stages,
      decisions: selectedAnswers,
      auditAgent: {
        role: "Independent Audit Agent",
        separationOfDuties:
          "Author-isolated from Builder Agents; read-only verification context",
        presentationFormat: selectedAnswers["audit-presentation-format"],
        verifiedKpis: selectedKpis,
      },
      sql: compiledSql,
      markdown: planMarkdown,
    };
    const blob = new Blob([JSON.stringify(planPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aurabi_pipeline_plan.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(compiledSql);
    setCopiedFormat("sql");
    setTimeout(() => setCopiedFormat(null), 1600);
  };

  const handleCopyContent = async () => {
    const textToCopy = panelTab === "ddl" ? compiledSql : planMarkdown;
    await navigator.clipboard.writeText(textToCopy);
    setCopiedFormat(panelTab === "ddl" ? "sql" : "plan");
    setTimeout(() => setCopiedFormat(null), 1600);
  };

  const handlePromptSubmit = (text: string) => {
    setCustomPromptOverride(text);
    // Synthesize a domain KPI & update plan via UIOP
    const cleaned = text.trim();
    const customId = `custom-kpi-${Date.now()}`;
    const newKpi: KpiDefinition = {
      id: customId,
      name: cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned,
      category: "Custom",
      formula: "SUM(verified_measure) OVER (PARTITION BY date_key)",
      sourceSystem: "Raw Ingestion Ledger",
      targetMart: "fact_daily_revenue",
      sourceLedgerValue: "$1,240,000.00",
      martOutputValue: "$1,240,000.00",
      variance: "$0.00 (0.00%)",
      tolerance: "±0.00%",
      description: `User-prompted KPI included in automated reconciliation checks: "${cleaned}"`,
    };
    executeUiop(
      createUiopEnvelope(
        [
          {
            op: "plan.update",
            params: {
              prompt: cleaned,
              kpis: [...kpis, newKpi],
              selectedKpiIds: [...selectedKpiIds, customId],
            },
          },
        ],
        "planner-agent",
      ),
    );
    setIsSimulating(true);
    setLiveStep(1);
    setElapsed(0);
    setQuestionsFinished(false);
  };

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const currentQuestion = questions[activeQuestionIndex];
  const isLastQuestion = activeQuestionIndex === questions.length - 1;
  const isFirstQuestion = activeQuestionIndex === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={{ backgroundColor: "#FDFFFC" }}
      className="h-screen w-screen flex flex-col font-sans text-[#334139] selection:bg-[#064C1C]/15 antialiased overflow-hidden"
    >
      {/* Pinned Top Header with Porcelain Gradient (No Border) */}
      <header
        style={{
          background:
            "linear-gradient(to bottom, rgba(253, 255, 252, 1) 0%, rgba(253, 255, 252, 0.95) 60%, rgba(253, 255, 252, 0) 100%)",
        }}
        className="w-full px-6 pt-3.5 pb-6 flex items-center justify-between shrink-0 z-20 pointer-events-auto"
      >
        <div
          onClick={() => navigateTo("/")}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
          aria-label="Return to Welcome Page"
        >
          <img
            src={logoUrl}
            alt="AuraBI"
            className="w-7 h-7 object-contain drop-shadow-2xs select-none"
          />
          <span className="font-bold text-base tracking-tight text-[#334139]">
            AuraBI
          </span>
          <span
            style={{ backgroundColor: "#D66F14" }}
            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider ml-1"
          >
            Agent First
          </span>
        </div>

        <nav className="flex items-center gap-1.5">
          {/* Connection Status Pill (click to re-check, alt-click to toggle) */}
          <button
            type="button"
            onClick={(e) => {
              if (e.altKey) {
                useBackendStore.getState().toggleOnlineMode();
              } else {
                void useBackendStore.getState().checkHealth();
              }
            }}
            title={
              useBackendStore((s) => s.isOnline)
                ? "Connected to FastAPI Backend (8000) — click to re-check, alt-click to toggle"
                : "FastAPI Backend Offline (Running in Local Mode) — click to re-check, alt-click to toggle"
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-[#334139]/15 bg-white/70 hover:bg-white cursor-pointer transition-colors"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: useBackendStore((s) => s.isOnline)
                  ? "#10B981"
                  : "#9CA3AF",
              }}
            />
            {useBackendStore((s) => s.isOnline) ? (
              <span className="flex items-center gap-1 text-[#064C1C] font-mono text-[10px]">
                <Wifi size={10} />
                <span>ONLINE</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-500 font-mono text-[10px]">
                <WifiOff size={10} />
                <span>LOCAL</span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => useHistoryStore.getState().openHistory('revisions')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
            title="View Project History & Revisions"
          >
            <History size={13} />
            <span>History</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo("/workspace")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
          >
            <Workflow size={13} />
            <span>Workspace</span>
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
            <div
              className={cn(
                "w-full mx-auto space-y-8 pb-10 transition-all",
                isPanelOpen ? "max-w-2xl" : "max-w-3xl",
              )}
            >
              {/* User Prompt Editorial Lead */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  {isSimulating ? (
                    <div className="flex items-center gap-2 text-[#D66F14] font-medium">
                      <Loader2 size={14} className="animate-spin shrink-0" />
                      <span>Analyzing… {formatElapsed(elapsed)}</span>
                      <span className="text-[#334139]/40">·</span>
                      <span className="text-[#334139]/70 font-normal">
                        {liveStep === 0 && "Decomposing architectural prompt"}
                        {liveStep === 1 && "Profiling sources & foreign keys"}
                        {liveStep === 2 && "Modeling dimensional star schema"}
                        {liveStep === 3 &&
                          "Verifying constraints & compiling DDL"}
                        {liveStep === 4 &&
                          (isPlanning
                            ? "Nemotron is designing the plan from the Zetaris catalog and measuring each KPI on Zetaris (1–3 min)"
                            : "Synthesizing domain KPIs & architectural recommendations")}
                      </span>
                    </div>
                  ) : planError ? (
                    <div className="flex items-center gap-2 text-[#B42318] font-medium">
                      <X size={14} strokeWidth={3} className="shrink-0" />
                      <span>The planner agent could not produce a plan</span>
                      <span className="text-[#334139]/40">·</span>
                      <span className="text-[#334139]/70 font-normal">{planError}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#064C1C] font-medium">
                      <Check size={14} strokeWidth={3} className="shrink-0" />
                      <span>
                        {questionsFinished
                          ? "Architecture blueprint & proposed KPIs synthesized"
                          : "KPI selection & architectural decisions required"}
                      </span>
                      <span className="text-[#334139]/40">·</span>
                      <span className="text-[#334139]/65 font-normal">
                        {questionsFinished
                          ? `${selectedKpis.length} KPIs proposed for pipeline build`
                          : `${questions.length} decisions pending`}
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
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-[#334139]/12">
                    <div className="flex items-center gap-2">
                      <img
                        src={logoUrl}
                        alt="AuraBI"
                        className="w-5 h-5 object-contain select-none shrink-0"
                      />
                      <span className="text-sm font-bold text-[#334139]">
                        AI Thought Process
                      </span>
                      <span className="text-xs text-[#334139]/60">
                        {visiblePhases.length} of {reasoningPhases.length}{" "}
                        phases
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={toggleAllPhases}
                      className="inline-flex items-center gap-1 text-xs text-[#334139]/65 hover:text-[#334139] transition-colors cursor-pointer py-0.5 px-2 rounded hover:bg-[#334139]/5 font-medium"
                    >
                      <ChevronsUpDown size={13} />
                      <span>
                        {allPhasesCollapsed ? "Expand all" : "Collapse all"}
                      </span>
                    </button>
                  </div>

                  <div className="relative pt-1">
                    {/* Vertical Timeline Rail */}
                    <span className="absolute left-[8.5px] top-3 bottom-3 w-px bg-[#334139]/15" />

                    <div className="space-y-0.5">
                      {visiblePhases.map((phase) => {
                        const running =
                          liveStep === phase.stepIndex && isSimulating;
                        const open = isPhaseOpen(phase);

                        return (
                          <div
                            key={phase.id}
                            className="relative pl-7 animate-fadeIn"
                          >
                            {/* Status Node on Rail */}
                            <span className="absolute left-0 top-[7px] z-10">
                              {running ? (
                                <span className="w-[18px] h-[18px] rounded-full bg-[#FDFFFC] flex items-center justify-center">
                                  <Loader2
                                    size={14}
                                    className="animate-spin text-[#D66F14]"
                                  />
                                </span>
                              ) : (
                                <span className="w-[18px] h-[18px] rounded-full bg-[#334139]/10 flex items-center justify-center">
                                  <Check
                                    size={11}
                                    strokeWidth={3}
                                    className="text-[#064C1C]"
                                  />
                                </span>
                              )}
                            </span>

                            {/* Phase Header Row */}
                            <div
                              onClick={() => togglePhase(phase)}
                              className="flex items-start justify-between gap-2 py-1.5 pr-1 -ml-1 pl-1 rounded-lg hover:bg-[#334139]/[0.04] cursor-pointer select-none"
                            >
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-semibold text-[#334139] leading-snug">
                                  {phase.title}
                                </h3>
                                {!open && (
                                  <p className="text-xs text-[#334139]/60 mt-0.5">
                                    {phase.scripts.length} script
                                    {phase.scripts.length > 1 ? "s" : ""}{" "}
                                    executed
                                  </p>
                                )}
                              </div>

                              <span className="text-[#334139]/45 mt-0.5 shrink-0">
                                {open ? (
                                  <ChevronDown size={14} />
                                ) : (
                                  <ChevronRight size={14} />
                                )}
                              </span>
                            </div>

                            {/* Expanded Scripts & Reasoning */}
                            {open && (
                              <div className="pb-3 pt-0.5 space-y-2.5 text-sm">
                                <ul className="space-y-1 rounded-lg bg-[#334139]/[0.05] px-3 py-2">
                                  {phase.scripts.map((script, idx) => {
                                    const scriptRunning =
                                      running &&
                                      idx === phase.scripts.length - 1;
                                    return (
                                      <li
                                        key={script}
                                        className="flex items-center gap-2 text-xs font-mono text-[#334139]"
                                      >
                                        {scriptRunning ? (
                                          <Loader2
                                            size={12}
                                            className="animate-spin text-[#D66F14] shrink-0"
                                          />
                                        ) : (
                                          <Check
                                            size={12}
                                            strokeWidth={3}
                                            className="text-[#334139]/40 shrink-0"
                                          />
                                        )}
                                        <span>{script}</span>
                                      </li>
                                    );
                                  })}
                                </ul>

                                <p className="text-sm leading-relaxed text-[#334139]/85">
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
                <section className="space-y-3 pt-1 animate-fadeIn font-sans">
                  <div className="flex items-center justify-between pb-2 border-b border-[#334139]/12">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-[#1E2D24]">
                        Architectural Decisions Required
                      </span>
                      <span className="text-xs text-[#334139]/65 font-sans tabular-nums px-2.5 py-0.5 rounded-full bg-[#334139]/[0.06] font-medium">
                        Question {activeQuestionIndex + 1} of {questions.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Mini stepper indicator dots */}
                      <div className="flex items-center gap-1.5">
                        {questions.map((q, idx) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveQuestionIndex(idx)}
                            className={cn(
                              "w-2.5 h-2.5 rounded-full transition-all cursor-pointer",
                              activeQuestionIndex === idx
                                ? "bg-[#064C1C] scale-125"
                                : selectedAnswers[q.id]
                                  ? "bg-[#064C1C]/40"
                                  : "bg-[#334139]/20 hover:bg-[#334139]/40",
                            )}
                            aria-label={`Go to question ${idx + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleSkipAllQuestions}
                        className="text-xs font-semibold text-[#D66F14] hover:underline cursor-pointer"
                      >
                        Skip all
                      </button>
                    </div>
                  </div>

                  {/* Active Question Box */}
                  <div className="p-5 md:p-6 rounded-2xl bg-white border border-[#334139]/15 shadow-sm space-y-4 font-sans">
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#D66F14]/10 text-[#D66F14] border border-[#D66F14]/25 tabular-nums mt-0.5 shrink-0">
                          0{activeQuestionIndex + 1}
                        </span>
                        <div className="space-y-1 min-w-0">
                          <h3 className="text-base md:text-lg font-bold text-[#1E2D24] leading-snug">
                            {currentQuestion.question}
                          </h3>
                          {currentQuestion.context && (
                            <p className="text-xs md:text-sm text-[#334139]/70 leading-relaxed">
                              {currentQuestion.context}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Answer Proposals: One line standalone in a list-like fashion */}
                    <div className="space-y-2 pt-1">
                      {currentQuestion.options.map((opt) => {
                        const isSelected =
                          selectedAnswers[currentQuestion.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleSelectOption(currentQuestion.id, opt.id)
                            }
                            className={cn(
                              "w-full group text-left px-4 py-3 rounded-xl border transition-all cursor-pointer select-none flex items-start sm:items-center justify-between gap-3 font-sans",
                              isSelected
                                ? "bg-[#064C1C]/[0.03] border-[#064C1C] ring-1 ring-[#064C1C] shadow-2xs"
                                : "bg-white border-[#334139]/15 hover:border-[#334139]/40 hover:bg-[#FDFFFC]",
                            )}
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              <span
                                className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-colors",
                                  isSelected
                                    ? "bg-[#064C1C] text-white shadow-2xs"
                                    : "border-2 border-[#334139]/25 bg-white group-hover:border-[#334139]/50",
                                )}
                              >
                                {isSelected && (
                                  <Check size={11} strokeWidth={3} />
                                )}
                              </span>

                              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-2.5">
                                <span
                                  className={cn(
                                    "text-sm font-semibold block sm:inline truncate",
                                    isSelected
                                      ? "text-[#064C1C]"
                                      : "text-[#1E2D24]",
                                  )}
                                >
                                  {opt.label}
                                </span>

                                {opt.description && (
                                  <span className="text-xs sm:text-sm text-[#334139]/70 block sm:inline truncate sm:before:content-['·'] sm:before:mr-2 sm:before:text-[#334139]/40">
                                    {opt.description}
                                  </span>
                                )}
                              </div>
                            </div>

                            {opt.isRecommended && (
                              <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D66F14]/10 text-[#D66F14] border border-[#D66F14]/25">
                                Recommended
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Stepper Navigation: Previous, Skip, Next */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#334139]/10 text-xs sm:text-sm">
                      <div>
                        {!isFirstQuestion && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveQuestionIndex((prev) =>
                                Math.max(prev - 1, 0),
                              )
                            }
                            className="inline-flex items-center gap-1 font-semibold text-[#334139]/70 hover:text-[#1E2D24] transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-100"
                          >
                            <ChevronLeft size={14} />
                            <span>Previous</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSkipQuestion}
                          className="inline-flex items-center gap-1 font-semibold text-[#334139]/60 hover:text-[#1E2D24] transition-colors cursor-pointer px-3.5 py-1.5 rounded-lg hover:bg-slate-100"
                        >
                          <SkipForward size={13} />
                          <span>
                            {isLastQuestion ? "Skip & Finish" : "Skip"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleNextQuestion}
                          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full font-bold bg-[#064C1C] hover:bg-[#1E2D24] text-[#FDFFFC] transition-colors cursor-pointer shadow-xs"
                        >
                          <span>
                            {isLastQuestion
                              ? "Confirm & Generate Blueprint"
                              : "Next"}
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 3. Architectural Blueprint Card: ONLY APPEARS ONCE ALL QUESTIONS ARE ANSWERED OR SKIPPED */}
              {questionsFinished && (
                <section className="space-y-3 animate-fadeIn font-sans">
                  {/* Status header indicating decisions were resolved */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm px-1">
                    <span className="flex items-center gap-1.5 text-[#064C1C] font-semibold">
                      <Check size={15} strokeWidth={3} />
                      Decisions & {selectedKpis.length} proposed KPIs applied to
                      final blueprint
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuestionsFinished(false)}
                      className="text-xs font-semibold text-[#334139]/70 hover:text-[#334139] underline cursor-pointer"
                    >
                      Modify decisions
                    </button>
                  </div>

                  {/* Blueprint Card */}
                  <div
                    className={cn(
                      "p-6 md:p-7 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm transition-all space-y-4 font-sans",
                      isPanelOpen
                        ? "border-[#064C1C]/40 ring-1 ring-[#064C1C]/20"
                        : "hover:border-[#064C1C]/35",
                    )}
                  >
                    {/* Content Section: Full width, clean, uncluttered */}
                    <div className="space-y-1.5">
                      <h3 className="text-lg md:text-xl font-bold text-[#1E2D24] leading-snug">
                        Retail Lakehouse Master Pipeline
                      </h3>
                      <p className="text-sm md:text-[15px] text-[#334139]/75 leading-relaxed">
                        Kimball star schema architecture connecting raw
                        PostgreSQL & Stripe streams into curated analytics marts
                        with automated KPI reconciliation.
                      </p>
                    </div>

                    {/* Actions Row: Distinct row with full width, clean responsive alignment */}
                    <div className="pt-2 border-t border-[#334139]/10 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPanelTab("audit");
                            setIsPanelOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold border border-[#D66F14]/40 bg-[#D66F14]/10 text-[#D66F14] hover:bg-[#D66F14] hover:text-[#FDFFFC] transition-all cursor-pointer"
                        >
                          <Sparkles size={14} />
                          <span>Proposed KPIs ({selectedKpis.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPanelTab("ddl");
                            setIsPanelOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold border border-[#334139]/20 text-[#334139] hover:bg-[#334139]/5 transition-all cursor-pointer"
                        >
                          <FileCode size={14} />
                          <span>View DDL</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPanelOpen(!isPanelOpen)}
                          className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs",
                            isPanelOpen
                              ? "bg-[#334139] text-[#FDFFFC] hover:bg-[#1E2D24]"
                              : "bg-[#064C1C] text-[#FDFFFC] hover:bg-[#1E2D24]",
                          )}
                        >
                          <Eye size={15} />
                          <span>
                            {isPanelOpen ? "Close Plan View" : "View Full Plan"}
                          </span>
                          <ChevronRight
                            size={15}
                            className={cn(
                              "transition-transform",
                              isPanelOpen ? "rotate-90" : "",
                            )}
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
                "linear-gradient(to top, rgba(253, 255, 252, 1) 0%, rgba(253, 255, 252, 0.95) 55%, rgba(253, 255, 252, 0) 100%)",
            }}
            className="shrink-0 w-full pt-10 pb-4 px-4 z-20 flex flex-col items-center pointer-events-none"
          >
            <div
              className={cn(
                "w-full pointer-events-auto transition-all",
                isPanelOpen ? "max-w-xl" : "max-w-2xl",
              )}
            >
              <WorkspacePromptBar
                className="relative bottom-auto left-auto translate-x-0 w-full px-0"
                disabled={isSimulating || isApproving}
                placeholder={
                  isSimulating
                    ? "AI is formulating architecture plan... Please wait"
                    : isApproving
                      ? "Building workspace pipeline... Please wait"
                      : "Ask AuraBI to add a KPI or refine your pipeline plan... (Shift+Enter for new line)"
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
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              style={{ backgroundColor: "#FDFFFC" }}
              className="w-full md:w-[50%] lg:w-[48%] shrink-0 h-full flex flex-col border-l border-[#334139]/12 z-20 overflow-hidden shadow-xl font-sans"
              aria-label="Pipeline Architecture Plan Panel"
            >
              {/* Panel Header */}
              <div className="px-5 sm:px-6 py-4 border-b border-[#334139]/12 flex items-center justify-between shrink-0 bg-[#FDFFFC]">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={logoUrl}
                    alt="AuraBI Plan"
                    className="w-8 h-8 object-contain shrink-0 drop-shadow-2xs select-none"
                  />
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-[#1E2D24] truncate">
                      Pipeline Architecture Plan
                    </h2>
                    <p className="text-xs text-[#334139]/65 font-sans truncate">
                      Retail Lakehouse Master Pipeline · 5 Stages ·{" "}
                      {selectedKpis.length} Proposed KPIs
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="p-1.5 rounded-lg text-[#334139]/60 hover:text-[#1E2D24] hover:bg-[#334139]/8 transition-colors cursor-pointer shrink-0"
                  aria-label="Close plan panel"
                  title="Close panel"
                >
                  <PanelRightClose size={18} />
                </button>
              </div>

              {/* Panel Nav Tabs & Export Actions */}
              <div className="px-5 sm:px-6 pt-3 border-b border-[#334139]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 bg-[#FDFFFC]">
                <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar -mb-px">
                  <button
                    type="button"
                    onClick={() => setPanelTab("overview")}
                    className={cn(
                      "pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                      panelTab === "overview"
                        ? "border-[#064C1C] text-[#064C1C]"
                        : "border-transparent text-[#334139]/50 hover:text-[#334139]",
                    )}
                  >
                    Implementation Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelTab("audit")}
                    className={cn(
                      "pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap",
                      panelTab === "audit"
                        ? "border-[#064C1C] text-[#064C1C]"
                        : "border-transparent text-[#334139]/50 hover:text-[#334139]",
                    )}
                  >
                    <Sparkles size={14} className="text-[#D66F14]" />
                    <span>Proposed KPIs ({selectedKpis.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelTab("ddl")}
                    className={cn(
                      "pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                      panelTab === "ddl"
                        ? "border-[#064C1C] text-[#064C1C]"
                        : "border-transparent text-[#334139]/50 hover:text-[#334139]",
                    )}
                  >
                    Compiled DDL
                  </button>
                </div>

                {/* Actions: Single Copy button + Single Export Dropdown */}
                <div className="flex items-center gap-2 pb-2 sm:pb-0">
                  <button
                    type="button"
                    onClick={handleCopyContent}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
                    title={
                      panelTab === "ddl"
                        ? "Copy compiled DDL"
                        : "Copy plan document"
                    }
                  >
                    {copiedFormat ? (
                      <Check
                        size={13}
                        strokeWidth={3}
                        className="text-[#064C1C]"
                      />
                    ) : (
                      <Copy size={13} />
                    )}
                    <span>{copiedFormat ? "Copied" : "Copy"}</span>
                  </button>

                  <Dropdown
                    align="right"
                    width="w-56"
                    icon={<Download size={13} />}
                    trigger="Export"
                    items={[
                      {
                        id: "export-md",
                        label: "Markdown Plan (.md)",
                        shortcut: ".md",
                        icon: <FileText size={13} className="text-[#064C1C]" />,
                        onClick: handleExportMarkdown,
                      },
                      {
                        id: "export-sql",
                        label: "Compiled DDL (.sql)",
                        shortcut: ".sql",
                        icon: <FileCode size={13} className="text-[#D66F14]" />,
                        onClick: handleExportSql,
                      },
                      {
                        id: "export-json",
                        label: "Protocol Spec (.json)",
                        shortcut: ".json",
                        icon: <Download size={13} className="text-[#334139]" />,
                        onClick: handleExportJson,
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Panel Scrollable Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar text-sm">
                {panelTab === "overview" && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#334139]/12 shadow-xs text-[#1E2D24] animate-fadeIn">
                    <Markdown>{planMarkdown}</Markdown>
                  </div>
                )}

                {panelTab === "audit" && (
                  <div className="space-y-4 font-sans">
                    {/* AI Metric Discovery & Schema Insights Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#334139]/12 shadow-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-[#D66F14]">
                          <Sparkles size={14} />
                          AI Metric Discovery & Schema Insights
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#064C1C]/10 text-[#064C1C] font-sans text-xs font-bold tabular-nums">
                          {selectedKpis.length} of {kpis.length} Selected
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#334139]/80 leading-relaxed font-sans">
                        AuraBI analyzed your raw PostgreSQL order tables and
                        Stripe payment streams to identify high-value business
                        metrics. Below are the proposed KPIs, with insights into
                        how the data was interpreted and why each metric is
                        critical to executive and financial operations.
                      </p>
                      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#334139]/10 gap-2 text-xs">
                        <span className="text-[#334139]/60 font-sans">
                          Toggle metrics below to include or exclude them from
                          the generated pipeline.
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              kpis.forEach((k) => {
                                if (!selectedKpiIds.includes(k.id))
                                  toggleKpiSelection(k.id);
                              });
                            }}
                            className="font-semibold text-[#064C1C] hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-[#334139]/30">·</span>
                          <button
                            type="button"
                            onClick={() => {
                              kpis.forEach((k) => {
                                if (selectedKpiIds.includes(k.id))
                                  toggleKpiSelection(k.id);
                              });
                            }}
                            className="font-semibold text-[#334139]/60 hover:text-[#334139] hover:underline cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Proposed KPI Cards */}
                    <div className="space-y-3.5">
                      {kpis.map((kpi) => {
                        const isSelected = selectedKpiIds.includes(kpi.id);
                        return (
                          <div
                            key={kpi.id}
                            className={cn(
                              "p-4 sm:p-5 rounded-2xl border transition-all duration-200 space-y-3.5 bg-white font-sans",
                              isSelected
                                ? "border-[#064C1C]/35 shadow-xs ring-1 ring-[#064C1C]/15"
                                : "border-[#334139]/15 opacity-80 hover:opacity-100",
                            )}
                          >
                            {/* Header Row: Checkbox, Name, Category, Inclusion Badge */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => toggleKpiSelection(kpi.id)}
                                  className={cn(
                                    "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                                    isSelected
                                      ? "bg-[#064C1C] border-[#064C1C] text-[#FDFFFC]"
                                      : "bg-white border-[#334139]/30 hover:border-[#334139]/60",
                                  )}
                                  aria-label={`Toggle ${kpi.name} inclusion`}
                                >
                                  {isSelected && (
                                    <Check size={13} strokeWidth={3} />
                                  )}
                                </button>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm sm:text-base font-bold text-[#1E2D24] leading-snug">
                                      {kpi.name}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#334139]/8 text-[#334139]">
                                      {kpi.category}
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-[#334139]/75 mt-1 leading-relaxed">
                                    {kpi.description}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={cn(
                                  "shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold",
                                  isSelected
                                    ? "bg-[#064C1C]/10 text-[#064C1C]"
                                    : "bg-[#334139]/8 text-[#334139]/60",
                                )}
                              >
                                {isSelected ? "Included" : "Excluded"}
                              </span>
                            </div>

                            {/* AI Reasoning: Data Understanding & Business Relevance */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                              {/* AI Data Understanding */}
                              <div className="p-3.5 rounded-xl bg-[#334139]/[0.025] border border-[#334139]/10 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#064C1C]">
                                  <Database
                                    size={13}
                                    className="shrink-0 text-[#064C1C]"
                                  />
                                  <span>AI Data Understanding</span>
                                </div>
                                <p className="text-xs text-[#334139]/85 leading-relaxed font-normal">
                                  {kpi.dataRationale ||
                                    "Discovered from transaction schemas and lineage relationships during raw data profiling."}
                                </p>
                              </div>

                              {/* Business Relevance */}
                              <div className="p-3.5 rounded-xl bg-[#D66F14]/[0.035] border border-[#D66F14]/20 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#D66F14]">
                                  <TrendingUp
                                    size={13}
                                    className="shrink-0 text-[#D66F14]"
                                  />
                                  <span>Business Relevance</span>
                                </div>
                                <p className="text-xs text-[#334139]/85 leading-relaxed font-normal">
                                  {kpi.businessImpact ||
                                    "Provides critical operational visibility and executive metrics for commercial decision-making."}
                                </p>
                              </div>
                            </div>

                            {/* Lineage & Technical Details Footer */}
                            <div className="pt-2.5 border-t border-[#334139]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[#334139]/70">
                                <span>
                                  <strong className="text-[#1E2D24] font-medium">
                                    Source:
                                  </strong>{" "}
                                  {kpi.sourceSystem}
                                </span>
                                <span className="text-[#334139]/30">→</span>
                                <span>
                                  <strong className="text-[#1E2D24] font-medium">
                                    Target Mart:
                                  </strong>{" "}
                                  <code className="font-mono text-[11px] text-[#064C1C] bg-[#064C1C]/5 px-1 py-0.5 rounded">
                                    {kpi.targetMart}
                                  </code>
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[#334139]/70">
                                <span className="font-medium text-[#1E2D24]">
                                  Formula:
                                </span>
                                <code className="font-mono text-[11px] text-[#334139] bg-slate-100 px-1.5 py-0.5 rounded border border-[#334139]/10">
                                  {kpi.formula}
                                </code>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {panelTab === "ddl" && (
                  <div className="space-y-2.5 font-sans">
                    <div className="flex items-center justify-between text-xs text-[#334139]/70">
                      <span>Dialect: ANSI SQL-92 / Zetaris</span>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="hover:text-[#064C1C] underline cursor-pointer font-semibold font-sans"
                      >
                        Copy All
                      </button>
                    </div>

                    <pre className="p-4 rounded-2xl bg-[#334139]/[0.05] text-[#334139] font-mono text-xs leading-relaxed overflow-x-auto custom-scrollbar">
                      {compiledSql}
                    </pre>
                  </div>
                )}
              </div>

              {/* Panel Footer Action */}
              <div className="px-5 sm:px-6 py-4 border-t border-[#334139]/12 bg-[#FDFFFC] flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="px-4.5 py-2 rounded-full text-xs sm:text-sm font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleApprovePlan}
                  disabled={isApproving}
                  style={{ backgroundColor: "#064C1C" }}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold text-[#FDFFFC] hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <span>
                    {isApproving
                      ? "Building Pipeline…"
                      : "Validate & Build Pipeline"}
                  </span>
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
