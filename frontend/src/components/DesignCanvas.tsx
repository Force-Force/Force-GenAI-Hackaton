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

  // Grid offsets to translate standard schema coordinates to scrollable positive space
  const X_OFFSET = 500;
  const Y_OFFSET = 105;

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

  // Node Color Theme selection mapping with white-friendly elements
  const getNodeColor = (type: TableType, isSelected: boolean) => {
    let baseBorder = 'border-slate-200';
    let baseHeaderBg = 'bg-slate-100';
    let labelColor = 'text-slate-800';
    let dotColor = 'bg-slate-400';

    switch (type) {
      case 'fact':
        baseBorder = isSelected ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/40' : 'border-slate-200';
        baseHeaderBg = 'bg-[#4F46E5]';
        labelColor = 'text-white font-bold';
        dotColor = 'bg-white';
        break;
      case 'dimension':
        baseBorder = isSelected ? 'border-[#06B6D4] ring-2 ring-[#06B6D4]/40' : 'border-slate-200';
        baseHeaderBg = 'bg-sky-600';
        labelColor = 'text-white font-bold';
        dotColor = 'bg-white';
        break;
      case 'source':
        baseBorder = isSelected ? 'border-[#10B981] ring-2 ring-[#10B981]/40' : 'border-slate-200';
        baseHeaderBg = 'bg-emerald-600';
        labelColor = 'text-white font-bold';
        dotColor = 'bg-white';
        break;
      case 'generated':
        baseBorder = isSelected ? 'border-[#A855F7] ring-2 ring-[#A855F7]/40' : 'border-slate-200';
        baseHeaderBg = 'bg-[#A855F7]';
        labelColor = 'text-white font-bold';
        dotColor = 'bg-white';
        break;
    }

    if (isSelected && !baseBorder.includes('ring-2')) {
      baseBorder += ' ring-2 ring-[#4F46E5]/40 scale-[1.01]';
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
      className="flex-1 h-full w-full bg-slate-50 border-b border-t border-slate-200 relative select-none"
    >
      {/* Canvas Controls header tools overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-white/95 border border-slate-250 p-2 rounded-lg shadow-md">
        <button
          onClick={() => onAddTable('fact')}
          className="flex items-center space-x-1.5 text-[10px] uppercase font-mono font-bold bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white px-3 py-1.5 rounded-full border-b-[3px] border-indigo-800 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] cursor-pointer transition-all duration-150 shadow-xs"
        >
          <PlusCircle size={12} />
          <span>+ Add Fact</span>
        </button>

        <button
          onClick={() => onAddTable('dimension')}
          className="flex items-center space-x-1.5 text-[10px] uppercase font-mono font-bold bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-full border-b-[3px] border-sky-800 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] cursor-pointer transition-all duration-150 shadow-xs"
        >
          <PlusCircle size={12} />
          <span>+ Add Dim</span>
        </button>

        <button
          onClick={() => onAddTable('source')}
          className="flex items-center space-x-1.5 text-[10px] uppercase font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-full border-b-[3px] border-emerald-800 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] cursor-pointer transition-all duration-150 shadow-xs"
        >
          <PlusCircle size={12} />
          <span>+ Add Src</span>
        </button>

        {linkMode && (
          <div className="flex items-center space-x-2 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold animate-pulse">
            <Orbit size={12} className="animate-spin text-amber-600" />
            <span>Click destination attribute in other card</span>
            <button
              onClick={cancelLinking}
              className="ml-1 bg-amber-100 hover:bg-amber-200 text-amber-800 px-1 py-0.5 rounded cursor-pointer border border-amber-300 uppercase font-black"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center space-x-4 text-[10.5px] font-mono text-slate-600">
        <div className="flex items-center space-x-1 bg-white/95 px-2.5 py-1 rounded border border-slate-200 shadow-sm">
          <Activity size={12} className="text-indigo-600 font-bold" />
          <span>Live Movement Connections</span>
        </div>
        <div className="flex items-center space-x-1 bg-white/95 px-2.5 py-1 rounded border border-slate-200 shadow-sm">
          <CheckCircle size={12} className="text-emerald-600 font-bold" />
          <span>Surrogates Valid</span>
        </div>
      </div>

      {/* Main scroll container */}
      <div className="w-full h-full overflow-auto">
        <div
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className="relative cursor-grab active:cursor-grabbing shrink-0"
          style={{
            width: '2400px',
            height: '1600px',
            backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            backgroundColor: '#FFFFFF',
          }}
        >

        {/* Connection lines SVG layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
          
          {/* Connection paths drawing */}
          {connections.map((conn) => {
            const rawFromNode = tables.find((t) => t.id === conn.fromTable);
            const rawToNode = tables.find((t) => t.id === conn.toTable);

            if (!rawFromNode || !rawToNode) return null;

            // Apply offsets so coordinate traces align with translated cards
            const fromNode = {
              ...rawFromNode,
              position: {
                x: rawFromNode.position.x + X_OFFSET,
                y: rawFromNode.position.y + Y_OFFSET
              }
            };
            const toNode = {
              ...rawToNode,
              position: {
                x: rawToNode.position.x + X_OFFSET,
                y: rawToNode.position.y + Y_OFFSET
              }
            };

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
                  stroke="#4F46E5"
                  strokeWidth="1.5"
                  strokeOpacity="0.45"
                  className="opacity-70"
                />
                
                {/* Animated node packet dash flow representing PrincipleConnection "subtle flow animation" */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#4F46E5"
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
        <div className="absolute inset-0 w-full h-full select-none z-10 pointer-events-none">
          
          {tables.map((rawNode) => {
            const isSelected = selectedNodeId === rawNode.id;
            const isExpanded = expandedTables.includes(rawNode.id);
            const { baseBorder, baseHeaderBg, labelColor, dotColor } = getNodeColor(rawNode.type, isSelected);

            // Apply coordinate translation to render nodes safely within positive canvas boundaries
            const node = {
              ...rawNode,
              position: {
                x: rawNode.position.x + X_OFFSET,
                y: rawNode.position.y + Y_OFFSET
              }
            };

            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(rawNode.id);
                }}
                style={{
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`,
                  width: '220px'
                }}
                className={`absolute bg-white ${baseBorder} border rounded-lg overflow-hidden shadow-md flex flex-col cursor-pointer pointer-events-auto select-none transition-shadow hover:shadow-lg`}
                title="Drag to reposition table"
              >
                {/* Table header */}
                <div
                  onMouseDown={(e) => handleNodeMouseDown(e, rawNode)}
                  className={`px-3 py-2.5 ${baseHeaderBg} flex items-center justify-between pointer-events-auto border-b border-slate-200/60`}
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <Table size={13} className="text-white" />
                    <span className={`text-[12px] uppercase font-sans tracking-wide font-black truncate text-ellipsis select-none ${labelColor}`}>
                      {node.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Chevron disclosures details */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpandTable(node.id);
                      }}
                      className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                      title={isExpanded ? 'Collapse Columns' : 'Expand Columns'}
                    >
                      <ChevronsUpDown size={11} className={isExpanded ? 'rotate-185 text-white' : 'text-white/70'} />
                    </button>
                    <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                  </div>
                </div>

                {/* Columns container (Only show columns when node is expanded!) */}
                {isExpanded ? (
                  <div className="p-1 px-1.5 bg-slate-50/85 space-y-1 select-none animate-fadeIn">
                    {node.columns.length === 0 ? (
                      <div className="text-center py-3 text-[10px] text-slate-400 font-mono">
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
                              handleColumnClick(rawNode.id, col.name);
                            }}
                            className={`flex items-center justify-between px-2 py-1 bg-white hover:bg-slate-100 border rounded text-[10.5px] font-mono cursor-pointer transition-colors ${
                              isLinkedSrc
                                ? 'border-amber-400 bg-amber-50/70 text-amber-700'
                                : 'border-slate-100 text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className="h-1 text-[8px] leading-3 uppercase pr-0.5 tracking-tight">
                                {col.isPrimaryKey ? (
                                  <span className="text-indigo-600 font-bold font-mono" title="Primary Key">PK</span>
                                ) : col.isForeignKey ? (
                                  <span className="text-emerald-600 font-bold font-mono" title={`Foreign Key referencing ${col.fkRefTable}`}>FK</span>
                                ) : (
                                  <span className="text-slate-350">•</span>
                                )}
                              </span>
                              <span className={`truncate ${col.isPrimaryKey ? 'text-indigo-700 font-bold' : ''}`}>
                                {col.name}
                              </span>
                            </div>
                            
                            <span className="text-[9px] text-slate-405 tracking-widest uppercase">
                              {col.type}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-1.5 bg-slate-50 text-center">
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 font-semibold uppercase">
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
              <div className="bg-white/95 border border-slate-200 p-8 rounded-xl max-w-md shadow-xl backdrop-blur-lg">
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-indigo-600 mb-4">
                  <Orbit className="animate-spin text-indigo-600" size={28} />
                </div>

                <h3 className="font-sans font-bold text-slate-900 text-md">
                  No Warehouse Architecture Designed Yet
                </h3>
                
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Describe your business problem to AuraAI in the panel on the left, or drop DDL schemas in the sources portal to draft custom tables.
                </p>

                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => onAddTable('fact')}
                    className="w-full bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white text-xs font-semibold py-2 px-4 rounded transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    Start manually by Spawning a Fact Table
                  </button>
                  <div className="text-[10px] text-slate-400 font-mono">
                    OR use AI shortcuts to generate immediately!
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>
    </div>
  );
}
