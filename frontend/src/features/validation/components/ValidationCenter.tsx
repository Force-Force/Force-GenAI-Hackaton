import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import type { ValidationItem } from '../../../types/pipeline';

const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-600" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  error: <XCircle size={16} className="text-rose-500" />,
};

const ROW = {
  success: 'bg-emerald-50 border-emerald-200/70',
  warning: 'bg-amber-50 border-amber-200/70',
  error: 'bg-rose-50 border-rose-200/70',
};

function scoreTone(score: number): string {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-500';
  return 'text-rose-500';
}

export function ValidationCenter() {
  const validations = useWorkspaceStore((s) => s.validations);
  const isValidating = useWorkspaceStore((s) => s.isValidating);
  const runValidation = useWorkspaceStore((s) => s.runValidation);
  const score = useWorkspaceStore((s) => s.validationScore);
  const grade = useWorkspaceStore((s) => s.validationGrade);
  const status = useWorkspaceStore((s) => s.validationStatus);
  const summary = useWorkspaceStore((s) => s.validationSummary);
  const source = useWorkspaceStore((s) => s.validationSource);

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto w-full custom-scrollbar">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#4F46E5]" />
          <h2 className="text-sm font-sans font-bold text-slate-800">Schema Validation Center</h2>
        </div>
        <Button variant="primary" onClick={() => void runValidation()} disabled={isValidating}>
          <RefreshCw size={13} className={cn(isValidating && 'animate-spin')} />
          Run Validation
        </Button>
      </div>

      {score !== null && (
        <div className="mb-4 p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Schema Health Score
                </span>
                {status && (
                  <span
                    className={cn(
                      'text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                      status === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700',
                    )}
                  >
                    {status}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {source === 'backend'
                  ? 'Computed by the backend engine (POST /pipelines/{id}/validate).'
                  : 'Computed locally — backend unavailable.'}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              {grade && (
                <span className={cn('text-2xl font-sans font-bold', scoreTone(score))}>
                  {grade}
                </span>
              )}
              <span className={cn('text-3xl font-sans font-bold tabular-nums', scoreTone(score))}>
                {score}
                <span className="text-base text-slate-400">/100</span>
              </span>
            </div>
          </div>
          {summary && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] leading-relaxed text-slate-600">
              {summary}
            </div>
          )}
        </div>
      )}

      {validations.length === 0 ? (
        <div className="text-center text-slate-400 text-xs py-16 border border-dashed border-slate-200 rounded-xl">
          No validation results yet. Run a validation to audit the warehouse schema.
        </div>
      ) : (
        <div className="space-y-2">
          {validations.map((item: ValidationItem) => (
            <div key={item.id} className={cn('flex items-start gap-3 p-3.5 rounded-lg border', ROW[item.type])}>
              <div className="mt-0.5">{ICONS[item.type]}</div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">{item.category}</div>
                <div className="text-xs text-slate-700 mt-0.5 leading-relaxed">{item.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
