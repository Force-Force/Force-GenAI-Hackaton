import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, BadgeInfo } from 'lucide-react';
import { ValidationItem } from '../types';

interface ValidationBannerProps {
  validations: ValidationItem[];
  onAddRule: () => void;
  onClearErrors: () => void;
}

export default function ValidationBanner({ validations, onAddRule, onClearErrors }: ValidationBannerProps) {
  const errorCount = validations.filter(v => v.type === 'error').length;
  const warningCount = validations.filter(v => v.type === 'warning').length;
  const successCount = validations.filter(v => v.type === 'success').length;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl p-5 select-none animate-fadeIn">
      {/* Validation Header Stats */}
      <div className="flex items-center justify-between border-b border-slate-150 pb-4 mb-4">
        <div>
          <h3 className="text-lg font-sans font-semibold text-slate-800 flex items-center space-x-2">
            <ShieldAlert size={20} className="text-[#4F46E5] font-bold" />
            <span>Architecture Validation Center</span>
          </h3>
          <p className="text-xs text-slate-450 mt-0.5">
            Automated schema audits, compliance standards, and structural referential validations.
          </p>
        </div>
        <div className="flex space-x-2 text-xs">
          <button
            onClick={onAddRule}
            className="px-3.5 py-1.5 bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-bold rounded-full border-b-[3px] border-indigo-800 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] cursor-pointer transition-all duration-150 shadow-sm"
          >
            Run Custom Rules
          </button>
          <button
            onClick={onClearErrors}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 border-b-[3px] border-slate-300 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] font-bold rounded-full cursor-pointer transition-all duration-150"
          >
            Clear Checks
          </button>
        </div>
      </div>

      {/* Aggregate Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 tracking-wide uppercase font-mono text-[9px] font-bold">Passed Actions</div>
              <div className="text-xl font-bold text-emerald-600">{successCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50/40 border border-amber-100 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-amber-50 text-amber-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 tracking-wide uppercase font-mono text-[9px] font-bold">Warnings Raised</div>
              <div className="text-xl font-bold text-amber-600">{warningCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-rose-50/40 border border-rose-100 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-rose-50 text-rose-600">
              <XCircle size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 tracking-wide uppercase font-mono text-[9px] font-bold">Failed Audits</div>
              <div className="text-xl font-bold text-rose-600">{errorCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation List Cards */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-sans">
        {validations.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-205 rounded-lg">
            <p className="text-slate-400 text-sm">No validation rules listed yet.</p>
            <button
              onClick={onAddRule}
              className="text-xs text-indigo-600 font-semibold underline mt-2"
            >
              Seed test schema validations
            </button>
          </div>
        ) : (
          validations.map((item) => {
            const isError = item.type === 'error';
            const isWarning = item.type === 'warning';
            const isSuccess = item.type === 'success';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border flex items-start space-x-3.5 transition-transform hover:scale-[1.005] duration-200 ${
                  isError
                    ? 'bg-rose-50/15 border-rose-150 text-slate-800'
                    : isWarning
                    ? 'bg-amber-50/15 border-amber-150 text-slate-800'
                    : 'bg-emerald-50/15 border-emerald-150 text-slate-800'
                }`}
              >
                <div
                  className={`p-1.5 rounded mt-0.5 ${
                    isError
                      ? 'bg-rose-55/10 text-rose-600'
                      : isWarning
                      ? 'bg-amber-55/10 text-amber-600'
                      : 'bg-emerald-55/10 text-emerald-600'
                  }`}
                >
                  {isError ? (
                    <XCircle size={16} />
                  ) : isWarning ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold uppercase tracking-wider ${
                        isError
                          ? 'text-rose-600'
                          : isWarning
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {item.category} Validation Check
                    </span>
                    <span className="text-[10px] bg-white text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-mono">
                      {isError ? 'CRITICAL' : isWarning ? 'COMPLIANCE' : 'HEALTHY'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-750 font-medium mt-1.5 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
