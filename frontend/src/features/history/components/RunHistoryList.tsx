import { useState } from 'react';
import {
  Play,
  Check,
  AlertTriangle,
  XCircle,
  Loader2,
  Clock,
  Database,
  Layers,
  ChevronDown,
  ChevronRight,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import type { PipelineRunHistoryItem } from '../../../contracts/projectHistory';
import { useBackendStore } from '../../../services/session/backendSession';
import { useHistoryStore } from '../store/historyStore';
import { cn } from '../../../utils/cn';

interface RunHistoryListProps {
  runs: PipelineRunHistoryItem[];
  onSelectRun?: (run: PipelineRunHistoryItem) => void;
}

export function RunHistoryList({ runs, onSelectRun }: RunHistoryListProps) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(runs[0]?.id || null);
  const [isStartingRun, setIsStartingRun] = useState(false);

  const startPipelineRun = useBackendStore((s) => s.startPipelineRun);
  const fetchHistory = useHistoryStore((s) => s.fetchHistory);

  const handleStartRun = async () => {
    setIsStartingRun(true);
    try {
      await startPipelineRun();
      await fetchHistory();
    } finally {
      setIsStartingRun(false);
    }
  };

  const getStatusBadge = (status: PipelineRunHistoryItem['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check size={11} strokeWidth={3} />
            <span>Completed</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Loader2 size={11} className="animate-spin" />
            <span>Running</span>
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldAlert size={11} />
            <span>Awaiting Approval</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={11} />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  if (runs.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 font-sans">
        <div className="w-12 h-12 rounded-full bg-[#334139]/5 text-[#334139]/40 flex items-center justify-center mx-auto">
          <Play size={20} />
        </div>
        <div className="text-sm font-semibold text-[#1E2D24]">No execution runs yet</div>
        <p className="text-xs text-[#334139]/60 max-w-sm mx-auto">
          Trigger a pipeline run to execute data ingestion, transformation SQL, and dimensional mart rollups.
        </p>
        <button
          type="button"
          onClick={() => void handleStartRun()}
          disabled={isStartingRun}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#064C1C] text-white hover:bg-[#1E2D24] transition-colors cursor-pointer"
        >
          {isStartingRun ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          <span>Start First Run</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-[#334139]/10 text-xs text-[#334139]/70">
        <div className="flex items-center gap-2">
          <Play size={14} className="text-[#064C1C]" />
          <span className="font-semibold text-[#1E2D24]">Execution History</span>
          <span className="text-[#334139]/40">·</span>
          <span>{runs.length} runs recorded</span>
        </div>

        <button
          type="button"
          onClick={() => void handleStartRun()}
          disabled={isStartingRun}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#064C1C] text-white hover:bg-[#1E2D24] transition-colors cursor-pointer"
        >
          {isStartingRun ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
          <span>Run Pipeline</span>
        </button>
      </div>

      <div className="divide-y divide-[#334139]/10">
        {runs.map((run) => {
          const isExpanded = expandedRunId === run.id;

          return (
            <div key={run.id} className="py-3.5 space-y-2">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#334139]/10 text-[#1E2D24]">
                      Run #{run.run_number}
                    </span>
                    {getStatusBadge(run.status)}
                    <span className="text-[11px] font-mono text-[#334139]/60">
                      {run.trigger_type.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-[#334139]/80 font-sans flex items-center gap-3 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-[#334139]/40" />
                      <span>{new Date(run.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </span>
                    <span>·</span>
                    <span>{run.duration_seconds.toFixed(1)}s</span>
                    <span>·</span>
                    <span className="font-semibold text-[#1E2D24]">
                      {run.records_processed.toLocaleString()} rows
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setExpandedRunId(isExpanded ? null : run.id);
                    onSelectRun?.(run);
                  }}
                  className="p-1 text-[#334139]/50 hover:text-[#1E2D24] transition-colors cursor-pointer"
                  aria-label={isExpanded ? 'Collapse run details' : 'Expand run details'}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>

              {/* Error banner if any */}
              {run.error_message && (
                <div className="p-2 rounded bg-rose-50 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-snug">{run.error_message}</span>
                </div>
              )}

              {/* Expanded Events Timeline */}
              {isExpanded && run.events && run.events.length > 0 && (
                <div className="pt-2 pl-3 border-l-2 border-[#064C1C]/30 space-y-1.5 text-xs">
                  <div className="text-[10px] font-semibold text-[#1E2D24] uppercase tracking-wider">
                    Execution Steps ({run.events.length})
                  </div>
                  <div className="space-y-1">
                    {run.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start justify-between gap-2 text-[#334139]/85 text-xs py-0.5"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          {ev.status === 'SUCCESS' ? (
                            <Check size={11} className="text-[#064C1C] shrink-0 mt-0.5" />
                          ) : ev.status === 'WARNING' ? (
                            <AlertTriangle size={11} className="text-amber-600 shrink-0 mt-0.5" />
                          ) : ev.status === 'ERROR' ? (
                            <XCircle size={11} className="text-rose-600 shrink-0 mt-0.5" />
                          ) : (
                            <Clock size={11} className="text-sky-600 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-[#1E2D24] mr-1.5">{ev.phase}:</span>
                            <span className="leading-tight text-[#334139]/80">{ev.message}</span>
                          </div>
                        </div>

                        {typeof ev.duration_ms === 'number' && (
                          <span className="text-[10px] font-mono text-[#334139]/45 shrink-0">
                            {(ev.duration_ms / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

