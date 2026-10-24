import { useState, type FormEvent } from 'react';
import {
  X,
  Trash2,
  Database,
  Code2,
  Boxes,
  Key,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Link2,
  PanelRightClose,
} from 'lucide-react';
import { usePipelineStore } from '../store/pipelineStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type {
  Column,
  PipelineNode,
  ResourceKind,
  WarehouseRole,
  ProcessingLanguage,
  ContainerKind,
} from '../../../types/pipeline';
import { cn } from '../../../utils/cn';

const COLUMN_TYPES = [
  'INT',
  'BIGINT',
  'VARCHAR(100)',
  'VARCHAR(255)',
  'TEXT',
  'DECIMAL(10,2)',
  'DECIMAL(18,4)',
  'BOOLEAN',
  'DATE',
  'TIMESTAMP',
  'JSON',
];

const RESOURCE_KINDS: ResourceKind[] = ['table', 'source', 'database', 'warehouse', 'external'];
const WAREHOUSE_ROLES: WarehouseRole[] = ['dimension', 'fact', 'source', 'generated'];

/**
 * Figma-style docked right sidebar that slides in from the right edge
 * when a node is clicked, allowing full inspection, modification, and deletion.
 */
export function NodeDetailsPanel() {
  const rightCollapsed = useWorkspaceStore((s) => s.rightCollapsed);
  const setRightCollapsed = useWorkspaceStore((s) => s.setRightCollapsed);
  const projectName = useWorkspaceStore((s) => s.projectName);

  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const updateNodeData = usePipelineStore((s) => s.updateNodeData);
  const updateProcessingCode = usePipelineStore((s) => s.updateProcessingCode);
  const deleteNode = usePipelineStore((s) => s.deleteNode);

  // Local state for Add Column sub-form
  const [colName, setColName] = useState('');
  const [colType, setColType] = useState(COLUMN_TYPES[0]);
  const [colIsPk, setColIsPk] = useState(false);
  const [colIsFk, setColIsFk] = useState(false);

  // Local confirm delete node state
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) as PipelineNode | undefined;

  const handleAddColumn = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedNode || selectedNode.data.category !== 'resource' || !colName.trim()) return;

    const newCol: Column = {
      name: colName.trim(),
      type: colType,
      isPrimaryKey: colIsPk,
      isForeignKey: colIsFk,
    };

    updateNodeData(selectedNode.id, {
      columns: [...(selectedNode.data.columns || []), newCol],
    });

    setColName('');
    setColIsPk(false);
    setColIsFk(false);
  };

  const handleRemoveColumn = (columnName: string) => {
    if (!selectedNode || selectedNode.data.category !== 'resource') return;
    updateNodeData(selectedNode.id, {
      columns: (selectedNode.data.columns || []).filter((c) => c.name !== columnName),
    });
  };

  const handleDeleteCurrentNode = () => {
    if (!selectedNode) return;
    deleteNode(selectedNode.id);
    setConfirmDelete(false);
  };

  return (
    <aside
      aria-label="Node Details Side Panel"
      style={{ backgroundColor: '#FDFFFC' }}
      className={cn(
        'fixed right-0 top-0 bottom-0 h-screen w-80 sm:w-88 md:w-96 z-30 flex flex-col border-l border-[#334139]/15 shadow-2xl transition-transform duration-300 ease-in-out font-sans',
        rightCollapsed ? 'translate-x-full pointer-events-none' : 'translate-x-0 pointer-events-auto'
      )}
    >
      {/* Top Header: Figma-style dock header */}
      <div className="h-16 px-4 py-3.5 border-b border-[#334139]/12 flex items-center justify-between shrink-0 bg-[#FDFFFC]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            style={{ backgroundColor: '#064C1C' }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#FDFFFC] shadow-2xs shrink-0"
          >
            {selectedNode?.data.category === 'resource' ? (
              <Database size={16} />
            ) : selectedNode?.data.category === 'processing' ? (
              <Code2 size={16} />
            ) : selectedNode?.data.category === 'datamart' ? (
              <Boxes size={16} />
            ) : (
              <SlidersHorizontal size={16} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-[#334139] truncate">
              {selectedNode ? selectedNode.data.label : 'Inspector'}
            </h2>
            <p className="text-[10px] text-[#334139]/60 font-mono truncate">
              {selectedNode
                ? `${selectedNode.data.category.toUpperCase()} • ${selectedNode.id}`
                : `${nodes.length} nodes in pipeline`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRightCollapsed(true)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[#334139]/60 hover:text-[#334139] hover:bg-[#334139]/5 transition-colors cursor-pointer"
          aria-label="Close inspector panel"
          title="Close sidebar"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      {/* Node Switcher Strip (when multiple nodes exist) */}
      {nodes.length > 0 && (
        <div className="px-4 py-2 border-b border-[#334139]/10 bg-[#334139]/[0.02] flex items-center gap-2 shrink-0">
          <label htmlFor="node-select-drawer" className="text-[10px] font-mono font-bold text-[#334139]/60 uppercase shrink-0">
            Node:
          </label>
          <div className="relative flex-1 min-w-0">
            <select
              id="node-select-drawer"
              value={selectedNodeId || ''}
              onChange={(e) => {
                const val = e.target.value;
                selectNode(val ? val : null);
                setConfirmDelete(false);
              }}
              className="w-full text-xs font-semibold text-[#334139] bg-transparent outline-none cursor-pointer py-1 pr-6 truncate"
            >
              <option value="">-- Choose node to inspect --</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.data.label} ({n.data.category})
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#334139]/40 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
        {!selectedNode ? (
          /* Empty / Unselected State: Canvas Overview */
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#064C1C]/10 text-[#064C1C] flex items-center justify-center shadow-xs">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#334139]">Canvas Overview</h3>
              <p className="text-[11px] text-[#334139]/60 max-w-[240px] mt-1 leading-relaxed">
                Click any node on the canvas to inspect, modify, or delete its attributes.
              </p>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 pt-2 text-left">
              <div className="p-2.5 rounded-xl bg-white border border-[#334139]/12">
                <span className="text-[10px] font-mono text-[#334139]/60 uppercase block">Nodes</span>
                <span className="text-base font-bold text-[#334139]">{nodes.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#334139]/12">
                <span className="text-[10px] font-mono text-[#334139]/60 uppercase block">Links</span>
                <span className="text-base font-bold text-[#334139]">{edges.length}</span>
              </div>
            </div>

            {nodes.length > 0 && (
              <div className="w-full space-y-1.5 pt-3 text-left">
                <span className="text-[10px] font-mono font-bold text-[#334139]/50 uppercase tracking-wider block px-1">
                  Click to Inspect:
                </span>
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {nodes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => selectNode(n.id)}
                      className="w-full px-3 py-2 rounded-xl border border-[#334139]/12 hover:border-[#064C1C] hover:bg-[#064C1C]/5 flex items-center justify-between transition-all cursor-pointer text-left"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-[#334139] block truncate">
                          {n.data.label}
                        </span>
                        <span className="text-[10px] text-[#334139]/50 font-mono">
                          {n.data.category}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#334139]/8 text-[#334139]">
                        Inspect
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Active Node Details & Live Edit Form */
          <div className="space-y-4">
            {/* 1. Label Field */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#334139]/70 flex items-center justify-between">
                <span>Node Name / Label</span>
                <span className="text-[9px] text-[#334139]/40 font-normal">Live updates canvas</span>
              </label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#334139]/20 focus:border-[#064C1C] focus:ring-2 focus:ring-[#064C1C]/10 text-xs font-semibold text-[#334139] outline-none transition-all shadow-2xs"
                placeholder="e.g. raw_orders"
                aria-label="Node label"
              />
            </div>

            {/* 2. Description Field */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#334139]/70">
                Description
              </label>
              <textarea
                value={selectedNode.data.description || ''}
                onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#334139]/20 focus:border-[#064C1C] focus:ring-2 focus:ring-[#064C1C]/10 text-xs text-[#334139] outline-none transition-all resize-none custom-scrollbar leading-relaxed shadow-2xs"
                placeholder="Describe this node's role in the pipeline..."
                aria-label="Node description"
              />
            </div>

            {/* 3. Category Specific Configurations */}
            {selectedNode.data.category === 'resource' && (
              <div className="space-y-4 pt-2 border-t border-[#334139]/12">
                {/* Resource Kind & Role */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-[#334139]/70">
                      Kind
                    </label>
                    <select
                      value={selectedNode.data.kind}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { kind: e.target.value as ResourceKind })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#334139]/20 text-xs font-semibold text-[#334139] outline-none cursor-pointer"
                    >
                      {RESOURCE_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-[#334139]/70">
                      Role
                    </label>
                    <select
                      value={selectedNode.data.warehouseRole || 'dimension'}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          warehouseRole: e.target.value as WarehouseRole,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#334139]/20 text-xs font-semibold text-[#334139] outline-none cursor-pointer"
                    >
                      {WAREHOUSE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Columns List & Management */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#334139]/70">
                      Columns ({selectedNode.data.columns?.length || 0})
                    </span>
                  </div>

                  {/* Existing Columns List */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                    {selectedNode.data.columns?.map((col) => (
                      <div
                        key={col.name}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#334139]/15 flex items-center justify-between gap-2 shadow-2xs hover:border-[#334139]/30 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {col.isPrimaryKey ? (
                            <span title="Primary Key" className="shrink-0 flex items-center">
                              <Key size={12} className="text-[#D66F14]" />
                            </span>
                          ) : col.isForeignKey ? (
                            <span title="Foreign Key" className="shrink-0 flex items-center">
                              <Link2 size={12} className="text-[#064C1C]" />
                            </span>
                          ) : (
                            <span className="text-[#334139]/30 font-bold shrink-0">•</span>
                          )}
                          <span className="font-semibold text-xs text-[#334139] truncate">
                            {col.name}
                          </span>
                          <span className="text-[9.5px] font-mono text-[#334139]/60 shrink-0">
                            {col.type}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveColumn(col.name)}
                          className="text-[#334139]/40 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                          aria-label={`Remove column ${col.name}`}
                          title="Remove column"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {(!selectedNode.data.columns || selectedNode.data.columns.length === 0) && (
                      <div className="text-[11px] text-[#334139]/50 font-mono text-center py-2 bg-[#334139]/[0.02] rounded-lg border border-dashed border-[#334139]/15">
                        No columns defined
                      </div>
                    )}
                  </div>

                  {/* Add Column Inline Form */}
                  <form
                    onSubmit={handleAddColumn}
                    className="p-2.5 rounded-xl bg-white border border-[#334139]/15 space-y-2 mt-2 shadow-2xs"
                  >
                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-[#334139]/60 block">
                      + Add New Column
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={colName}
                        onChange={(e) => setColName(e.target.value)}
                        placeholder="column_name"
                        className="px-2 py-1 text-xs font-mono bg-[#FDFFFC] border border-[#334139]/20 rounded-md text-[#334139] outline-none focus:border-[#064C1C]"
                        aria-label="New column name"
                      />
                      <select
                        value={colType}
                        onChange={(e) => setColType(e.target.value)}
                        className="px-2 py-1 text-[11px] font-mono bg-[#FDFFFC] border border-[#334139]/20 rounded-md text-[#334139] outline-none cursor-pointer"
                        aria-label="New column type"
                      >
                        {COLUMN_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 text-[10.5px] text-[#334139]/80 font-sans">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={colIsPk}
                            onChange={(e) => setColIsPk(e.target.checked)}
                            className="rounded accent-[#064C1C]"
                          />
                          <span>PK</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={colIsFk}
                            onChange={(e) => setColIsFk(e.target.checked)}
                            className="rounded accent-[#064C1C]"
                          />
                          <span>FK</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={!colName.trim()}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#064C1C] hover:brightness-110 disabled:opacity-40 text-[#FDFFFC] transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus size={12} />
                        <span>Add</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Processing Node Specific Controls */}
            {selectedNode.data.category === 'processing' && (
              <div className="space-y-3 pt-2 border-t border-[#334139]/12">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono font-bold uppercase text-[#334139]/70">
                    Language / Engine
                  </label>
                  <select
                    value={selectedNode.data.language}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        language: e.target.value as ProcessingLanguage,
                      })
                    }
                    className="px-2 py-1 rounded-md bg-white border border-[#334139]/20 text-xs font-semibold text-[#334139] outline-none cursor-pointer"
                  >
                    <option value="sql">SQL</option>
                    <option value="python">Python</option>
                  </select>
                </div>

                {/* Script Code Textarea */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-[#334139]/70">
                    Transformation Script
                  </label>
                  <textarea
                    value={selectedNode.data.code || ''}
                    onChange={(e) => updateProcessingCode(selectedNode.id, e.target.value)}
                    rows={6}
                    className="w-full p-2.5 rounded-xl bg-[#1E2D24] text-[#FDFFFC] font-mono text-[11px] leading-relaxed outline-none border border-[#334139]/30 focus:border-[#D66F14] transition-all resize-y custom-scrollbar shadow-inner"
                    placeholder="-- Write transform SQL or Python script..."
                    aria-label="Transformation script code"
                  />
                </div>
              </div>
            )}

            {/* Datamart Node Specific Controls */}
            {selectedNode.data.category === 'datamart' && (
              <div className="space-y-3 pt-2 border-t border-[#334139]/12">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono font-bold uppercase text-[#334139]/70">
                    Container Kind
                  </label>
                  <select
                    value={selectedNode.data.containerKind || 'datamart'}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        containerKind: e.target.value as ContainerKind,
                      })
                    }
                    className="px-2 py-1 rounded-md bg-white border border-[#334139]/20 text-xs font-semibold text-[#334139] outline-none cursor-pointer"
                  >
                    <option value="datamart">Datamart</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="database">Database</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#334139]/15 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-[#334139]/70 uppercase">
                    Contained Tables
                  </span>
                  <p className="text-[11px] text-[#334139]/70">
                    {selectedNode.data.children?.nodes?.length || 0} nested resource tables in this mart.
                  </p>
                </div>
              </div>
            )}

            {/* 4. Delete Node Action */}
            <div className="pt-3 border-t border-[#334139]/12">
              {confirmDelete ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-center animate-fadeIn">
                  <p className="text-xs font-semibold text-rose-800">
                    Delete "{selectedNode.data.label}"?
                  </p>
                  <p className="text-[11px] text-rose-600">
                    This will remove the node and its connections from the canvas.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCurrentNode}
                      className="px-3.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                  aria-label="Delete node"
                >
                  <Trash2 size={13} />
                  <span>Delete Node</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
