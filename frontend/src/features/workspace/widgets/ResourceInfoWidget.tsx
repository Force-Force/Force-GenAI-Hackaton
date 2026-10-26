import { Key, Link2 } from 'lucide-react';
import type { ResourceNodeData } from '../../../types/pipeline';

/**
 * Lightweight, read-only information widget shown next to a selected resource
 * node. Displays structure + metadata only; no navigation, no editor.
 */
export function ResourceInfoWidget({ data }: { data: ResourceNodeData }) {
  return (
    <div className="w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-left">
      <div className="flex items-center justify-between">
        <span className="text-xs font-sans font-bold text-slate-800">{data.label}</span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
          {data.kind}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{data.description}</p>

      <div className="mt-2 border-t border-slate-100 pt-2 space-y-1 max-h-40 overflow-y-auto font-mono text-[10.5px] custom-scrollbar">
        {data.columns.map((col) => (
          <div key={col.name} className="flex items-center justify-between">
            <span className="flex items-center gap-1 truncate text-slate-700">
              {col.isPrimaryKey ? (
                <Key size={10} className="text-indigo-600 shrink-0" />
              ) : col.isForeignKey ? (
                <Link2 size={10} className="text-emerald-600 shrink-0" />
              ) : (
                <span className="text-slate-300">•</span>
              )}
              <span className="truncate">{col.name}</span>
            </span>
            <span className="text-[9px] text-slate-400 uppercase">{col.type}</span>
          </div>
        ))}
        {data.columns.length === 0 && (
          <div className="text-[10px] text-slate-400">No columns</div>
        )}
      </div>

      {data.metadata && Object.keys(data.metadata).length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500 font-mono">
          {Object.entries(data.metadata).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-slate-400">{k}</span>
              <span>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
