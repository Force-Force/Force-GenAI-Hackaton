import { Layers, BookOpen } from 'lucide-react';
import { usePipelineStore } from '../../workspace/store/pipelineStore';

/** Default inspector view shown when nothing is selected. */
export function WorkspaceMetrics() {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);

  const processing = nodes.filter((n) => n.data.category === 'processing').length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <Layers size={13} className="text-[#4F46E5] dark:text-indigo-400" />
          <span>Workspace Metrics</span>
        </div>
        <h3 className="text-md font-sans font-semibold text-slate-800 dark:text-slate-100 mt-1">Pipeline Overview</h3>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <Metric label="Nodes" value={nodes.length} tone="text-slate-800 dark:text-slate-100" />
        <Metric label="Connections" value={edges.length} tone="text-indigo-600 dark:text-indigo-400" />
        <Metric label="Processing" value={processing} tone="text-purple-600 dark:text-fuchsia-400" />
        <Metric label="Resources" value={nodes.length - processing} tone="text-sky-600 dark:text-sky-400" />
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 rounded-lg p-4">
        <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
          <BookOpen size={13} className="text-indigo-600 dark:text-indigo-400" />
          <span>Architect Handbook</span>
        </h4>
        <p className="text-[11.5px] text-indigo-900 dark:text-indigo-200/80 leading-relaxed mt-2">
          Select any node to inspect it. Source and transformation nodes show their technology and generated code; warehouse and database nodes expand in place to reveal their tables.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 p-3 rounded-lg">
      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest block">{label}</span>
      <span className={`text-xl font-bold font-mono ${tone}`}>{value}</span>
    </div>
  );
}
