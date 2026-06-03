import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Key, Link2, ArrowRightToLine } from 'lucide-react';
import type { DatamartNode as DatamartNodeType, ResourceNodeData } from '../../../types/pipeline';
import { containerKindOf } from '../../../types/pipeline';
import { cn } from '../../../utils/cn';
import { usePipelineStore } from '../store/pipelineStore';

interface ContainerTheme {
  letter: string;
  title: string;
  accentTile: string;
  accentText: string;
  selectedRing: string;
}

const THEMES: Record<'warehouse' | 'database' | 'datamart', ContainerTheme> = {
  warehouse: {
    letter: 'W',
    title: 'Data Warehouse',
    accentTile: 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white',
    accentText: 'text-indigo-600 dark:text-indigo-300',
    selectedRing: 'border-[#4F46E5] ring-2 ring-[#4F46E5]/30 dark:border-indigo-400',
  },
  database: {
    letter: 'D',
    title: 'Imported Database',
    accentTile: 'bg-gradient-to-br from-cyan-500 to-sky-700 text-white',
    accentText: 'text-sky-600 dark:text-sky-300',
    selectedRing: 'border-[#06B6D4] ring-2 ring-[#06B6D4]/30 dark:border-cyan-400',
  },
  datamart: {
    letter: 'M',
    title: 'Data Mart',
    accentTile: 'bg-gradient-to-br from-amber-400 to-orange-600 text-white',
    accentText: 'text-amber-600 dark:text-amber-300',
    selectedRing: 'border-amber-500 ring-2 ring-amber-500/30 dark:border-amber-400',
  },
};

/**
 * Intelligent container node (Section 8). Warehouse ("W") and Database ("D")
 * nodes appear as a single large block and expand in place to reveal their
 * tables in a structured, database-oriented tabular layout (Section 1).
 * Datamart containers keep the drill-in sub-canvas behaviour.
 */
export function ContainerNode({ id, data, selected }: NodeProps<DatamartNodeType>) {
  const kind = containerKindOf(data);
  const theme = THEMES[kind];
  const toggleExpanded = usePipelineStore((s) => s.toggleNodeExpanded);
  const enterDatamart = usePipelineStore((s) => s.enterDatamart);
  const selectNode = usePipelineStore((s) => s.selectNode);

  const tables = data.children.nodes.filter((n) => n.data.category === 'resource');
  const isDrillIn = kind === 'datamart';
  const expanded = !isDrillIn && Boolean(data.expanded);

  const onActivate = () => {
    selectNode(id);
    if (isDrillIn) enterDatamart(id);
    else toggleExpanded(id);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-lg transition-all',
        expanded ? 'w-[320px]' : 'w-[260px]',
        selected ? theme.selectedRing : 'border-slate-300 dark:border-slate-700',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 dark:!bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 dark:!bg-slate-500" />

      {/* Header — always visible (collapsed metadata). */}
      <button
        type="button"
        onClick={onActivate}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
        aria-expanded={isDrillIn ? undefined : expanded}
        aria-label={`${theme.title} ${data.label}. ${isDrillIn ? 'Open' : expanded ? 'Collapse' : 'Expand'}`}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-xl shrink-0 shadow-inner font-black',
            theme.accentTile,
            expanded ? 'w-11 h-11 text-xl' : 'w-14 h-14 text-3xl',
          )}
        >
          {theme.letter}
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn('text-[10px] font-mono uppercase tracking-wider font-bold', theme.accentText)}>
            {theme.title}
          </div>
          <div className="text-[15px] font-sans font-black text-slate-800 dark:text-slate-100 truncate leading-tight">
            {data.label}
          </div>
          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
            {tables.length} {tables.length === 1 ? 'table' : 'tables'}
          </div>
        </div>
        {isDrillIn ? (
          <ArrowRightToLine size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
        ) : (
          <ChevronDown
            size={18}
            className={cn(
              'text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-300',
              expanded && 'rotate-180',
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
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="nowheel px-3 pb-3 pt-1 space-y-2.5 max-h-[420px] overflow-y-auto">
              {tables.map((table) => (
                <WarehouseTable key={table.id} data={table.data as ResourceNodeData} />
              ))}
              {tables.length === 0 && (
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 text-center py-3">
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
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50/60 dark:bg-slate-800/40">
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
          {data.label}
        </span>
        {data.warehouseRole && (
          <span className="text-[8px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {data.warehouseRole}
          </span>
        )}
      </div>
      <table className="w-full font-mono text-[10px]">
        <tbody>
          {data.columns.map((col) => (
            <tr
              key={col.name}
              className="border-b border-slate-100 dark:border-slate-800 last:border-b-0"
            >
              <td className="px-2 py-1 w-4">
                {col.isPrimaryKey ? (
                  <Key size={10} className="text-indigo-600 dark:text-indigo-400" />
                ) : col.isForeignKey ? (
                  <Link2 size={10} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                )}
              </td>
              <td className="px-1 py-1 text-slate-700 dark:text-slate-200 truncate">
                {col.name}
                {col.isForeignKey && col.fkRefTable && (
                  <span className="text-emerald-600/70 dark:text-emerald-400/70"> → {col.fkRefTable}</span>
                )}
              </td>
              <td className="px-2 py-1 text-right text-slate-400 dark:text-slate-500 uppercase whitespace-nowrap">
                {col.type}
              </td>
            </tr>
          ))}
          {data.columns.length === 0 && (
            <tr>
              <td colSpan={3} className="px-2 py-1.5 text-slate-400 dark:text-slate-500 text-center">
                No columns
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
