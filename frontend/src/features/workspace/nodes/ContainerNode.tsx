import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Key,
  Link2,
  ArrowRightToLine,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type {
  DatamartNode as DatamartNodeType,
  ResourceNodeData,
} from "../../../types/pipeline";
import { containerKindOf } from "../../../types/pipeline";
import { cn } from "../../../utils/cn";
import { usePipelineStore } from "../store/pipelineStore";
import { useBackendStore } from "../../../services/session/backendSession";

interface ContainerTheme {
  letter: string;
  title: string;
  accentTile: string;
  accentText: string;
  selectedRing: string;
}

const THEMES: Record<"warehouse" | "database" | "datamart", ContainerTheme> = {
  warehouse: {
    letter: "W",
    title: "Data Warehouse",
    accentTile: "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white",
    accentText: "text-indigo-600",
    selectedRing: "border-[#4F46E5] ring-2 ring-[#4F46E5]/30",
  },
  database: {
    letter: "D",
    title: "Imported Database",
    accentTile: "bg-gradient-to-br from-cyan-500 to-sky-700 text-white",
    accentText: "text-sky-600",
    selectedRing: "border-[#06B6D4] ring-2 ring-[#06B6D4]/30",
  },
  datamart: {
    letter: "M",
    title: "Data Mart",
    accentTile: "bg-gradient-to-br from-amber-400 to-orange-600 text-white",
    accentText: "text-amber-600",
    selectedRing: "border-amber-500 ring-2 ring-amber-500/30",
  },
};

/**
 * Intelligent container node (Section 8). Warehouse ("W") and Database ("D")
 * nodes appear as a single large block and expand in place to reveal their
 * tables in a structured, database-oriented tabular layout (Section 1).
 * Datamart containers keep the drill-in sub-canvas behaviour.
 */
export function ContainerNode({
  id,
  data,
  selected,
}: NodeProps<DatamartNodeType>) {
  const kind = containerKindOf(data);
  const theme = THEMES[kind];
  const toggleExpanded = usePipelineStore((s) => s.toggleNodeExpanded);
  const enterDatamart = usePipelineStore((s) => s.enterDatamart);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const activeRun = useBackendStore((s) => s.activeRun);

  const tables = data.children.nodes.filter(
    (n) => n.data.category === "resource",
  );
  const isDrillIn = kind === "datamart";
  const expanded = !isDrillIn && Boolean(data.expanded);

  const isCurrent = activeRun?.current_node_id === id;
  const isRunning = isCurrent && activeRun?.status === "RUNNING";
  const completedList = Array.isArray(activeRun?.context?.completed_nodes)
    ? (activeRun?.context?.completed_nodes as string[])
    : [];
  const isCompleted =
    !isCurrent &&
    Boolean(activeRun?.status === "COMPLETED" || completedList.includes(id));

  const onActivate = () => {
    selectNode(id);
    if (isDrillIn) enterDatamart(id);
    else toggleExpanded(id);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-white shadow-lg transition-all",
        expanded ? "w-[320px]" : "w-[260px]",
        isRunning
          ? "border-emerald-500 ring-2 ring-emerald-500/35"
          : selected
            ? theme.selectedRing
            : "border-slate-300",
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

      {/* Header — always visible (collapsed metadata). */}
      <button
        type="button"
        onClick={onActivate}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
        aria-expanded={isDrillIn ? undefined : expanded}
        aria-label={`${theme.title} ${data.label}. ${isDrillIn ? "Open" : expanded ? "Collapse" : "Expand"}`}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-xl shrink-0 shadow-inner font-black",
            theme.accentTile,
            expanded ? "w-11 h-11 text-xl" : "w-14 h-14 text-3xl",
          )}
        >
          {theme.letter}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-[10px] font-mono uppercase tracking-wider font-bold",
              theme.accentText,
            )}
          >
            {theme.title}
          </div>
          <div className="text-[15px] font-sans font-black text-slate-800 truncate leading-tight">
            {data.label}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
            <span>
              {tables.length} {tables.length === 1 ? "table" : "tables"}
            </span>
            {isRunning && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <Loader2 size={9} className="animate-spin" />
                Syncing
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <CheckCircle2 size={9} />
                Verified
              </span>
            )}
          </div>
        </div>
        {isDrillIn ? (
          <ArrowRightToLine size={16} className="text-slate-400 shrink-0" />
        ) : (
          <ChevronDown
            size={18}
            className={cn(
              "text-slate-400 shrink-0 transition-transform duration-300",
              expanded && "rotate-180",
            )}
          />
        )}
      </button>

      {/* Expanded internal tables — structured tabular layout. */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="tables"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="nowheel px-3 pb-3 pt-1 space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar">
              {tables.map((table) => (
                <WarehouseTable
                  key={table.id}
                  data={table.data as ResourceNodeData}
                />
              ))}
              {tables.length === 0 && (
                <div className="text-[10px] font-mono text-slate-400 text-center py-3">
                  No tables in this container yet.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A single database table rendered as a compact schema grid (not a card). */
function WarehouseTable({ data }: { data: ResourceNodeData }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50/60">
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-100 border-b border-slate-200">
        <span className="text-[11px] font-mono font-bold text-slate-700 truncate">
          {data.label}
        </span>
        {data.warehouseRole && (
          <span className="text-[8px] font-mono uppercase tracking-wider text-slate-400">
            {data.warehouseRole}
          </span>
        )}
      </div>
      <table className="w-full font-mono text-[10px]">
        <tbody>
          {data.columns.map((col) => (
            <tr
              key={col.name}
              className="border-b border-slate-100 last:border-b-0"
            >
              <td className="px-2 py-1 w-4">
                {col.isPrimaryKey ? (
                  <Key size={10} className="text-indigo-600" />
                ) : col.isForeignKey ? (
                  <Link2 size={10} className="text-emerald-600" />
                ) : (
                  <span className="text-slate-300">•</span>
                )}
              </td>
              <td className="px-1 py-1 text-slate-700 truncate">
                {col.name}
                {col.isForeignKey && col.fkRefTable && (
                  <span className="text-emerald-600/70">
                    {" "}
                    → {col.fkRefTable}
                  </span>
                )}
              </td>
              <td className="px-2 py-1 text-right text-slate-400 uppercase whitespace-nowrap">
                {col.type}
              </td>
            </tr>
          ))}
          {data.columns.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className="px-2 py-1.5 text-slate-400 text-center"
              >
                No columns
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
