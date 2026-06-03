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
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
          <Layers size={13} className="text-[#4F46E5]" />
          <span>Workspace Metrics</span>
        </div>
        <h3 className="text-md font-sans font-semibold text-slate-800 mt-1">Pipeline Overview</h3>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <Metric label="Nodes" value={nodes.length} tone="text-slate-800" />
        <Metric label="Connections" value={edges.length} tone="text-indigo-600" />
        <Metric label="Processing" value={processing} tone="text-purple-600" />
        <Metric label="Resources" value={nodes.length - processing} tone="text-sky-600" />
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
        <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
          <BookOpen size={13} className="text-indigo-600" />
          <span>Architect Handbook</span>
        </h4>
        <p className="text-[11.5px] text-indigo-900 leading-relaxed mt-2">
          Select any node to inspect it. Resource nodes show structure, processing nodes open a code editor, and datamarts drill into a dedicated sub-canvas.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg">
      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest block">{label}</span>
      <span className={`text-xl font-bold font-mono ${tone}`}>{value}</span>
    </div>
  );
}
