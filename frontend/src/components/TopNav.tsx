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
    <header className="h-16 w-full bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shrink-0 shadow-sm">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center space-x-3">
        <div className="bg-[#4F46E5] text-white p-2 rounded-lg flex items-center justify-center shadow-md">
          <Database size={20} id="logo-icon" className="animate-pulse" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-sans font-bold text-lg text-slate-950 tracking-tight">AuraBI</span>
          </div>
          <input
            id="proj-name-input"
            type="text"
            value={projectName}
            onChange={(e) => onRenameProject(e.target.value)}
            className="text-xs text-slate-500 bg-transparent border-none p-0 focus:ring-0 focus:outline-none hover:text-slate-900 transition-colors cursor-edit w-44 font-medium"
            title="Click to rename project"
          />
        </div>
      </div>

      {/* Center: Live Architecture Status */}
      <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full">
        <span className="h-2 w-2 rounded-full bg-[#10B981] animate-ping" />
        <span className="text-[11px] font-mono text-slate-500 tracking-wider uppercase font-semibold">
          Model:
        </span>
        <span className="text-[12px] font-mono font-medium text-slate-800">
          Retail Warehouse
        </span>
        <span className="text-slate-300 text-xs">|</span>
        <span
          className={`text-[11px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            isValid === true
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
              : isValid === false
              ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
              : 'bg-amber-50 text-amber-600 border border-amber-200/60'
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
          className="flex items-center space-x-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 border-b-[3px] border-slate-300 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] font-semibold px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer h-9 shadow-xs"
        >
          <CheckCircle size={15} className={isValidating ? 'animate-spin text-indigo-505' : 'text-emerald-500'} />
          <span>{isValidating ? 'Verifying...' : 'Validate Schema'}</span>
        </button>

        <button
          id="btn-generate-etl"
          onClick={onGenerateETL}
          className="flex items-center space-x-1.5 text-xs bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-bold px-4 py-1.5 rounded-full border-b-[3px] border-indigo-800 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] transition-all duration-150 cursor-pointer h-9 shadow-md shadow-[#4F46E5]/10"
        >
          <Play size={14} className="text-white fill-white" />
          <span>Generate ETL</span>
        </button>

        <button
          id="btn-export"
          onClick={onExport}
          className="flex items-center space-x-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 border-b-[3px] border-slate-300 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] font-semibold px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer h-9"
          title="Export SQL DLL or dbt configuration"
        >
          <FileCode size={15} className="text-sky-500" />
          <span>Export Schema</span>
        </button>

        <button
          id="btn-reset"
          onClick={onReset}
          className="flex items-center justify-center text-slate-400 hover:text-red-500 bg-white hover:bg-rose-50 p-2 rounded-full transition-all duration-150 cursor-pointer border border-slate-200 border-b-[3px] border-slate-300 hover:border-b-[4px] hover:border-red-200 hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] h-9 w-9"
          title="Reset to Empty State"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </header>
  );
}
