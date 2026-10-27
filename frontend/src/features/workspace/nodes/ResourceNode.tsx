import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import type { ResourceNode as ResourceNodeType } from "../../../types/pipeline";
import { cn } from "../../../utils/cn";
import { sourceBadge } from "./techMeta";
import { ResourceInfoWidget } from "../widgets/ResourceInfoWidget";
import { useBackendStore } from "../../../services/session/backendSession";

/**
 * External source node (Section 8). Compact rectangular card — NOT a table —
 * showing the source name, kind, a technology icon, and a tech badge so the
 * stack is identifiable at a glance (Section 9). A read-only info widget with
 * the column structure surfaces via NodeToolbar on selection.
 */
export function ResourceNode({
  id,
  data,
  selected,
}: NodeProps<ResourceNodeType>) {
  const tech = sourceBadge(data);
  const { Icon } = tech;
  const activeRun = useBackendStore((s) => s.activeRun);

  const isCurrent = activeRun?.current_node_id === id;
  const isPausedGate =
    isCurrent &&
    (activeRun?.status === "AWAITING_APPROVAL" ||
      activeRun?.status === "AWAITING_USER_INPUT");
  const isRunning = isCurrent && activeRun?.status === "RUNNING";
  const completedList = Array.isArray(activeRun?.context?.completed_nodes)
    ? (activeRun?.context?.completed_nodes as string[])
    : [];
  const isCompleted =
    !isCurrent &&
    Boolean(activeRun?.status === "COMPLETED" || completedList.includes(id));

  return (
    <div
      className={cn(
        "w-[224px] rounded-xl border bg-white shadow-md transition-all hover:shadow-lg",
        isPausedGate
          ? "border-amber-500 ring-2 ring-amber-500/35"
          : isRunning
            ? "border-emerald-500 ring-2 ring-emerald-500/35"
            : selected
              ? "border-[#10B981] ring-2 ring-[#10B981]/30"
              : "border-slate-200",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-slate-400"
      />

      <NodeToolbar isVisible={selected} position={Position.Top}>
        <ResourceInfoWidget data={data} />
      </NodeToolbar>

      <div className="flex items-center gap-3 p-3">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
            tech.tile,
          )}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-sans font-bold text-slate-800 truncate">
            {data.label}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            {data.kind} source
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-100">
        <span
          className={cn(
            "text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
            tech.badge,
          )}
        >
          {tech.label}
        </span>
        {isPausedGate ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldAlert size={10} />
            Gate
          </span>
        ) : isRunning ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Loader2 size={10} className="animate-spin" />
            Streaming
          </span>
        ) : isCompleted ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={10} />
            Verified
          </span>
        ) : (
          <span className="text-[9px] font-mono text-slate-400">
            {data.columns.length} cols
          </span>
        )}
      </div>
    </div>
  );
}
