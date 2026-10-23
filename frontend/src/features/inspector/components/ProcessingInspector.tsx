import { Code2, Trash2 } from 'lucide-react';
import type { ProcessingNode } from '../../../types/pipeline';
import { Badge, Button } from '../../../components/ui';
import { CodeEditorWidget } from '../../workspace/widgets/CodeEditorWidget';
import { usePipelineStore } from '../../workspace/store/pipelineStore';

export function ProcessingInspector({ node }: { node: ProcessingNode }) {
  const deleteNode = usePipelineStore((s) => s.deleteNode);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-slate-150 pb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-600 uppercase tracking-wider">
          <Code2 size={12} />
          <span>Processing ({node.data.language})</span>
        </div>
        <h3 className="text-md font-sans font-bold text-slate-800 mt-1">{node.data.label}</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{node.data.description}</p>
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-mono text-slate-400 uppercase block">Source Inlets</span>
        <div className="flex flex-wrap gap-1 font-mono text-[10px]">
          {node.data.inputColumns.map((c) => (
            <Badge key={c} tone="neutral">{c}</Badge>
          ))}
        </div>
        <span className="text-[10px] font-mono text-slate-400 uppercase block mt-2">Target Outlets</span>
        <div className="flex flex-wrap gap-1 font-mono text-[10px]">
          {node.data.outputColumns.map((c) => (
            <Badge key={c} tone="info">{c}</Badge>
          ))}
        </div>
      </div>

      <CodeEditorWidget node={node} />

      <Button variant="danger" onClick={() => deleteNode(node.id)} aria-label="Delete node">
        <Trash2 size={13} /> Delete Node
      </Button>
    </div>
  );
}
