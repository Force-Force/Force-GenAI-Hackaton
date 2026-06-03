import React from 'react';
import { Database, Bot, CheckCircle, RefreshCw, FileCode, Play, Trash2 } from 'lucide-react';

interface TopNavProps {
  projectName: string;
  onRenameProject: (name: string) => void;
  isValidating: boolean;
  isValid: boolean | null;
  onValidate: () => void;
  onGenerateETL: () => void;
  onExport: () => void;
  onReset: () => void;
}

export default function TopNav({
  projectName,
  onRenameProject,
  isValidating,
  isValid,
  onValidate,
  onGenerateETL,
  onExport,
  onReset
}: TopNavProps) {
  return (
    <header className="h-16 w-full bg-[#1E293B] border-b border-[#475569] flex items-center justify-between px-6 z-10 shrink-0">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center space-x-3">
        <div className="bg-[#4F46E5] text-white p-2 rounded-lg flex items-center justify-center shadow-md">
          <Database size={20} id="logo-icon" className="animate-pulse" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-sans font-bold text-lg text-[#F8FAFC] tracking-tight">AuraBI</span>
            <span className="bg-[#4F46E5]/20 text-[#06B6D4] text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#06B6D4]/30 uppercase font-bold tracking-widest">
              v1.0-AI
            </span>
          </div>
          <input
            id="proj-name-input"
            type="text"
            value={projectName}
            onChange={(e) => onRenameProject(e.target.value)}
            className="text-xs text-[#CBD5E1] bg-transparent border-none p-0 focus:ring-0 focus:outline-none hover:text-white transition-colors cursor-edit w-44 font-medium"
            title="Click to rename project"
          />
        </div>
      </div>

      {/* Center: Live Architecture Status */}
      <div className="flex items-center space-x-2.5 bg-[#0F172A] border border-[#475569]/60 px-4 py-1.5 rounded-full">
        <span className="h-2 w-2 rounded-full bg-[#10B981] animate-ping" />
        <span className="text-[11px] font-mono text-[#CBD5E1] tracking-wider uppercase font-semibold">
          Model:
        </span>
        <span className="text-[12px] font-mono font-medium text-[#06B6D4]">
          Retail Warehouse
        </span>
        <span className="text-[#475569] text-xs">|</span>
        <span
          className={`text-[11px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            isValid === true
              ? 'bg-[#10B981]/20 text-[#10B981]'
              : isValid === false
              ? 'bg-[#EF4444]/20 text-[#EF4444]'
              : 'bg-[#F59E0B]/20 text-[#F59E0B]'
          }`}
        >
          {isValid === true ? 'Validated' : isValid === false ? 'Action Needed' : 'Active Draft'}
        </span>
      </div>

      {/* Right: Quick Action Triggers */}
      <div className="flex items-center space-x-2.5">
        <button
          id="btn-validate"
          onClick={onValidate}
          disabled={isValidating}
          className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-[#F8FAFC] border border-[#475569] font-medium px-3.5 py-1.5 rounded-md transition-all cursor-pointer h-9 shadow-sm"
        >
          <CheckCircle size={15} className={isValidating ? 'animate-spin text-[#06B6D4]' : 'text-[#10B981]'} />
          <span>{isValidating ? 'Verifying...' : 'Validate Schema'}</span>
        </button>

        <button
          id="btn-generate-etl"
          onClick={onGenerateETL}
          className="flex items-center space-x-1.5 text-xs bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-medium px-3.5 py-1.5 rounded-md transition-all cursor-pointer h-9 shadow-md shadow-[#4F46E5]/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Play size={14} className="text-[#06B6D4] fill-cyan-400" />
          <span>Generate ETL</span>
        </button>

        <button
          id="btn-export"
          onClick={onExport}
          className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-[#CBD5E1] border border-[#475569] font-medium px-3.5 py-1.5 rounded-md transition-all cursor-pointer h-9"
          title="Export SQL DLL or dbt configuration"
        >
          <FileCode size={15} className="text-[#06B6D4]" />
          <span>Export Schema</span>
        </button>

        <button
          id="btn-reset"
          onClick={onReset}
          className="flex items-center justify-center text-slate-400 hover:text-[#EF4444] bg-slate-900/60 hover:bg-[#EF4444]/10 p-2 rounded-md transition-all cursor-pointer border border-[#475569]/40 h-9 w-9"
          title="Reset to Empty State"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </header>
  );
}
