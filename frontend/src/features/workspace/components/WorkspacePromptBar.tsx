import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowUpRight,
  Database,
  Code2,
  Boxes,
  X,
  Plus,
  Sparkles,
  Link2,
  Search,
} from "lucide-react";
import { useChatStore } from "../../chat/store/chatStore";
import { usePipelineStore } from "../store/pipelineStore";
import { cn } from "../../../utils/cn";
import type { PipelineNode } from "../../../types/pipeline";

export interface WorkspacePromptBarProps {
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onSend?: (text: string) => void;
}

interface QuickChip {
  id: string;
  label: string;
  promptText: string;
  icon: typeof Plus;
}

function getQuickChips(contextNode: PipelineNode | null): QuickChip[] {
  if (contextNode) {
    const label = contextNode.data.label;
    if (contextNode.data.category === "resource") {
      return [
        {
          id: "col",
          label: `Add column to @${label}`,
          promptText: `Add a new column to @${label} for tracking updated timestamps`,
          icon: Plus,
        },
        {
          id: "sql",
          label: `Transform @${label} with SQL`,
          promptText: `Create a SQL transformation node to cleanse and filter @${label}`,
          icon: Sparkles,
        },
        {
          id: "audit",
          label: `Explain @${label} schema`,
          promptText: `Explain the schema role and downstream lineage of @${label}`,
          icon: Search,
        },
      ];
    }
    if (contextNode.data.category === "processing") {
      const targetLang = contextNode.data.language === "sql" ? "Python" : "SQL";
      return [
        {
          id: "opt",
          label: `Optimize @${label}`,
          promptText: `Optimize the transformation logic in @${label} for pushdown performance`,
          icon: Sparkles,
        },
        {
          id: "conv",
          label: `Rewrite @${label} in ${targetLang}`,
          promptText: `Convert the @${label} script into ${targetLang}`,
          icon: Code2,
        },
        {
          id: "explain",
          label: `Explain @${label}`,
          promptText: `Explain step-by-step what the transformation in @${label} does`,
          icon: Search,
        },
      ];
    }
    return [
      {
        id: "mart-table",
        label: `Add table to @${label}`,
        promptText: `Add a conformed dimension table inside @${label}`,
        icon: Plus,
      },
      {
        id: "mart-link",
        label: `Connect into @${label}`,
        promptText: `Connect upstream transformation outputs into @${label}`,
        icon: Link2,
      },
      {
        id: "mart-audit",
        label: `Audit @${label} schema`,
        promptText: `Review the dimensional star schema inside @${label}`,
        icon: Search,
      },
    ];
  }

  return [
    {
      id: "add-source",
      label: "Add source table",
      promptText: "Add a new PostgreSQL source table to the pipeline",
      icon: Plus,
    },
    {
      id: "add-sql",
      label: "Generate SQL transform",
      promptText:
        "Create a SQL transformation node to cleanse and join staging data",
      icon: Sparkles,
    },
    {
      id: "connect-dag",
      label: "Connect lineage",
      promptText: "Connect the unlinked nodes across the pipeline DAG",
      icon: Link2,
    },
    {
      id: "explain-dag",
      label: "Explain lineage",
      promptText: "Explain the current pipeline architecture and data lineage",
      icon: Search,
    },
  ];
}

const PROPOSAL_QUICK_CHIPS: QuickChip[] = [
  {
    id: "prop-kpi",
    label: "Add Customer LTV KPI",
    promptText:
      "Add an automated verification check for Customer Lifetime Value (LTV)",
    icon: Plus,
  },
  {
    id: "prop-tol",
    label: "Enforce strict 0 tolerance",
    promptText:
      "Enforce strict zero tolerance (±0.00%) across all financial mart measures",
    icon: Sparkles,
  },
  {
    id: "prop-scd2",
    label: "Add SCD-2 customer addresses",
    promptText:
      "Include customer address and territory mutations in the SCD Type-2 timeline",
    icon: Plus,
  },
  {
    id: "prop-part",
    label: "Partition by region & date",
    promptText:
      "Partition the fact_daily_revenue mart table by both date_key and region_code",
    icon: Link2,
  },
];

export function WorkspacePromptBar({
  className,
  disabled = false,
  placeholder,
  onSend,
}: WorkspacePromptBarProps = {}) {
  const [prompt, setPrompt] = useState("");
  const [detachedNodeId, setDetachedNodeId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const isDeactivated = Boolean(disabled || isGenerating);

  const nodes = usePipelineStore((s) => s.nodes);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);

  // Only show workspace node context when mounted on the Workspace (no custom onSend override)
  const isWorkspaceMode = !onSend;

  // Reset detached state whenever the user selects a different node on the canvas
  useEffect(() => {
    setDetachedNodeId(null);
  }, [selectedNodeId]);

  const activeContextNode: PipelineNode | null =
    isWorkspaceMode && selectedNodeId && selectedNodeId !== detachedNodeId
      ? (nodes.find((n) => n.id === selectedNodeId) ?? null)
      : null;

  const quickChips = getQuickChips(activeContextNode);
  const chipsToDisplay = isWorkspaceMode ? quickChips : PROPOSAL_QUICK_CHIPS;

  // Auto-grow textarea with content and preserve formatting
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(Math.max(scrollHeight, 24), 200)}px`;
  }, [prompt]);

  const handleChipClick = (chipPrompt: string) => {
    if (isDeactivated) return;
    setPrompt(chipPrompt);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isDeactivated) return;

    // Prepend node context tag if a node is attached and not already mentioned
    const finalPrompt =
      activeContextNode && !trimmed.includes(`@${activeContextNode.data.label}`)
        ? `@${activeContextNode.data.label} ${trimmed}`
        : trimmed;

    if (onSend) {
      onSend(finalPrompt);
    } else {
      void sendMessage(finalPrompt);
    }
    setPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isPositionedExternally =
    className?.includes("relative") || className?.includes("static");

  const renderNodeCategoryIcon = (
    category: PipelineNode["data"]["category"],
  ) => {
    if (category === "resource")
      return <Database size={11} className="text-[#064C1C]" />;
    if (category === "processing")
      return <Code2 size={11} className="text-[#D66F14]" />;
    return <Boxes size={11} className="text-[#334139]" />;
  };

  return (
    <div
      className={cn(
        isPositionedExternally
          ? "w-full pointer-events-auto"
          : "fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40 pointer-events-none",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 pointer-events-auto w-full max-w-2xl mx-auto">
        {/* Quick Prompt Suggestion Chips */}
        {!isDeactivated && chipsToDisplay.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-2">
            {chipsToDisplay.map((chip) => {
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleChipClick(chip.promptText)}
                  style={{ backgroundColor: "#FDFFFC" }}
                  className="inline-flex items-center px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-[#1E2D24] border border-[#334139]/20 hover:border-[#064C1C] hover:text-[#064C1C] hover:bg-white shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none"
                >
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Prompt Input Bar: Optional Selected Node Context Pill, Multiline Text in CENTER, Slanted Arrow on RIGHT */}
        <form
          onSubmit={handleSubmit}
          style={{ backgroundColor: "#FDFFFC" }}
          className={cn(
            "w-full flex flex-col gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-3xl md:rounded-[36px] border border-[#334139]/20 shadow-lg transition-all",
            isDeactivated
              ? "opacity-70 bg-[#FDFFFC]/80 cursor-not-allowed border-[#334139]/15"
              : "focus-within:border-[#064C1C] focus-within:ring-2 focus-within:ring-[#064C1C]/15",
          )}
        >
          {/* Selected Node Context Pill */}
          {activeContextNode && (
            <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#064C1C]/[0.07] border border-[#064C1C]/20 text-[11px] font-mono font-semibold text-[#1E2D24]">
                {renderNodeCategoryIcon(activeContextNode.data.category)}
                <span>@{activeContextNode.data.label}</span>
                <span className="text-[9.5px] uppercase tracking-wider text-[#334139]/55 font-sans font-bold">
                  · {activeContextNode.data.category}
                </span>
                <button
                  type="button"
                  onClick={() => setDetachedNodeId(activeContextNode.id)}
                  className="ml-0.5 p-0.5 rounded-full text-[#334139]/50 hover:text-[#334139] hover:bg-[#334139]/10 transition-colors cursor-pointer"
                  aria-label={`Detach @${activeContextNode.data.label} context`}
                  title="Detach node from prompt"
                >
                  <X size={11} />
                </button>
              </div>
              <span className="text-[10px] text-[#334139]/45 font-sans hidden sm:inline">
                Targeting selected node
              </span>
            </div>
          )}

          <div className="w-full flex items-end gap-2">
            {/* Central Multiline Auto-Growing Textarea (No Scrollbar) */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isDeactivated}
              placeholder={
                isDeactivated
                  ? placeholder || "AI is responding... Please wait"
                  : activeContextNode
                    ? `Ask AuraBI about @${activeContextNode.data.label}... (Shift+Enter for new line)`
                    : placeholder ||
                      "Ask AuraBI to build, transform, or analyze your pipeline... (Shift+Enter for new line)"
              }
              aria-label="Workspace prompt input"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
              className={cn(
                "flex-1 bg-transparent border-none outline-none text-sm text-[#334139] font-sans px-2 py-1.5 min-w-0 resize-none max-h-[200px] overflow-y-auto leading-relaxed whitespace-pre-wrap selection:bg-[#064C1C]/15 no-scrollbar",
                isDeactivated
                  ? "placeholder:text-[#334139]/30 cursor-not-allowed"
                  : "placeholder:text-[#334139]/40",
              )}
            />

            {/* Send Icon on the RIGHT: Slanted Arrow */}
            <button
              type="submit"
              disabled={!prompt.trim() || isDeactivated}
              style={{
                backgroundColor:
                  prompt.trim() && !isDeactivated ? "#064C1C" : "#334139",
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#FDFFFC] transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-xs mb-0.5 cursor-pointer"
              title={
                isDeactivated
                  ? "Send deactivated while agent responds"
                  : "Send prompt to agent"
              }
              aria-label="Send prompt"
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
