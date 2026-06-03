import React, { useState } from 'react';
import { Eye, Edit3, Trash2, Key, ListCollapse, BookOpen, Layers, BarChart, ChevronRight, Play, Database, FileCode, CheckCircle, Code } from 'lucide-react';
import { WarehouseNode, Column, TableType, Transformation } from '../types';

interface InspectorPanelProps {
  selectedNode: WarehouseNode | null;
  transformations: Transformation[];
  activeTransformation: Transformation | null;
  onUpdateTableDetails: (updatedNode: WarehouseNode) => void;
  onDeleteTable: (id: string) => void;
  onToggleExpandTable: (id: string) => void;
  isExpanded: boolean;
  totalTablesCount: number;
  totalConnectionsCount: number;
}

export default function InspectorPanel({
  selectedNode,
  transformations,
  activeTransformation,
  onUpdateTableDetails,
  onDeleteTable,
  onToggleExpandTable,
  isExpanded,
  totalTablesCount,
  totalConnectionsCount
}: InspectorPanelProps) {
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('VARCHAR(100)');
  const [isPK, setIsPK] = useState(false);

  // Quick edit of selected table variables
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !newColName.trim()) return;

    const newCol: Column = {
      name: newColName.trim(),
      type: newColType,
      isPrimaryKey: isPK,
      isForeignKey: false
    };

    const updatedNode: WarehouseNode = {
      ...selectedNode,
      columns: [...selectedNode.columns, newCol]
    };

    onUpdateTableDetails(updatedNode);
    setNewColName('');
    setIsPK(false);
  };

  const handleDeleteColumn = (colName: string) => {
    if (!selectedNode) return;
    const updatedNode: WarehouseNode = {
      ...selectedNode,
      columns: selectedNode.columns.filter((c) => c.name !== colName)
    };
    onUpdateTableDetails(updatedNode);
  };

  return (
    <div className="w-[20%] h-full bg-[#1E293B] border-l border-[#475569] flex flex-col justify-between overflow-y-auto select-none p-4 shadow-lg select-text">
      
      {/* CASE A: No active table or transformation selected -> Show standard workspace stats */}
      {!selectedNode && !activeTransformation && (
        <div className="flex flex-col h-full justify-between animate-fadeIn select-text">
          <div className="space-y-5">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                <Layers size={13} className="text-[#4F46E5]" />
                <span>WORKSPACE METRICS</span>
              </div>
              <h3 className="text-md font-sans font-semibold text-[#F8FAFC]">
                Warehouse Attributes
              </h3>
            </div>

            {/* Standard KPIs */}
            <div className="grid grid-cols-2 gap-3.5 select-none">
              <div className="bg-slate-900/40 border border-[#475569]/30 p-3 rounded-lg">
                <span className="text-[10px] text-[#94A3B8] font-mono uppercase tracking-widest block">Total Nodes</span>
                <span className="text-xl font-bold font-mono text-[#F8FAFC]">{totalTablesCount}</span>
              </div>
              <div className="bg-slate-900/40 border border-[#475569]/30 p-3 rounded-lg">
                <span className="text-[10px] text-[#94A3B8] font-mono uppercase tracking-widest block">Relations</span>
                <span className="text-xl font-bold font-mono text-[#06B6D4]">{totalConnectionsCount}</span>
              </div>
            </div>

            {/* Ingestion Pipelines info list */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-mono tracking-wider font-bold text-[#94A3B8] uppercase">
                ETL / dbt Pipelines ({transformations.length})
              </div>
              
              {transformations.length === 0 ? (
                <div className="text-xs text-[#94A3B8] p-3 text-center bg-slate-900/10 border border-dashed border-[#475569]/30 rounded-lg">
                  No dbt compile runs configured yet.
                </div>
              ) : (
                transformations.map((trans) => (
                  <div key={trans.id} className="bg-slate-900/60 border border-[#475569]/20 rounded-lg p-3 relative group">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-[#CBD5E1] truncate">
                        {trans.name}
                      </span>
                      <span className="text-[9px] bg-[#4F46E5]/15 text-[#06B6D4] border border-[#06B6D4]/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest font-mono">
                        {trans.inputType}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[#94A3B8] mt-1 space-x-1.5">
                      <span>Inlets: {trans.inputColumns.length} cols</span>
                      <span>•</span>
                      <span>Outlets: {trans.outputColumns.length} cols</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick standards help card */}
            <div className="bg-[#4F46E5]/5 border border-[#4F46E5]/25 rounded-lg p-4 select-none">
              <h4 className="text-xs font-bold text-[#F8FAFC] flex items-center space-x-1.5">
                <BookOpen size={13} className="text-[#06B6D4]" />
                <span>Architect standards handbook</span>
              </h4>
              <p className="text-[11.5px] text-[#CBD5E1] leading-relaxed mt-2">
                Every dimension table should carry a unique numerical <strong>surrogate primary key</strong> (PK) to isolate metrics from transactional database identity renames.
              </p>
            </div>
          </div>

          <div className="text-[10px] text-[#94A3B8]/60 font-mono border-t border-[#475569]/20 pt-3 text-center select-none">
            Selected nodes for inspections
          </div>
        </div>
      )}

      {/* CASE B: Table / Node active selected */}
      {selectedNode && (
        <div className="flex flex-col h-full justify-between animate-fadeIn space-y-4 select-text">
          <div className="space-y-4">
            {/* Table Name Header */}
            <div className="border-b border-[#475569]/30 pb-3">
              <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-[#06B6D4] uppercase tracking-wider mb-1">
                <Database size={12} />
                <span>Node details ({selectedNode.type.toUpperCase()})</span>
              </div>
              
              <div className="flex justify-between items-start">
                <h3 className="text-md font-sans font-bold text-[#F8FAFC] tracking-tight">
                  {selectedNode.name}
                </h3>
                <button
                  onClick={() => onToggleExpandTable(selectedNode.id)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-xs font-mono select-none"
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>

              <textarea
                value={selectedNode.description}
                onChange={(e) => onUpdateTableDetails({ ...selectedNode, description: e.target.value })}
                className="w-full text-xs text-[#CBD5E1] bg-[#0F172A]/40 outline-none p-2 rounded border border-[#475569]/20 focus:border-[#4F46E5] mt-2 resize-none h-18 text-ellipsis font-sans leading-relaxed"
                placeholder="Modify Table description..."
              />
            </div>

            {/* List columns */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10.5px] font-mono font-bold text-[#94A3B8]">
                <span>COLUMNS ({selectedNode.columns.length})</span>
                <span className="text-[9px] uppercase">Action</span>
              </div>

              <div className="max-h-[170px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                {selectedNode.columns.map((col, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-900/30 p-1.5 rounded border border-[#475569]/20">
                    <div className="flex items-center space-x-1 truncate max-w-[80%]">
                      {col.isPrimaryKey ? (
                        <Key size={11} className="text-[#06B6D4] shrink-0" />
                      ) : (
                        <span className="text-slate-600 font-bold shrink-0">▪</span>
                      )}
                      <span className="truncate text-[#CBD5E1] font-semibold">{col.name}</span>
                      <span className="text-[9px] text-[#94A3B8] truncate">{col.type}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteColumn(col.name)}
                      className="text-slate-500 hover:text-[#EF4444] p-0.5 rounded cursor-pointer select-none"
                      title="Delete variable details"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column builder form */}
            <form onSubmit={handleAddColumn} className="bg-slate-900/40 p-3 rounded-lg border border-[#475569]/30 space-y-2">
              <span className="text-[10px] font-mono font-bold text-[#CBD5E1] block uppercase">Add Column Attribute</span>
              
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="column_id"
                  className="text-[11px] bg-[#0F172A] border border-[#475569] text-white p-1 px-2 rounded font-mono outline-none focus:border-[#4F46E5]"
                />
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="text-[11px] bg-[#0F172A] border border-[#475569] text-white p-1 px-1 rounded font-mono outline-none focus:border-[#4F46E5] select-none"
                >
                  <option value="INT">INT</option>
                  <option value="VARCHAR(100)">VARCHAR</option>
                  <option value="DECIMAL(10,2)">DECIMAL</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                  <option value="DATE">DATE</option>
                  <option value="TIMESTAMP">TIMESTAMP</option>
                </select>
              </div>

              <div className="flex items-center justify-between mt-2 text-[10px] text-[#CBD5E1] font-sans">
                <label className="flex items-center space-x-1.5 cursor-pointer selection:bg-transparent">
                  <input
                    type="checkbox"
                    checked={isPK}
                    onChange={(e) => setIsPK(e.target.checked)}
                    className="accent-[#06B6D4]"
                  />
                  <span>Identify Surrogate PK</span>
                </label>

                <button
                  type="submit"
                  disabled={!newColName.trim()}
                  className="bg-[#4F46E5] text-white py-1 px-3 rounded font-sans text-[10px] font-bold disabled:opacity-40 cursor-pointer"
                >
                  Confirm add
                </button>
              </div>
            </form>
          </div>

          <button
            onClick={() => onDeleteTable(selectedNode.id)}
            className="w-full flex items-center justify-center space-x-2 text-xs text-[#EF4444] border border-[#EF4444]/40 hover:bg-[#EF4444]/10 bg-transparent font-medium py-2 rounded transition-colors cursor-pointer select-none"
          >
            <Trash2 size={13} />
            <span>Delete Table Node</span>
          </button>
        </div>
      )}

      {/* CASE C: Transformation active pipeline selected */}
      {activeTransformation && !selectedNode && (
        <div className="flex flex-col h-full justify-between animate-fadeIn space-y-4 select-text">
          <div className="space-y-4">
            
            {/* Header transform info */}
            <div className="border-b border-[#475569]/30 pb-3">
              <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-[#A855F7] uppercase tracking-wider mb-1">
                <Code size={12} />
                <span>Transformation details</span>
              </div>
              <h3 className="text-md font-sans font-bold text-[#F8FAFC]">
                {activeTransformation.name}
              </h3>
            </div>

            {/* Columns mapping details */}
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono text-[#94A3B8] block uppercase">Source Inlets</span>
                <div className="flex flex-wrap gap-1 mt-1.5 font-mono text-[10px]">
                  {activeTransformation.inputColumns.map((c, i) => (
                    <span key={i} className="bg-slate-900 border border-[#475569]/30 text-[#CBD5E1] px-1.5 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#94A3B8] block uppercase">Target Outlets</span>
                <div className="flex flex-wrap gap-1 mt-1.5 font-mono text-[10px]">
                  {activeTransformation.outputColumns.map((c, i) => (
                    <span key={i} className="bg-slate-900 border border-[#06B6D4]/30 text-[#06B6D4] px-1.5 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated dbt Logic in JetBrains Mono pairing font code block */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono tracking-wider font-bold text-[#94A3B8] uppercase block">
                COMPILING PIPELINE LOGIC (SQL)
              </span>

              <div className="p-3 bg-slate-950/80 border border-[#475569]/40 rounded-lg selection:bg-[#4F46E5]">
                <pre className="font-mono text-[10px] text-cyan-400 leading-snug overflow-x-auto whitespace-pre h-[210px] select-text">
                  <code>{activeTransformation.logic}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-[#10B981]/10 border border-[#10B981]/35 p-3 rounded-md text-[11px] text-[#10B981] font-sans flex items-start space-x-2 select-none">
            <CheckCircle size={14} className="shrink-0 mt-0.5" />
            <span>SQL Compilation passed. Ready to deploy via dbt seed.</span>
          </div>
        </div>
      )}

    </div>
  );
}
