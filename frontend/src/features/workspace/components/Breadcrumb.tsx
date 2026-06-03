import { ChevronRight, Home } from 'lucide-react';
import { usePipelineStore } from '../store/pipelineStore';

/** Datamart drill-in breadcrumb. Hidden at the root pipeline view. */
export function Breadcrumb() {
  const viewStack = usePipelineStore((s) => s.viewStack);
  const exitToRoot = usePipelineStore((s) => s.exitToRoot);
  const exitToFrame = usePipelineStore((s) => s.exitToFrame);

  if (viewStack.length === 0) return null;

  return (
    <nav
      aria-label="Datamart navigation"
      className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono"
    >
      <button
        onClick={exitToRoot}
        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-[#4F46E5] dark:hover:text-indigo-300 cursor-pointer"
      >
        <Home size={12} /> Pipeline
      </button>
      {viewStack.map((frame, i) => (
        <span key={frame.datamartId} className="flex items-center gap-1">
          <ChevronRight size={12} className="text-slate-300 dark:text-slate-600" />
          <button
            onClick={() => exitToFrame(i)}
            className="text-slate-700 dark:text-slate-200 hover:text-[#4F46E5] dark:hover:text-indigo-300 cursor-pointer font-semibold disabled:cursor-default"
            disabled={i === viewStack.length - 1}
          >
            {frame.label}
          </button>
        </span>
      ))}
    </nav>
  );
}
