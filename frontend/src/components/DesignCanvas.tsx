import React, { useState, useRef } from 'react';
import { Table, Maximize2, Minimize2, PlusCircle, CheckCircle, Orbit, Activity, ShieldCheck, ChevronsUpDown, Sparkles, Filter, Database, Link, Move } from 'lucide-react';
import { WarehouseNode, WarehouseConnection, TableType } from '../types';

interface DesignCanvasProps {
  tables: WarehouseNode[];
  connections: WarehouseConnection[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateTablePosition: (id: string, x: number, y: number) => void;
  onAddTable: (type: TableType) => void;
  expandedTables: string[];
  onToggleExpandTable: (id: string) => void;
  onAddConnection: (fromTable: string, fromCol: string, toTable: string, toCol: string) => void;
}

export default function DesignCanvas({
  tables,
  connections,
  selectedNodeId,
  onSelectNode,
  onUpdateTablePosition,
  onAddTable,
  expandedTables,
  onToggleExpandTable,
  onAddConnection
}: DesignCanvasProps) {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const nodeStartPos = useRef({ x: 0, y: 0 });

  // Columns link builder state
  const [linkMode, setLinkMode] = useState<boolean>(false);
  const [linkSource, setLinkSource] = useState<{ table: string; col: string } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Drag listeners
  const handleNodeMouseDown = (e: React.MouseEvent, node: WarehouseNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
    setDraggingNodeId(node.id);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    nodeStartPos.current = { ...node.position };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    // Grid snapping simulation at 10px intervals for Figma feel
    const snapX = Math.round((nodeStartPos.current.x + dx) / 10) * 10;
    const snapY = Math.round((nodeStartPos.current.y + dy) / 10) * 10;

    onUpdateTablePosition(draggingNodeId, snapX, snapY);
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
  };

  const handleColumnClick = (tableName: string, colName: string) => {
    if (!linkMode) {
      setLinkMode(true);
      setLinkSource({ table: tableName, col: colName });
    } else {
      if (linkSource && linkSource.table !== tableName) {
        // Form a connection
        onAddConnection(linkSource.table, linkSource.col, tableName, colName);
        setLinkMode(false);
        setLinkSource(null);
      } else {
        // Cancel or retarget same table
        setLinkSource({ table: tableName, col: colName });
      }
    }
  };

  const cancelLinking = () => {
    setLinkMode(false);
    setLinkSource(null);
  };

  // Node Color Theme selection mapping
  const getNodeColor = (type: TableType, isSelected: boolean) => {
    let baseBorder = 'border-[#475569]';
    let baseHeaderBg = 'bg-[#334155]/90';
    let labelColor = 'text-[#CBD5E1]';
    let dotColor = 'bg-[#CBD5E1]';

    switch (type) {
      case 'fact':
        baseBorder = isSelected ? 'border-[#4F46E5]' : 'border-[#4F46E5]/40';
        baseHeaderBg = 'bg-[#4F46E5]';
        labelColor = 'text-white font-bold';
        dotColor = 'bg-[#4F46E5]';
        break;
      case 'dimension':
        baseBorder = isSelected ? 'border-[#06B6D4]' : 'border-[#06B6D4]/40';
        baseHeaderBg = 'bg-[#06B6D4]';
        labelColor = 'text-[#0F172A] font-bold';
        dotColor = 'bg-[#06B6D4]';
        break;
      case 'source':
        baseBorder = isSelected ? 'border-[#10B981]' : 'border-[#10B981]/40';
        baseHeaderBg = 'bg-[#10B981]';
        labelColor = 'text-[#0F172A] font-bold';
        dotColor = 'bg-[#10B981]';
        break;
      case 'generated':
        baseBorder = isSelected ? 'border-[#A855F7]' : 'border-[#A855F7]/40';
        baseHeaderBg = 'bg-[#A855F7]';
        labelColor = 'text-white font-bold';
        dotColor = 'bg-[#A855F7]';
        break;
    }

    if (isSelected) {
      baseBorder += ' ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/10Scale scale-[1.01]';
    }

    return { baseBorder, baseHeaderBg, labelColor, dotColor };
  };

  // Height approximation of node for connection lines drawing
  const getNodeHeight = (node: WarehouseNode) => {
    const isExpanded = expandedTables.includes(node.id);
    if (!isExpanded) return 46; // only header is shown
    return 46 + (node.columns.length * 30) + 12; // header + padding + rows
  };

  return (
    <div
      ref={canvasRef}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      className="flex-1 h-full bg-[#0F172A] relative overflow-hidden select-none cursor-grab active:cursor-grabbing border-b border-t border-[#475569]/30"
      style={{
        backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        backgroundOpacity: '0.04'
      }}
    >
      
      {/* Canvas Controls header tools overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-[#1E293B]/90 border border-[#475569]/70 p-2 rounded-lg backdrop-blur shadow-lg">
        <button
          onClick={() => onAddTable('fact')}
          className="flex items-center space-x-1.5 text-[10px] uppercase font-mono font-bold bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white px-2.5 py-1.5 rounded cursor-pointer transition-all"
        >
          <PlusCircle size={12} />
          <span>+ Add Fact</span>
        </button>

        <button
          onClick={() => onAddTable('dimension')}
          className="flex items-center space-x-1.5 text-[10px] uppercase font-mono font-bold bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0F172A] px-2.5 py-1.5 rounded cursor-pointer transition-all"
        >
          <PlusCircle size={12} />
          <span>+ Add Dim</span>
        </button>

        <button
          onClick={() => onAddTable('source')}
          className="flex items-center space-x-1.5 text-[10px] uppercase font-mono font-bold bg-[#10B981] hover:bg-[#10B981]/90 text-[#0F172A] px-2.5 py-1.5 rounded cursor-pointer transition-all"
        >
          <PlusCircle size={12} />
          <span>+ Add Src</span>
        </button>

        {linkMode && (
          <div className="flex items-center space-x-2 bg-amber-950/40 text-[#F59E0B] border border-[#F59E0B]/50 px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold animate-pulse">
            <Orbit size={12} className="animate-spin" />
            <span>Click destination attribute in other card</span>
            <button
              onClick={cancelLinking}
              className="ml-1 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 text-[#F59E0B] px-1 py-0.5 rounded cursor-pointer border border-[#F59E0B]/40 uppercase font-black"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center space-x-4 text-[10.5px] font-mono text-[#CBD5E1]">
        <div className="flex items-center space-x-1 bg-slate-900/60 px-2.5 py-1 rounded border border-[#475569]/30">
          <Activity size={12} className="text-[#06B6D4]" />
          <span>Live Movement Connections</span>
        </div>
        <div className="flex items-center space-x-1 bg-slate-900/60 px-2.5 py-1 rounded border border-[#475569]/30">
          <CheckCircle size={12} className="text-[#10B981]" />
          <span>Surrogates Valid</span>
        </div>
      </div>

      {/* Connection lines SVG layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
        
        {/* Connection paths drawing */}
        {connections.map((conn) => {
          const fromNode = tables.find((t) => t.id === conn.fromTable);
          const toNode = tables.find((t) => t.id === conn.toTable);

          if (!fromNode || !toNode) return null;

          const isFromExpanded = expandedTables.includes(fromNode.id);
          const isToExpanded = expandedTables.includes(toNode.id);

          // Get indices of variables if expanded to dock connection directly on appropriate row coordinates
          let fromColIdx = 0;
          let toColIdx = 0;

          if (isFromExpanded) {
            fromColIdx = fromNode.columns.findIndex((c) => c.name === conn.fromColumn);
            if (fromColIdx === -1) fromColIdx = 0;
          }
          if (isToExpanded) {
            toColIdx = toNode.columns.findIndex((c) => c.name === conn.toColumn);
            if (toColIdx === -1) toColIdx = 0;
          }

          // Compute exact starting and terminating points of connection wires
          const cardWidth = 220;
          
          // Coordinate math base offsets
          // If from card is left of to-card, anchor to right side. Else anchor to left side.
          const xFromAnchor = fromNode.position.x < toNode.position.x ? fromNode.position.x + cardWidth : fromNode.position.x;
          const yFromAnchor = fromNode.position.y + 46 + (isFromExpanded ? (fromColIdx * 30) + 15 : 0);

          const xToAnchor = toNode.position.x < fromNode.position.x ? toNode.position.x + cardWidth : toNode.position.x;
          const yToAnchor = toNode.position.y + 46 + (isToExpanded ? (toColIdx * 30) + 15 : 0);

          // Bezier control parameters
          const controlOffset = Math.max(50, Math.abs(xFromAnchor - xToAnchor) * 0.4);
          const cpX1 = xFromAnchor + (fromNode.position.x < toNode.position.x ? controlOffset : -controlOffset);
          const cpY1 = yFromAnchor;
          const cpX2 = xToAnchor + (toNode.position.x < fromNode.position.x ? controlOffset : -controlOffset);
          const cpY2 = yToAnchor;

          const pathD = `M ${xFromAnchor} ${yFromAnchor} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${xToAnchor} ${yToAnchor}`;

          return (
            <g key={conn.id}>
              {/* Inner ambient connection trace indicator glow path */}
              <path
                d={pathD}
                fill="none"
                stroke="#06B6D4"
                strokeWidth="1.5"
                strokeOpacity="0.45"
                className="opacity-70"
              />
              
              {/* Animated node packet dash flow representing PrincipleConnection "subtle flow animation" */}
              <path
                d={pathD}
                fill="none"
                stroke="#06B6D4"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6, 18"
                className="animate-dash"
                style={{
                  strokeDashoffset: 100,
                  animation: 'dash 3s linear infinite',
                  strokeOpacity: 0.95
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Nodes positioning wrapper draggable elements layer */}
      <div className="absolute inset-0 w-full h-full overflow-hidden select-none z-10 pointer-events-none">
        
        {tables.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isExpanded = expandedTables.includes(node.id);
          const { baseBorder, baseHeaderBg, labelColor, dotColor } = getNodeColor(node.type, isSelected);

          return (
            <div
              key={node.id}
              id={`node-${node.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              style={{
                left: `${node.position.x}px`,
                top: `${node.position.y}px`,
                width: '220px'
              }}
              className={`absolute bg-[#1E293B] ${baseBorder} border rounded-lg overflow-hidden shadow-md flex flex-col cursor-pointer pointer-events-auto select-none transition-shadow hover:shadow-lg`}
              title="Drag to reposition table"
            >
              {/* Table header */}
              <div
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                className={`px-3 py-2.5 ${baseHeaderBg} flex items-center justify-between pointer-events-auto border-b border-[#475569]/30`}
              >
                <div className="flex items-center space-x-2 overflow-hidden">
                  <Table size={13} className={`${node.type === 'fact' || node.type === 'generated' ? 'text-white' : 'text-[#0F172A]'}`} />
                  <span className={`text-[12px] uppercase font-sans tracking-wide font-black truncate text-ellipsis select-none ${labelColor}`}>
                    {node.name}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {/* Chevron disclosures details - Principle 3: Progressive Complexity */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpandTable(node.id);
                    }}
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                    title={isExpanded ? 'Collapse Columns' : 'Expand Columns'}
                  >
                    <ChevronsUpDown size={11} className={isExpanded ? 'rotate-185 text-[#F8FAFC]' : 'text-slate-400'} />
                  </button>
                  <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                </div>
              </div>

              {/* Columns container (Only show columns when node is expanded!) */}
              {isExpanded ? (
                <div className="p-1 px-1.5 bg-slate-900/60 space-y-1 select-none animate-fadeIn">
                  {node.columns.length === 0 ? (
                    <div className="text-center py-3 text-[10px] text-slate-500 font-mono">
                      No attributes listed
                    </div>
                  ) : (
                    node.columns.map((col, idx) => {
                      const isLinkedSrc = linkSource && linkSource.table === node.id && linkSource.col === col.name;
                      return (
                        <div
                          key={idx}
                          id={`col-${node.id}-${col.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleColumnClick(node.id, col.name);
                          }}
                          className={`flex items-center justify-between px-2 py-1 bg-[#1E293B]/70 hover:bg-[#475569]/40 border rounded text-[10.5px] font-mono cursor-pointer transition-colors ${
                            isLinkedSrc
                              ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]'
                              : 'border-[#475569]/20 text-[#CBD5E1] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="h-1 text-[8px] leading-3 uppercase pr-0.5 tracking-tight">
                              {col.isPrimaryKey ? (
                                <span className="text-[#06B6D4] font-black" title="Primary Key">PK</span>
                              ) : col.isForeignKey ? (
                                <span className="text-[#10B981] font-black" title={`Foreign Key referencing ${col.fkRefTable}`}>FK</span>
                              ) : (
                                <span className="text-slate-600">▪</span>
                              )}
                            </span>
                            <span className={`truncate ${col.isPrimaryKey ? 'text-[#F8FAFC] font-semibold' : ''}`}>
                              {col.name}
                            </span>
                          </div>
                          
                          <span className="text-[9px] text-[#94A3B8] tracking-widest uppercase">
                            {col.type}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-slate-950/20 text-center">
                  <span className="text-[10px] font-mono tracking-wider text-slate-500 font-semibold uppercase">
                    {node.columns.length} columns collapsed
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state overlay illustration if no warehouse designed yet */}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-auto p-8 select-none select-text">
            <div className="bg-[#1E293B]/80 border border-[#475569] p-8 rounded-xl max-w-md shadow-2xl backdrop-blur-lg">
              <div className="bg-[#4F46E5]/15 border border-[#4F46E5]/30 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[#06B6D4] mb-4">
                <Orbit className="animate-spin text-[#06B6D4]" size={28} />
              </div>

              <h3 className="font-sans font-bold text-[#F8FAFC] text-md">
                No Warehouse Architecture Designed Yet
              </h3>
              
              <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">
                Describe your business problem to AuraAI in the panel on the left, or drop DDL schemas in the sources portal to draft custom tables.
              </p>

              <div className="mt-5 space-y-2">
                <button
                  onClick={() => onAddTable('fact')}
                  className="w-full bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white text-xs font-semibold py-2 px-4 rounded transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Start manually by Spawning a Fact Table
                </button>
                <div className="text-[10px] text-[#94A3B8] font-mono">
                  OR use AI shortcuts to generate immediately!
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
