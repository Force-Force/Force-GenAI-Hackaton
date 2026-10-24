import { useState } from "react";
import { Check, Sparkles, Wand2, AlertCircle } from "lucide-react";
import type {
  UiopEnvelope,
  UiopExecutionReport,
  UiopOperation,
} from "../../../contracts/uiop";
import { useChatStore } from "../../chat/store/chatStore";
import { usePlanStore } from "../store/planStore";

export function summarizeUiopOperation(op: UiopOperation): {
  badge: string;
  title: string;
  detail: string;
} {
  switch (op.op) {
    case "node.add":
      return {
        badge: "node.add",
        title: `Add ${op.params.type}: ${op.params.data.label}`,
        detail:
          op.params.data.columns && op.params.data.columns.length > 0
            ? `Columns: ${op.params.data.columns.map((c) => c.name).join(", ")}`
            : op.params.data.language
              ? `Engine: ${op.params.data.language.toUpperCase()}`
              : `ID: ${op.params.id}`,
      };
    case "node.update":
      return {
        badge: "node.update",
        title: `Update node: ${op.params.id}`,
        detail: op.params.data?.label
          ? `Label: ${op.params.data.label}`
          : op.params.data?.columns
            ? `${op.params.data.columns.length} columns updated`
            : "Updated node properties",
      };
    case "node.remove":
      return {
        badge: "node.remove",
        title: `Remove node: ${op.params.id}`,
        detail: op.params.cascadeEdges
          ? "Cascade edges"
          : "Strict dependency check",
      };
    case "edge.add":
      return {
        badge: "edge.add",
        title: `Connect ${op.params.source} → ${op.params.target}`,
        detail: `Type: ${op.params.type}`,
      };
    case "edge.update":
      return {
        badge: "edge.update",
        title: `Update edge: ${op.params.id}`,
        detail: op.params.data.label ?? "Updated relationship metadata",
      };
    case "edge.remove":
      return {
        badge: "edge.remove",
        title: `Remove edge: ${op.params.id}`,
        detail: "Disconnect lineage link",
      };
    case "layout.update":
      return {
        badge: "layout.update",
        title: `Auto-layout DAG (${op.params.direction})`,
        detail: op.params.positions
          ? `${Object.keys(op.params.positions).length} explicit node positions`
          : "Dagre topological layout",
      };
    case "panel.add":
      return {
        badge: "panel.add",
        title: `Add Panel: ${op.params.title}`,
        detail: `Component: ${op.params.component}`,
      };
    case "panel.update":
      return {
        badge: "panel.update",
        title: `Update Panel: ${op.params.id}`,
        detail: op.params.title ?? "Modified panel config",
      };
    case "panel.remove":
      return {
        badge: "panel.remove",
        title: `Remove Panel: ${op.params.id}`,
        detail: "Close registered UI panel",
      };
    case "report.update":
      return {
        badge: "report.update",
        title: `Update Report: ${op.params.title}`,
        detail: `${op.params.sections.length} section(s)`,
      };
    case "plan.create":
      return {
        badge: "plan.create",
        title: `Create Plan: ${op.params.title}`,
        detail: `${op.params.stages.length} architectural stage(s)`,
      };
    case "plan.update":
      return {
        badge: "plan.update",
        title: `Update Plan${op.params.title ? `: ${op.params.title}` : ""}`,
        detail: op.params.kpis
          ? `${op.params.kpis.length} KPIs configured`
          : "Updated plan specification",
      };
    case "question.propose":
      return {
        badge: "question.propose",
        title: op.params.question,
        detail: `${op.params.options.length} decision options`,
      };
    case "question.answer":
      return {
        badge: "question.answer",
        title: `Answer question: ${op.params.id}`,
        detail: `Selected option: ${op.params.optionId}`,
      };
    case "question.remove":
      return {
        badge: "question.remove",
        title: `Remove question: ${op.params.id}`,
        detail: "Dismiss clarifying question",
      };
  }
}

export function UiopBatchCard({ envelope }: { envelope: UiopEnvelope }) {
  const applyUiop = useChatStore((s) => s.applyUiop);
  const processedMessageIds = usePlanStore((s) => s.processedMessageIds);
  const [lastReport, setLastReport] = useState<UiopExecutionReport | null>(
    null,
  );

  const isApplied =
    processedMessageIds.includes(envelope.messageId) || lastReport?.ok === true;

  const handleApply = () => {
    const report = applyUiop(envelope);
    setLastReport(report);
  };

  return (
    <div className="mt-2.5 pt-2 border-t border-[#334139]/12 space-y-2.5 font-sans">
      <div className="rounded-xl bg-[#334139]/[0.03] border border-[#334139]/12 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#D66F14]">
            <Sparkles size={12} />
            <span>
              Pipeline Operations ({envelope.operations.length})
            </span>
          </div>
          <span className="text-xs text-[#334139]/50 tabular-nums">
            rev #{envelope.baseRevision}
          </span>
        </div>

        <div className="space-y-1.5">
          {envelope.operations.map((op, idx) => {
            const meta = summarizeUiopOperation(op);
            return (
              <div
                key={idx}
                className="rounded-lg bg-white border border-[#334139]/10 px-3 py-2 space-y-0.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#1E2D24] truncate">
                    {meta.title}
                  </span>
                  <code className="px-1.5 py-0.5 rounded bg-[#064C1C]/10 text-[#064C1C] font-mono text-[11px] font-semibold shrink-0">
                    {meta.badge}
                  </code>
                </div>
                <div className="text-xs text-[#334139]/70 truncate font-sans">
                  {meta.detail}
                </div>
              </div>
            );
          })}
        </div>

        {lastReport && !lastReport.ok && (
          <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span>{lastReport.errors.map((e) => e.message).join("; ")}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isApplied ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#064C1C]/10 text-[#064C1C]">
            <Check size={13} strokeWidth={3} />
            <span>Changes Applied to Pipeline</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#064C1C] hover:bg-[#1E2D24] text-[#FDFFFC] transition-colors cursor-pointer shadow-xs"
          >
            <Wand2 size={13} />
            <span>Apply Changes to Pipeline</span>
          </button>
        )}
      </div>
    </div>
  );
}
