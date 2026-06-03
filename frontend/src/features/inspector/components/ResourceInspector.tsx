import { useState, type FormEvent } from 'react';
import { Trash2, Key, Database } from 'lucide-react';
import type { Column, ResourceNode } from '../../../types/pipeline';
import { Badge, Button } from '../../../components/ui';
import { usePipelineStore } from '../../workspace/store/pipelineStore';

const COLUMN_TYPES = ['INT', 'VARCHAR(100)', 'DECIMAL(10,2)', 'BOOLEAN', 'DATE', 'TIMESTAMP'];

export function ResourceInspector({ node }: { node: ResourceNode }) {
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const deleteNode = usePipelineStore((s) => s.deleteNode);
  const [name, setName] = useState('');
  const [type, setType] = useState(COLUMN_TYPES[0]);
  const [isPk, setIsPk] = useState(false);

  const addColumn = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const col: Column = { name: name.trim(), type, isPrimaryKey: isPk, isForeignKey: false };
    updateNodeData(node.id, { columns: [...node.data.columns, col] });
    setName('');
    setIsPk(false);
  };

  const removeColumn = (colName: string) => {
    updateNodeData(node.id, {
      columns: node.data.columns.filter((c) => c.name !== colName),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-slate-150 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-sky-600 dark:text-sky-300 uppercase tracking-wider">
          <Database size={12} />
          <span>Resource ({node.data.kind})</span>
        </div>
        <h3 className="text-md font-sans font-bold text-slate-800 dark:text-slate-100 mt-1">{node.data.label}</h3>
        <textarea
          value={node.data.description}
          onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
          className="w-full text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 outline-none p-2 rounded border border-slate-200 dark:border-slate-700 focus:border-[#4F46E5] mt-2 resize-none h-16 font-sans leading-relaxed"
          placeholder="Description..."
          aria-label="Resource description"
        />
      </div>

      <div className="space-y-2">
        <div className="text-[10.5px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
          Columns ({node.data.columns.length})
        </div>
        <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
          {node.data.columns.map((col) => (
            <div key={col.name} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-1.5 rounded border border-slate-150 dark:border-slate-700">
              <span className="flex items-center gap-1 truncate">
                {col.isPrimaryKey ? (
                  <Key size={11} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                ) : (
                  <span className="text-slate-300 dark:text-slate-600 font-bold shrink-0">•</span>
                )}
                <span className="truncate text-slate-700 dark:text-slate-200 font-semibold">{col.name}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">{col.type}</span>
              </span>
              <button
                onClick={() => removeColumn(col.name)}
                className="text-slate-400 hover:text-[#EF4444] p-0.5 rounded cursor-pointer"
                aria-label={`Delete column ${col.name}`}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={addColumn} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-2">
        <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 block uppercase">Add Column</span>
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="column_id"
            aria-label="New column name"
            className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 p-1 px-2 rounded font-mono outline-none focus:border-[#4F46E5]"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="New column type"
            className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 p-1 rounded font-mono outline-none focus:border-[#4F46E5]"
          >
            {COLUMN_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={isPk} onChange={(e) => setIsPk(e.target.checked)} className="accent-indigo-600" />
            <span>Surrogate PK</span>
          </label>
          <Button type="submit" variant="primary" disabled={!name.trim()} className="px-3.5 py-1">
            Add
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <Badge tone="info">{node.data.warehouseRole ?? 'resource'}</Badge>
        <Button variant="danger" onClick={() => deleteNode(node.id)} aria-label="Delete node">
          <Trash2 size={13} /> Delete Node
        </Button>
      </div>
    </div>
  );
}
