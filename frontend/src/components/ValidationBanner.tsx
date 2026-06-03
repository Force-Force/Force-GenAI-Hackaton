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
    <div className="flex flex-col h-full bg-[#1E293B] border border-[#475569]/60 rounded-xl overflow-hidden shadow-xl p-5 select-none animate-fadeIn">
      {/* Validation Header Stats */}
      <div className="flex items-center justify-between border-b border-[#475569]/40 pb-4 mb-4">
        <div>
          <h3 className="text-lg font-sans font-semibold text-[#F8FAFC] flex items-center space-x-2">
            <ShieldAlert size={20} className="text-[#4F46E5]" />
            <span>Architecture Validation Center</span>
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Automated schema audits, compliance standards, and structural referential validations.
          </p>
        </div>
        <div className="flex space-x-2 text-xs">
          <button
            onClick={onAddRule}
            className="px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-medium rounded transition-colors cursor-pointer"
          >
            Run Custom Rules
          </button>
          <button
            onClick={onClearErrors}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#CBD5E1] border border-[#475569] rounded transition-colors cursor-pointer"
          >
            Clear Checks
          </button>
        </div>
      </div>

      {/* Aggregate Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-900/60 border border-[#10B981]/35 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-[#10B981]/15 text-[#10B981]">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-xs text-[#94A3B8] tracking-wide uppercase">Passed Actions</div>
              <div className="text-xl font-bold text-[#10B981]">{successCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-[#F59E0B]/35 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-[#F59E0B]/15 text-[#F59E0B]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-xs text-[#94A3B8] tracking-wide uppercase">Warnings Raised</div>
              <div className="text-xl font-bold text-[#F59E0B]">{warningCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-[#EF4444]/35 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-[#EF4444]/15 text-[#EF4444]">
              <XCircle size={18} />
            </div>
            <div>
              <div className="text-xs text-[#94A3B8] tracking-wide uppercase">Failed Audits</div>
              <div className="text-xl font-bold text-[#EF4444]">{errorCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation List Cards */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {validations.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/10 border border-dashed border-[#475569]/30 rounded-lg">
            <p className="text-[#94A3B8] text-sm">No validation rules listed yet.</p>
            <button
              onClick={onAddRule}
              className="text-xs text-[#06B6D4] font-medium underline mt-2"
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
                    ? 'bg-[#EF4444]/5 border-[#EF4444]/30 text-[#F8FAFC]'
                    : isWarning
                    ? 'bg-[#F59E0B]/5 border-[#F59E0B]/30 text-[#F8FAFC]'
                    : 'bg-[#10B981]/5 border-[#10B981]/30 text-[#F8FAFC]'
                }`}
              >
                <div
                  className={`p-1.5 rounded mt-0.5 ${
                    isError
                      ? 'bg-[#EF4444]/15 text-[#EF4444]'
                      : isWarning
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                      : 'bg-[#10B981]/15 text-[#10B981]'
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
                          ? 'text-[#EF4444]'
                          : isWarning
                          ? 'text-[#F59E0B]'
                          : 'text-[#10B981]'
                      }`}
                    >
                      {item.category} Validation Check
                    </span>
                    <span className="text-[10px] bg-slate-900/60 text-[#94A3B8] px-2 py-0.5 rounded border border-[#475569]/30 font-mono">
                      {isError ? 'CRITICAL' : isWarning ? 'COMPLIANCE' : 'HEALTHY'}
                    </span>
                  </div>
                  <p className="text-sm text-[#F8FAFC] font-medium mt-1.5 leading-relaxed">
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
