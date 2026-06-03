import React, { useState } from 'react';
import { Database, Link2, Link2Off, Eye, Plus, Upload, Check, FileSpreadsheet, FileCode } from 'lucide-react';
import { DataSource, WarehouseNode } from '../types';

interface DataSourceManagerProps {
  sources: DataSource[];
  onToggleSource: (id: string) => void;
  onDeployImportedSource: (table: WarehouseNode) => void;
}

export default function DataSourceManager({
  sources,
  onToggleSource,
  onDeployImportedSource
}: DataSourceManagerProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedSchema, setUploadedSchema] = useState<WarehouseNode | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'sql' | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Parse a CSV or DDL SQL into a schema immediately
  const handleSchemaImport = (type: 'csv' | 'sql') => {
    setIsParsing(true);
    setFileType(type);
    
    setTimeout(() => {
      if (type === 'csv') {
        const dummyCsvTable: WarehouseNode = {
          id: 'src_csv_stripe_payouts',
          name: 'src_csv_stripe_payouts',
          type: 'source',
          description: 'Imported CSV database parameters representing financial Stripe ledger payout events.',
          position: { x: -420, y: 340 },
          columns: [
            { name: 'payout_id', type: 'VARCHAR(100)', isPrimaryKey: true, isForeignKey: false },
            { name: 'amount', type: 'NUMERIC(12,2)', isPrimaryKey: false, isForeignKey: false },
            { name: 'currency', type: 'VARCHAR(10)', isPrimaryKey: false, isForeignKey: false },
            { name: 'settled_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
            { name: 'channel_bank', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false }
          ]
        };
        setUploadedSchema(dummyCsvTable);
      } else {
        const dummySqlTable: WarehouseNode = {
          id: 'src_ddl_salesforce_leads',
          name: 'src_ddl_salesforce_leads',
          type: 'source',
          description: 'Parsed DDL schema containing Salesforce CRM lead allocations, source campaigns, and targets.',
          position: { x: -420, y: -40 },
          columns: [
            { name: 'lead_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
            { name: 'lead_owner', type: 'VARCHAR(250)', isPrimaryKey: false, isForeignKey: false },
            { name: 'source_id', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
            { name: 'estimated_revenue', type: 'NUMERIC(14,2)', isPrimaryKey: false, isForeignKey: false },
            { name: 'created_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false }
          ]
        };
        setUploadedSchema(dummySqlTable);
      }
      setIsParsing(false);
    }, 850);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const textStr = e.dataTransfer.getData('text') || '';
    if (textStr.includes('SELECT') || textStr.includes('CREATE') || textStr.includes('TABLE')) {
      handleSchemaImport('sql');
    } else {
      handleSchemaImport('csv');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl p-5 select-none animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-150 pb-4 mb-4">
        <h3 className="text-lg font-sans font-semibold text-slate-850 flex items-center space-x-2">
          <Database size={20} className="text-emerald-600 font-bold" />
          <span>External Sources Hub</span>
        </h3>
        <p className="text-xs text-slate-450 mt-0.5">
          Review synced databases, load warehouse schemas, or drag-and-drop structural definition files.
        </p>
      </div>

      {/* Grid: 2-columns (Database Cards left, file uploader right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-full overflow-hidden">
        
        {/* Source Cards Panel */}
        <div className="flex flex-col space-y-3 overflow-y-auto pr-1">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Connected Cloud Warehouses
          </h4>
          
          {sources.map((src) => {
            const isConnected = src.status === 'connected';
            return (
              <div
                key={src.id}
                className="bg-slate-50/60 hover:bg-slate-100 border border-slate-200 rounded-lg p-4 transition-all duration-200 shadow-3xs relative group cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-md ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-slate-400'}`}>
                      <Database size={18} />
                    </div>
                    <div>
                      <h5 className="font-sans font-bold text-sm text-slate-850">
                        {src.name}
                      </h5>
                      <span className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-150 mt-1 font-mono uppercase inline-block">
                        {src.type}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleSource(src.id)}
                    className="p-1 px-2.5 rounded text-[11px] font-mono font-medium flex items-center space-x-1 border hover:-translate-y-0.5 transition-all cursor-pointer"
                    style={{
                      backgroundColor: isConnected ? '#10B98110' : '#EF444410',
                      borderColor: isConnected ? '#10B98130' : '#EF444430',
                      color: isConnected ? '#059669' : '#DC2626'
                    }}
                  >
                    {isConnected ? (
                      <>
                        <Link2 size={12} />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <Link2Off size={11} />
                        <span>Offline</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-550 mt-2.5 leading-relaxed">
                  {src.description}
                </p>

                <div className="mt-3 flex justify-between items-center text-[11px] font-mono text-slate-400 border-t border-slate-100 pt-2.5">
                  <span>Replicas: {src.tableCount} tables in buffer</span>
                  <span className="text-indigo-600 group-hover:underline">View Tables &rarr;</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Drag-and-Drop / File Uploader panel */}
        <div className="flex flex-col space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Instant Schema Generator
          </h4>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center transition-all duration-200 relative ${
              dragOver
                ? 'border-indigo-500 bg-indigo-50/30'
                : 'border-slate-250 hover:border-slate-350 bg-slate-50/70'
            }`}
            style={{ minHeight: '175px' }}
          >
            <Upload size={32} className="text-indigo-500/70 mb-3 animate-bounce" />
            
            <p className="text-xs font-semibold text-slate-800">
              Drag and drop any DDL SQL or demographic CSV here
            </p>
            <p className="text-[11px] text-slate-450 mt-1 max-w-xs">
              Directly parse column metadata configurations, data types, and primary indexes.
            </p>

            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => handleSchemaImport('csv')}
                className="flex items-center space-x-1.5 text-[11px] font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 border-b-[3px] border-slate-300 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] px-3 py-1.5 rounded-full transition-all duration-150 cursor-pointer shadow-3xs"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span>Simulate CSV Payload</span>
              </button>
              <button
                onClick={() => handleSchemaImport('sql')}
                className="flex items-center space-x-1.5 text-[11px] font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 border-b-[3px] border-slate-300 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] px-3 py-1.5 rounded-full transition-all duration-150 cursor-pointer shadow-3xs"
              >
                <FileCode size={13} className="text-indigo-600" />
                <span>Simulate SQL DDL</span>
              </button>
            </div>
          </div>

          {/* Schema Live Parser Preview */}
          <div className="flex-1 bg-slate-50/80 border border-slate-200 rounded-lg p-4 flex flex-col justify-between overflow-hidden relative shadow-inner">
            <div className="absolute top-2.5 right-2.5 text-[10px] font-mono tracking-wider text-slate-400 uppercase">
              Parsed Output
            </div>

            {isParsing ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2">
                <span className="h-6 w-6 border-2 border-indigo-505 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono text-slate-500 animate-pulse">Analyzing structural definitions...</p>
              </div>
            ) : uploadedSchema ? (
              <div className="flex flex-col h-full justify-between animate-fadeIn">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-mono text-emerald-600 font-bold">SCHEMA PARSED SUCCESSFULLY</span>
                  </div>
                  
                  {/* Table details */}
                  <div className="mt-3">
                    <div className="text-slate-800 font-sans font-bold text-sm">
                      {uploadedSchema.name}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-relaxed">
                      {uploadedSchema.description}
                    </p>
                  </div>

                  {/* Columns list */}
                  <div className="mt-3 overflow-y-auto max-h-[85px] space-y-1 border-t border-slate-200 pt-2 font-mono text-[11px] text-slate-700">
                    {uploadedSchema.columns.map((col, i) => (
                      <div key={i} className="flex justify-between border-b border-slate-100 py-0.5">
                        <span className={col.isPrimaryKey ? 'text-indigo-600 font-bold' : ''}>
                          {col.name} {col.isPrimaryKey ? '(PK)' : ''}
                        </span>
                        <span className="text-slate-400">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Format: {fileType === 'csv' ? 'CSV File Headers' : 'SQL CREATE TABLE DDL'}
                  </span>
                  <button
                    onClick={() => {
                      onDeployImportedSource(uploadedSchema);
                      setUploadedSchema(null);
                    }}
                    className="flex items-center space-x-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-full border-b-[3px] border-emerald-800 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] cursor-pointer transition-all duration-150 shadow-3xs"
                  >
                    <Plus size={13} />
                    <span>Map onto Canvas</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-slate-400 font-mono">No files imported yet.</p>
                <p className="text-[10px] text-slate-400/65 mt-1 leading-normal">Upload files raw schema above to instantly generate nodes on your canvas.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
