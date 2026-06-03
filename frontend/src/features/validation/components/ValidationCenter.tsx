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
  success: 'bg-emerald-50 border-emerald-200/70 dark:bg-emerald-500/10 dark:border-emerald-500/30',
  warning: 'bg-amber-50 border-amber-200/70 dark:bg-amber-500/10 dark:border-amber-500/30',
  error: 'bg-rose-50 border-rose-200/70 dark:bg-rose-500/10 dark:border-rose-500/30',
};

export function ValidationCenter() {
  const validations = useWorkspaceStore((s) => s.validations);
  const isValidating = useWorkspaceStore((s) => s.isValidating);
  const runValidation = useWorkspaceStore((s) => s.runValidation);

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#4F46E5] dark:text-indigo-400" />
          <h2 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">Schema Validation Center</h2>
        </div>
        <Button variant="primary" onClick={runValidation} disabled={isValidating}>
          <RefreshCw size={13} className={cn(isValidating && 'animate-spin')} />
          Run Validation
        </Button>
      </div>

      {validations.length === 0 ? (
        <div className="text-center text-slate-400 dark:text-slate-500 text-xs py-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          No validation results yet. Run a validation to audit the warehouse schema.
        </div>
      ) : (
        <div className="space-y-2">
          {validations.map((item: ValidationItem) => (
            <div key={item.id} className={cn('flex items-start gap-3 p-3.5 rounded-lg border', ROW[item.type])}>
              <div className="mt-0.5">{ICONS[item.type]}</div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{item.category}</div>
                <div className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">{item.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
