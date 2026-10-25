import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  ArrowDown,
  Wand2,
  Loader2,
  Sparkles,
  AtSign,
} from "lucide-react";
import { useChatStore } from "../../chat/store/chatStore";
import { usePipelineStore } from "../store/pipelineStore";
import { Markdown } from "../../chat/components/Markdown";
import { UiopBatchCard } from "../../uiop/components/UiopBatchCard";
import { cn } from "../../../utils/cn";
import type { PipelineNode } from "../../../types/pipeline";

interface ThoughtBlock {
  id: string;
  title: string;
  category:
    | "discovery"
    | "transformation"
    | "modeling"
    | "prompt"
    | "selection";
  status: "completed" | "running" | "pending";
  executionSteps: string[];
  thoughtProcess: string[];
  timestamp?: string;
}

/** Formats a node into its execution script filename (e.g. `cleanse.sql`, `rfm.py`). */
function getScriptFileName(node: PipelineNode): string {
  if (node.data.category === "processing") {
    const ext = node.data.language === "python" ? "py" : "sql";
    const label = node.data.label.replace(/\.(sql|py)$/i, "");
    return `${label}.${ext}`;
  }
  return `${node.data.label}.sql`;
}

/** Extracts a leading `@node_label` context tag from a user prompt if present. */
function parseUserPromptContext(text: string): {
  nodeTag: string | null;
  body: string;
} {
  const match = text.match(/^@([^\s]+)\s+([\s\S]*)$/);
  if (match) {
    return { nodeTag: match[1], body: match[2] };
  }
  return { nodeTag: null, body: text };
}

export function AiThoughtPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>(
    {},
  );
  const [groupOpen, setGroupOpen] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const atBottomRef = useRef(true);

  const messages = useChatStore((s) => s.messages);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevTurnCountRef = useRef<number>(0);

  // User prompts & AI replies excluding the initial static welcome banner
  const conversationTurns = messages.filter((m) => m.id !== "welcome");

  // Automatically expand the panel when the user sends a prompt or the AI starts responding
  useEffect(() => {
    if (conversationTurns.length > prevTurnCountRef.current || isGenerating) {
      setIsCollapsed(false);
      atBottomRef.current = true;
    }
    prevTurnCountRef.current = conversationTurns.length;
  }, [conversationTurns.length, isGenerating]);

  // Smart auto-scroll: follow new activity when near bottom or when a new message arrives
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    } else {
      setHasNewActivity(true);
    }
  }, [conversationTurns.length, isGenerating, selectedNodeId, isCollapsed]);

  // Live elapsed timer while the agent is working
  useEffect(() => {
    if (!isGenerating) return;
    const startedAt = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => {
      clearInterval(id);
      setElapsed(0);
    };
  }, [isGenerating]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    atBottomRef.current = near;
    if (near) setHasNewActivity(false);
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setHasNewActivity(false);
  };

  const resourceNodes = nodes.filter((n) => n.data.category === "resource");
  const processingNodes = nodes.filter((n) => n.data.category === "processing");
  const containerNodes = nodes.filter((n) => n.data.category === "datamart");
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // 1. Source Discovery Thought Block
  const discoveryBlock: ThoughtBlock = {
    id: "block-discovery",
    title: "Source Connection & Field Discovery",
    category: "discovery",
    status: "completed",
    executionSteps: [
      resourceNodes.length > 0
        ? `Auditing ${resourceNodes.length} connected business datasets`
        : "Connecting external business datasets",
      ...resourceNodes.map(
        (n) =>
          `Connecting ${n.data.label} (${
            n.data.category === "resource"
              ? (n.data.format ?? n.data.kind ?? "dataset")
              : "source"
          } · ${n.data.category === "resource" ? n.data.columns.length : 0} fields)`,
      ),
    ],
    thoughtProcess: [
      "Auditing incoming business datasets to verify field consistency and schema structure.",
      "Ensuring real-time synchronization so insights reflect up-to-date transaction activity.",
      "Validating primary customer and order keys for reliable metric correlation downstream.",
    ],
  };

  // 2. Transformation Pipeline Thought Block
  const transformationBlock: ThoughtBlock = {
    id: "block-transformation",
    title: "Metric Calculation & Data Preparation",
    category: "transformation",
    status: "completed",
    executionSteps: [
      ...processingNodes.map(
        (n) => `Applying calculation: ${getScriptFileName(n)}`,
      ),
      `Verified ${edges.length} active metric lineage connections across the model`,
    ],
    thoughtProcess: [
      "Cleansing transaction amounts, standardizing date intervals, and normalizing customer identifiers.",
      "Eliminating duplicate records early to ensure accurate revenue and volume totals.",
      "Structuring unified data models ready for executive dashboards and cohort retention tracking.",
    ],
  };

  // 3. Dimensional Modeling Thought Block
  const modelingBlock: ThoughtBlock = {
    id: "block-modeling",
    title: "Executive Performance & Cohort Modeling",
    category: "modeling",
    status: "completed",
    executionSteps: [
      "Compiling executive KPI aggregates and trend lines",
      ...containerNodes.map(
        (c) =>
          `Structuring ${c.data.label} (${
            c.data.category === "datamart" ? c.data.children.nodes.length : 0
          } reporting views)`,
      ),
    ],
    thoughtProcess: [
      "Organizing dimensional tables to power fast executive dashboards and retention analysis.",
      "Enforcing consistency between net revenue metrics and customer cohort segments.",
      "Preparing summary rollups for real-time variance detection and trend forecasting.",
    ],
  };

  const staticBlocks: ThoughtBlock[] = [
    discoveryBlock,
    transformationBlock,
    modelingBlock,
  ];
  const focusBlocks: ThoughtBlock[] = [];

  // Selected node focus block if user clicked a node
  if (selectedNode) {
    const upstream = edges.filter((e) => e.target === selectedNode.id).length;
    const downstream = edges.filter((e) => e.source === selectedNode.id).length;
    const isProc = selectedNode.data.category === "processing";

    focusBlocks.push({
      id: `block-selection-${selectedNode.id}`,
      title: `Selected Focus: ${selectedNode.data.label}`,
      category: "selection",
      status: "completed",
      executionSteps: [
        ...(isProc
          ? [`Applying calculation: ${getScriptFileName(selectedNode)}`]
          : []),
        `Inspecting ${selectedNode.data.label} attributes and field types`,
        `Connected to ${upstream} upstream source(s) and ${downstream} downstream view(s)`,
      ],
      thoughtProcess: [
        selectedNode.data.description ||
          "Analyzing role within business performance and metric reporting.",
        "Verifying that all necessary upstream fields are available for calculations.",
      ],
    });
  }

  const isBlockExpanded = (id: string, defaultOpen = false) =>
    expandedBlocks[id] ?? defaultOpen;

  const toggleBlockById = (id: string, defaultOpen = false) =>
    setExpandedBlocks((prev) => ({
      ...prev,
      [id]: !isBlockExpanded(id, defaultOpen),
    }));

  const aiTurnIds = conversationTurns
    .filter((m) => m.sender === "assistant")
    .map((m) => `trace-${m.id}`);
  const allCollapsibleIds = [
    ...staticBlocks.map((b) => b.id),
    ...focusBlocks.map((b) => b.id),
    ...aiTurnIds,
  ];
  const allCollapsed =
    allCollapsibleIds.every((id) => !isBlockExpanded(id, false)) && !groupOpen;

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    allCollapsibleIds.forEach((id) => {
      next[id] = allCollapsed;
    });
    setExpandedBlocks(next);
    setGroupOpen(allCollapsed);
  };

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const renderNodeBadge = (status: ThoughtBlock["status"]) => {
    if (status === "running") {
      return (
        <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-2xs">
          <Loader2 size={13} className="animate-spin text-[#D66F14]" />
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-full bg-[#064C1C]/10 flex items-center justify-center">
        <Check size={12} strokeWidth={3} className="text-[#064C1C]" />
      </span>
    );
  };

  const renderTelemetryBlock = (block: ThoughtBlock, defaultOpen = false) => {
    const open = isBlockExpanded(block.id, defaultOpen);
    const running = block.status === "running";
    const lastExecIdx = block.executionSteps.length - 1;
    return (
      <div key={block.id} className="relative pl-7 font-sans">
        <span className="absolute left-0 top-[7px] z-10">
          {renderNodeBadge(block.status)}
        </span>

        <div
          onClick={() => toggleBlockById(block.id, defaultOpen)}
          className="flex items-start gap-2 py-2 pr-1 cursor-pointer select-none rounded-lg hover:bg-[#334139]/[0.05] -ml-1 pl-1 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "text-xs font-semibold leading-snug text-[#1E2D24]",
                open ? "" : "line-clamp-2",
              )}
            >
              {block.title}
            </h3>
            {!open && (
              <p className="text-xs text-[#334139]/60 mt-0.5 tabular-nums">
                {block.executionSteps.length} steps ·{" "}
                {block.thoughtProcess.length} reasoning points
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-[#334139]/50 mt-0.5">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>

        {open && (
          <div className="pb-3 space-y-3">
            <div>
              <div className="text-xs font-semibold text-[#334139]/60 uppercase tracking-wider mb-1.5">
                Activity
              </div>
              <ul className="space-y-1.5 rounded-xl bg-[#334139]/[0.04] px-3 py-2.5">
                {block.executionSteps.map((step, idx) => {
                  const hasScript =
                    step.includes(".sql") || step.includes(".py");
                  const stepRunning = running && idx === lastExecIdx;
                  return (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs leading-relaxed"
                    >
                      <span className="mt-[3px] shrink-0 w-3.5 flex justify-center">
                        {stepRunning ? (
                          <Loader2
                            size={12}
                            className="animate-spin text-[#D66F14]"
                          />
                        ) : (
                          <Check
                            size={12}
                            strokeWidth={3}
                            className="text-[#064C1C]"
                          />
                        )}
                      </span>
                      <span className="min-w-0 break-words font-sans text-[#334139]/85">
                        {hasScript ? (
                          <span>
                            {step.split(/(?=[a-zA-Z0-9_\-]+\.(?:sql|py))/)[0]}
                            <code className="font-mono text-xs bg-black/5 px-1.5 py-0.5 rounded text-[#064C1C] font-semibold">
                              {step.match(/[a-zA-Z0-9_\-]+\.(?:sql|py)/)?.[0]}
                            </code>
                          </span>
                        ) : (
                          step
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#334139]/60 uppercase tracking-wider mb-1.5">
                Reasoning
              </div>
              <div className="space-y-2">
                {block.thoughtProcess.map((thought, idx) => (
                  <p
                    key={idx}
                    className="text-xs leading-relaxed text-[#334139]/90 font-sans whitespace-pre-line"
                  >
                    {thought}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="absolute left-5 top-20 z-20">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="group flex items-center gap-3 px-4 py-2.5 rounded-full border border-[#334139]/15 bg-white shadow-md hover:shadow-lg hover:border-[#064C1C]/40 transition-all cursor-pointer font-sans"
          aria-label="Expand AI Insights & Reasoning panel"
          title="Expand AI Insights & Reasoning"
        >
          <span className="relative flex h-2.5 w-2.5">
            {isGenerating ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D66F14] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D66F14]" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#064C1C]" />
            )}
          </span>
          <Bot size={16} className="text-[#064C1C]" />
          <span className="text-xs font-bold text-[#1E2D24]">
            AI Insights & Reasoning
          </span>
          {conversationTurns.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums bg-[#064C1C]/10 text-[#064C1C]">
              {conversationTurns.length}
            </span>
          )}
          <ChevronRight
            size={14}
            className="text-[#334139]/60 group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="AI Insights & Reasoning Panel"
      className="absolute left-5 top-20 z-20 w-84 sm:w-96 md:w-[400px] max-h-[calc(100vh-8.5rem)] flex flex-col rounded-2xl border border-[#334139]/15 shadow-xl shadow-[#1E2D24]/10 bg-white/95 backdrop-blur-md overflow-hidden transition-all font-sans"
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#334139]/10 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs",
              isGenerating
                ? "bg-[#D66F14] text-white"
                : "bg-[#064C1C] text-white",
            )}
          >
            {isGenerating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Bot size={18} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-[#1E2D24] truncate leading-tight">
              AuraBI Assistant
            </h2>
            <p
              className={cn(
                "text-xs leading-tight mt-0.5 truncate tabular-nums",
                isGenerating
                  ? "text-[#D66F14] font-medium"
                  : "text-[#334139]/70",
              )}
            >
              {isGenerating
                ? `Analyzing insights… ${formatElapsed(elapsed)}`
                : conversationTurns.length > 0
                  ? `${conversationTurns.length} message${conversationTurns.length === 1 ? "" : "s"} · Ready`
                  : "AI Thought Process · Ready"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleAll}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#334139]/70 hover:text-[#1E2D24] hover:bg-[#334139]/10 transition-colors cursor-pointer"
            aria-label={
              allCollapsed ? "Expand all thoughts" : "Collapse all thoughts"
            }
            title={
              allCollapsed ? "Expand all thoughts" : "Collapse all thoughts"
            }
          >
            <ChevronsUpDown size={15} />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#334139]/70 hover:text-[#1E2D24] hover:bg-[#334139]/10 transition-colors cursor-pointer"
            aria-label="Minimize AI panel"
            title="Minimize panel"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Unified Feed: Telemetry + Conversation Stream */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 pb-5 pt-3.5 text-xs no-scrollbar space-y-4"
        >
          {/* 1. Pipeline Telemetry & Selected Node Context */}
          <div className="relative">
            {/* Vertical Guide Rail */}
            <span className="absolute left-[9.5px] top-3 bottom-3 w-px bg-[#334139]/15" />

            {/* Grouped static pipeline analysis */}
            <div className="relative pl-7">
              <span className="absolute left-0 top-[7px] z-10 w-5 h-5 rounded-full bg-[#064C1C]/10 flex items-center justify-center">
                <Check size={12} strokeWidth={3} className="text-[#064C1C]" />
              </span>
              <div
                onClick={() => setGroupOpen((v) => !v)}
                className="flex items-center gap-2 py-2 -ml-1 pl-1 pr-1 cursor-pointer select-none rounded-lg hover:bg-[#334139]/[0.05] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-[#1E2D24] leading-snug">
                    Data Pipeline & Metric Status
                  </h3>
                  <p className="text-xs text-[#334139]/65 mt-0.5 tabular-nums">
                    {staticBlocks.length} stages · {nodes.length} entities ·{" "}
                    {edges.length} connections
                  </p>
                </div>
                <span className="text-[#334139]/50">
                  {groupOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </span>
              </div>
            </div>
            {groupOpen && (
              <div className="space-y-1">
                {staticBlocks.map((b) => renderTelemetryBlock(b, false))}
              </div>
            )}

            {/* Focused node telemetry when a node is selected on the canvas */}
            {focusBlocks.length > 0 && (
              <div className="space-y-1 mt-1">
                {focusBlocks.map((b) => renderTelemetryBlock(b, true))}
              </div>
            )}
          </div>

          {/* 2. Unified Conversation Feed */}
          <div className="pt-3 border-t border-[#334139]/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#334139]/60 font-sans">
                AI Conversation
              </span>
              {selectedNode && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#064C1C]/10 text-[#064C1C] text-xs font-semibold font-sans">
                  <AtSign size={11} />
                  {selectedNode.data.label}
                </span>
              )}
            </div>

            {/* Welcome / Ready Card when no messages sent yet */}
            {conversationTurns.length === 0 && !isGenerating && (
              <div className="rounded-2xl border border-[#334139]/15 bg-[#FDFFFC] p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-[#064C1C] text-white flex items-center justify-center shrink-0">
                    <Bot size={14} />
                  </span>
                  <span className="text-sm font-bold text-[#1E2D24]">
                    Ready to assist with your business metrics
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#334139]/80 font-sans">
                  Ask questions about your data, explore revenue trends, or
                  click any node on the canvas to inspect its role and
                  dependencies.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      void sendMessage(
                        selectedNode
                          ? `@${selectedNode.data.label} Explain the schema and metric calculations for this node`
                          : "Explain the current revenue metrics and data lineage",
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#334139]/15 text-[#334139] hover:border-[#064C1C] hover:text-[#064C1C] shadow-2xs transition-colors cursor-pointer font-sans"
                  >
                    <Sparkles size={12} className="text-[#D66F14]" />
                    <span>
                      {selectedNode
                        ? `Explain @${selectedNode.data.label}`
                        : "Explain revenue metrics"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void sendMessage(
                        "Create a SQL transformation node to cleanse and join staging data",
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#334139]/15 text-[#334139] hover:border-[#064C1C] hover:text-[#064C1C] shadow-2xs transition-colors cursor-pointer font-sans"
                  >
                    <Wand2 size={12} className="text-[#064C1C]" />
                    <span>Propose revenue transform</span>
                  </button>
                </div>
              </div>
            )}

            {/* Conversation Turns */}
            {conversationTurns.map((msg) => {
              if (msg.sender === "user") {
                const { nodeTag, body } = parseUserPromptContext(msg.text);
                return (
                  <div
                    key={msg.id}
                    className="flex flex-col items-end animate-fadeIn space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-[#334139]/55 px-1 tabular-nums font-sans">
                      <span className="font-medium text-[#334139]">You</span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="max-w-[92%] rounded-2xl rounded-tr-xs bg-[#1E2D24] text-[#FDFFFC] px-4 py-3 shadow-xs space-y-2">
                      {nodeTag && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D66F14]/25 border border-[#D66F14]/40 text-[#FDFFFC] text-xs font-semibold font-sans">
                          <AtSign size={10} className="text-[#D66F14]" />
                          <span>{nodeTag}</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-sans">
                        {body}
                      </p>
                    </div>
                  </div>
                );
              }

              // Assistant Turn: Persona Header + Collapsible Thought Trace + Markdown Reply
              const traceId = `trace-${msg.id}`;
              const traceOpen = isBlockExpanded(traceId, false);

              const uiopSteps =
                msg.uiop?.operations.map((op) => {
                  switch (op.op) {
                    case "node.add":
                      return `Planned node addition: ${op.params.data.label} (${op.params.type})`;
                    case "edge.add":
                      return `Planned lineage link: ${op.params.source} → ${op.params.target}`;
                    case "node.update":
                      return `Planned node modification for ${op.params.id}`;
                    case "layout.update":
                      return `Arranged pipeline stages in ${op.params.direction} flow`;
                    default:
                      return `Prepared pipeline operation: ${op.op}`;
                  }
                }) ?? [];

              const executionSteps: string[] = [
                "Evaluating user request and pipeline topology",
                ...uiopSteps,
                "Synthesizing recommendations and summary",
              ];

              return (
                <div
                  key={msg.id}
                  className="space-y-2.5 animate-fadeIn font-sans"
                >
                  {/* Bot Persona Header */}
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#064C1C] text-white flex items-center justify-center">
                        <Bot size={12} />
                      </span>
                      <span className="text-xs font-bold text-[#1E2D24]">
                        AuraBI Assistant
                      </span>
                    </div>
                    <span className="text-xs text-[#334139]/55 tabular-nums">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Collapsible Thought Process Trace */}
                  <div className="rounded-xl border border-[#334139]/12 bg-[#FDFFFC] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleBlockById(traceId, false)}
                      className="w-full flex items-center justify-between gap-2 text-left cursor-pointer select-none py-0.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-[#064C1C]/10 flex items-center justify-center shrink-0">
                          <Check
                            size={10}
                            strokeWidth={3}
                            className="text-[#064C1C]"
                          />
                        </span>
                        <span className="text-xs font-semibold text-[#1E2D24] truncate">
                          Thought process
                        </span>
                        <span className="text-xs text-[#334139]/50 tabular-nums shrink-0">
                          · {executionSteps.length} steps
                        </span>
                        {msg.uiop && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#D66F14]/10 text-[#D66F14] border border-[#D66F14]/20 tabular-nums shrink-0">
                            {msg.uiop.operations.length} proposed operation
                            {msg.uiop.operations.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                      <span className="text-[#334139]/45 shrink-0">
                        {traceOpen ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </span>
                    </button>

                    {traceOpen && (
                      <div className="mt-2 pt-2 border-t border-[#334139]/10 space-y-2.5">
                        <ul className="space-y-1.5 rounded-lg bg-[#334139]/[0.04] px-2.5 py-2">
                          {executionSteps.map((step, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-[#334139]/80 leading-relaxed font-sans"
                            >
                              <Check
                                size={12}
                                strokeWidth={3}
                                className="text-[#064C1C] shrink-0 mt-0.5"
                              />
                              <span className="break-words">{step}</span>
                            </li>
                          ))}
                        </ul>
                        {msg.tasks && msg.tasks.length > 0 && (
                          <div className="space-y-1">
                            {msg.tasks.map((t, i) => (
                              <div
                                key={i}
                                className="text-xs text-[#334139]/80 font-sans bg-white px-2.5 py-1.5 rounded-lg border border-[#334139]/10"
                              >
                                <span className="font-semibold text-[#064C1C]">
                                  {t.agent_role}:
                                </span>{" "}
                                {t.instruction || t.status}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* UIOP Operations placed inside the thought process so it's transparent to the user unless expanded */}
                        {msg.uiop && <UiopBatchCard envelope={msg.uiop} />}
                      </div>
                    )}
                  </div>

                  {/* AI Reply Body (Clean human-facing Markdown only) */}
                  <div className="rounded-2xl rounded-tl-xs border border-[#334139]/15 bg-white p-4 text-sm text-[#334139] shadow-2xs space-y-3 leading-relaxed font-sans">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
              );
            })}

            {/* Live Generating State */}
            {isGenerating && (
              <div className="space-y-2.5 animate-fadeIn font-sans">
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#D66F14] text-white flex items-center justify-center">
                      <Loader2 size={12} className="animate-spin" />
                    </span>
                    <span className="text-xs font-bold text-[#D66F14]">
                      AuraBI Assistant
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#D66F14] tabular-nums">
                    {formatElapsed(elapsed)}
                  </span>
                </div>

                <div className="rounded-2xl border border-[#D66F14]/30 bg-[#D66F14]/[0.04] p-4 space-y-2.5">
                  <div className="text-sm font-semibold text-[#1E2D24]">
                    Synthesizing Insights & Recommendations...
                  </div>
                  <ul className="space-y-1.5 rounded-xl bg-white border border-[#334139]/10 px-3 py-2.5">
                    <li className="flex items-center gap-2 text-xs font-sans text-[#334139]">
                      <Check
                        size={12}
                        strokeWidth={3}
                        className="text-[#064C1C] shrink-0"
                      />
                      <span>Correlating active business metrics...</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs font-sans text-[#D66F14] font-medium">
                      <Loader2 size={12} className="animate-spin shrink-0" />
                      <span>
                        Evaluating optimal chart formats and variance trends...
                      </span>
                    </li>
                  </ul>
                  <p className="text-xs text-[#334139]/80 leading-relaxed font-sans">
                    Analyzing quarterly KPI performance to provide clear
                    explanations and actionable insights.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasNewActivity && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#1E2D24] text-[#FDFFFC] shadow-lg hover:bg-[#064C1C] transition-colors cursor-pointer font-sans"
          >
            <ArrowDown size={12} />
            <span>New activity</span>
          </button>
        )}
      </div>
    </aside>
  );
}
