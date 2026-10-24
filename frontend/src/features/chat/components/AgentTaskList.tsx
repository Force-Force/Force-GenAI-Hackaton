import { Workflow, ShieldCheck } from "lucide-react";
import { cn } from "../../../utils/cn";
import type { AgentTask } from "../types";
import { navigateTo } from "../../../utils/navigation";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  RUNNING: "bg-sky-50 text-sky-700 border-sky-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
};

/**
 * Renders the Master Agent's delegated builder tasks.
 * Auditing is strictly separated: AUDITOR agents are filtered out from builder lists
 * and isolated to the Independent Audit Center so builders never grade their own work.
 */
export function AgentTaskList({ tasks }: { tasks: AgentTask[] }) {
  // Strictly filter out any AUDITOR role tasks from the builder task list
  const builderTasks = tasks.filter(
    (t) => !t.agent_role?.toUpperCase().includes("AUDIT"),
  );
  const auditorTasksCount = tasks.length - builderTasks.length;

  if (tasks.length === 0) return null;

  return (
    <div className="mt-3 border-t border-slate-200 pt-2.5">
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600 uppercase tracking-wide">
          <Workflow size={13} className="text-indigo-600" />
          <span>Delegated Builder Agents ({builderTasks.length})</span>
        </div>
        {auditorTasksCount > 0 && (
          <span className="text-[10px] font-mono font-semibold text-[#064C1C] bg-[#064C1C]/10 px-2 py-0.5 rounded">
            Auditor Isolated
          </span>
        )}
      </div>

      {builderTasks.length > 0 ? (
        <div className="space-y-2">
          {builderTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
            >
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold text-slate-800">
                  {task.agent_role}
                </div>
                {task.instruction && (
                  <div className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {task.instruction}
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                  STATUS_STYLES[task.status] ??
                    "bg-slate-100 text-slate-600 border-slate-200",
                )}
              >
                {task.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-500 italic py-1">
          No builder sub-agents assigned.
        </div>
      )}

      {/* Segregation of duties reinforcement badge */}
      {auditorTasksCount > 0 && (
        <button
          type="button"
          onClick={() => navigateTo("/audit")}
          className="mt-2.5 w-full flex items-center justify-between p-2.5 rounded-lg bg-[#064C1C]/5 border border-[#064C1C]/20 text-left hover:bg-[#064C1C]/10 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#064C1C] shrink-0" />
            <span className="text-xs font-medium text-[#1E2D24]">
              {auditorTasksCount} Independent Audit Agent task
              {auditorTasksCount > 1 ? "s" : ""} segregated
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-[#064C1C] group-hover:underline">
            View Audit Room →
          </span>
        </button>
      )}
    </div>
  );
}
