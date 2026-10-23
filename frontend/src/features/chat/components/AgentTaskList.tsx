import { Workflow } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { AgentTask } from '../../../contracts/backend';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  RUNNING: 'bg-sky-50 text-sky-700 border-sky-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
};

/** Renders the Master Agent's delegated sub-agent tasks under a chat reply. */
export function AgentTaskList({ tasks }: { tasks: AgentTask[] }) {
  return (
    <div className="mt-3 border-t border-slate-200 pt-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide mb-1.5">
        <Workflow size={12} className="text-indigo-600" />
        <span>Delegated Agents ({tasks.length})</span>
      </div>
      <div className="space-y-1.5">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-200 rounded p-2"
          >
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold text-slate-800">
                {task.agent_role}
              </div>
              {task.instruction && (
                <div className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-2">
                  {task.instruction}
                </div>
              )}
            </div>
            <span
              className={cn(
                'shrink-0 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                STATUS_STYLES[task.status] ?? 'bg-slate-100 text-slate-600 border-slate-200',
              )}
            >
              {task.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
