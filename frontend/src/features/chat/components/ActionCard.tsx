import { Sparkles, Wand2 } from 'lucide-react';
import type { AiAction } from '../../../contracts/aiActions';
import { Button } from '../../../components/ui';
import { useChatStore } from '../store/chatStore';

/** Renders a structured AI action with Apply Changes / Explain controls. */
export function ActionCard({ action }: { action: AiAction }) {
  const applyAction = useChatStore((s) => s.applyAction);

  return (
    <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-300 mb-2 uppercase tracking-wide">
        <Sparkles size={12} />
        <span>Recommended Action</span>
      </div>

      <div className="text-[11px] text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
        <ActionSummary action={action} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => applyAction(action)}
        >
          {action.type === 'explain' ? (
            'Ask'
          ) : (
            <>
              <Wand2 size={12} /> Apply Changes
            </>
          )}
        </Button>
        {action.type !== 'explain' && (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() =>
              applyAction({ type: 'explain', payload: { target: summaryTarget(action) } })
            }
          >
            Explain
          </Button>
        )}
      </div>
    </div>
  );
}

function ActionSummary({ action }: { action: AiAction }) {
  switch (action.type) {
    case 'create_resource':
      return (
        <div>
          <div className="font-bold font-mono text-slate-900 dark:text-slate-100">
            Add Resource: {action.payload.label} ({action.payload.kind})
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
            Columns: {action.payload.columns.map((c) => c.name).join(', ') || '(none)'}
          </div>
        </div>
      );
    case 'create_processing':
      return (
        <div>
          <div className="font-bold font-mono text-slate-900 dark:text-slate-100">
            Add {action.payload.language.toUpperCase()} step: {action.payload.label}
          </div>
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1 max-h-12 overflow-hidden">
            {action.payload.code.slice(0, 120)}
          </div>
        </div>
      );
    case 'connect_nodes':
      return (
        <div className="font-bold font-mono text-slate-900 dark:text-slate-100">
          Connect {action.payload.fromNode} → {action.payload.toNode}
        </div>
      );
    case 'explain':
      return <div className="text-slate-700 dark:text-slate-200">Explain: {action.payload.target ?? 'design'}</div>;
    default:
      return null;
  }
}

function summaryTarget(action: AiAction): string {
  if (action.type === 'create_resource' || action.type === 'create_processing') {
    return action.payload.label;
  }
  if (action.type === 'connect_nodes') {
    return `${action.payload.fromNode} → ${action.payload.toNode}`;
  }
  return 'design';
}
