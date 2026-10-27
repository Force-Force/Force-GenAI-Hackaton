import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import type { ProcessingNode as ProcessingNodeType } from "../../../types/pipeline";
import { cn } from "../../../utils/cn";
import { engineBadge } from "./techMeta";
import { useBackendStore } from "../../../services/session/backendSession";

/**
 * Treatment / transformation node (Section 8). A rectangular block — NOT a
 * table — that surfaces the transformation name and the technology in use
 * (Python / SQL / Spark / Pandas) via an icon tile and tech badge (Section 9).
 */
export function ProcessingNode({
  id,
  data,
  selected,
}: NodeProps<ProcessingNodeType>) {
  const tech = engineBadge(data);
  const { Icon } = tech;
  const activeRun = useBackendStore((s) => s.activeRun);

  const isCurrent = activeRun?.current_node_id === id;
  const isPausedGate =
    isCurrent &&
    (activeRun?.status === "PAUSED" ||
      activeRun?.status === "AWAITING_APPROVAL");
  const isRunning = isCurrent && activeRun?.status === "RUNNING";
  const isCompleted =
    !isCurrent &&
    Boolean(
      activeRun?.status === "COMPLETED" ||
      activeRun?.context?.completed_nodes?.includes(id),
    );

  return (
    <div
      className={cn(
        "w-[224px] rounded-xl border bg-white shadow-md transition-all hover:shadow-lg",
        isPausedGate
          ? "border-amber-500 ring-2 ring-amber-500/40"
          : isRunning
            ? "border-purple-500 ring-2 ring-purple-500/35"
            : selected
              ? "border-[#A855F7] ring-2 ring-[#A855F7]/30"
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
          <div className="text-[10px] font-mono uppercase tracking-wider text-purple-500">
            Transformation
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
            Guardian Gate
          </span>
        ) : isRunning ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
            <Loader2 size={10} className="animate-spin" />
            Running
          </span>
        ) : isCompleted ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={10} />
            Verified
          </span>
        ) : (
          <span className="text-[9px] font-mono text-slate-400">
            {data.inputColumns.length} in / {data.outputColumns.length} out
          </span>
        )}
      </div>
    </div>
  );
}
