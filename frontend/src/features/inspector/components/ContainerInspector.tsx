import { Trash2, Warehouse, Database, Boxes, ArrowRightToLine } from 'lucide-react';
import type { DatamartNode } from '../../../types/pipeline';
import { containerKindOf, isResourceNode } from '../../../types/pipeline';
import { Badge, Button } from '../../../components/ui';
import { usePipelineStore } from '../../workspace/store/pipelineStore';

const META = {
  warehouse: { Icon: Warehouse, label: 'Data Warehouse', tone: 'text-indigo-600' },
  database: { Icon: Database, label: 'Imported Database', tone: 'text-sky-600' },
  datamart: { Icon: Boxes, label: 'Data Mart', tone: 'text-amber-600' },
} as const;

export function ContainerInspector({ node }: { node: DatamartNode }) {
  const kind = containerKindOf(node.data);
  const meta = META[kind];
  const { Icon } = meta;
  const deleteNode = usePipelineStore((s) => s.deleteNode);
  const enterDatamart = usePipelineStore((s) => s.enterDatamart);
  const toggleExpanded = usePipelineStore((s) => s.toggleNodeExpanded);
  const tables = node.data.children.nodes.filter(isResourceNode);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-slate-150 pb-3">
        <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider ${meta.tone}`}>
          <Icon size={12} />
          <span>{meta.label}</span>
        </div>
        <h3 className="text-md font-sans font-bold text-slate-800 mt-1">{node.data.label}</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{node.data.description}</p>
      </div>

      <div className="space-y-2">
        <div className="text-[10.5px] font-mono font-bold text-slate-400 uppercase">
          Tables ({tables.length})
        </div>
        <div className="space-y-1.5">
          {tables.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-150"
            >
              <span className="text-[11px] font-mono font-semibold text-slate-700 truncate">
                {t.data.label}
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                {t.data.columns.length} cols
              </span>
            </div>
          ))}
        </div>
      </div>

      {kind === 'datamart' ? (
        <Button variant="secondary" onClick={() => enterDatamart(node.id)}>
          <ArrowRightToLine size={13} /> Open Mart
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => toggleExpanded(node.id)}>
          {node.data.expanded ? 'Collapse' : 'Expand'} Tables
        </Button>
      )}

      <div className="flex items-center justify-between">
        <Badge tone="info">{kind}</Badge>
        <Button variant="danger" onClick={() => deleteNode(node.id)} aria-label="Delete node">
          <Trash2 size={13} /> Delete
        </Button>
      </div>
    </div>
  );
}
