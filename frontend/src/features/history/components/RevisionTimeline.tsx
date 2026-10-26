import { useState } from 'react';
import {
  GitCommit,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  User,
  Workflow,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { PipelineRevision, PipelineRevisionAuthor } from '../../../contracts/projectHistory';
import { useHistoryStore } from '../store/historyStore';
import { cn } from '../../../utils/cn';

interface RevisionTimelineProps {
  revisions: PipelineRevision[];
  onSelectRevision?: (rev: PipelineRevision) => void;
}

export function RevisionTimeline({ revisions, onSelectRevision }: RevisionTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(revisions[0]?.id || null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoredSuccessId, setRestoredSuccessId] = useState<string | null>(null);

  const rollbackToRevision = useHistoryStore((s) => s.rollbackToRevision);

  const handleRollback = async (rev: PipelineRevision) => {
    setRestoringId(rev.id);
    try {
      const ok = await rollbackToRevision(rev.id);
      if (ok) {
        setRestoredSuccessId(rev.id);
        setTimeout(() => setRestoredSuccessId(null), 3000);
      }
    } finally {
      setRestoringId(null);
    }
  };

  const getAuthorBadge = (type: PipelineRevisionAuthor, name: string) => {
    switch (type) {
      case 'AUDITOR_AGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#064C1C]/10 text-[#064C1C] border border-[#064C1C]/20">
            <ShieldCheck size={11} />
            <span>{name}</span>
          </span>
        );
      case 'PLANNER_AGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#D66F14]/10 text-[#D66F14] border border-[#D66F14]/25">
            <Sparkles size={11} />
            <span>{name}</span>
          </span>
        );
      case 'GUARDIAN_AGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldCheck size={11} />
            <span>{name}</span>
          </span>
        );
      case 'USER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <User size={11} />
            <span>{name}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#064C1C]/5 text-[#1E2D24] border border-[#064C1C]/15">
            <Workflow size={11} />
            <span>{name}</span>
          </span>
        );
    }
  };

  if (revisions.length === 0) {
    return (
      <div className="py-16 text-center space-y-3 font-sans">
        <div className="w-12 h-12 rounded-full bg-[#334139]/5 text-[#334139]/40 flex items-center justify-center mx-auto">
          <GitCommit size={20} />
        </div>
        <div className="text-sm font-semibold text-[#1E2D24]">No revisions recorded yet</div>
        <p className="text-xs text-[#334139]/60 max-w-sm mx-auto">
          Every prompt synthesis, graph change, or plan approval creates a verified version snapshot you can inspect or revert to.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-[#334139]/10 text-xs text-[#334139]/70">
        <div className="flex items-center gap-2">
          <GitCommit size={14} className="text-[#064C1C]" />
          <span className="font-semibold text-[#1E2D24]">Architectural Timeline</span>
          <span className="text-[#334139]/40">·</span>
          <span>{revisions.length} total versions</span>
        </div>
        <span className="text-[11px] font-mono text-[#334139]/50">LATEST AT TOP</span>
      </div>

      <div className="relative pl-6 space-y-6">
        {/* Soft Timeline Rail */}
        <span className="absolute left-[11px] top-3 bottom-4 w-px bg-[#334139]/15" />

        {revisions.map((rev, idx) => {
          const isLatest = idx === 0;
          const isExpanded = expandedId === rev.id;
          const isRestoring = restoringId === rev.id;
          const isSuccess = restoredSuccessId === rev.id;

          return (
            <div key={rev.id} className="relative group">
              {/* Timeline Node Icon */}
              <span
                className={cn(
                  'absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-2xs',
                  isLatest
                    ? 'bg-[#064C1C] text-white ring-4 ring-[#064C1C]/15'
                    : 'bg-white border-2 border-[#334139]/25 text-[#334139]/60 group-hover:border-[#064C1C] group-hover:text-[#064C1C]',
                )}
              >
                {isLatest ? <Check size={12} strokeWidth={3} /> : <GitCommit size={12} />}
              </span>

              {/* Revision Card */}
              <div
                className={cn(
                  'rounded-2xl border transition-all duration-200 bg-white p-4 space-y-3',
                  isLatest
                    ? 'border-[#064C1C]/30 shadow-xs ring-1 ring-[#064C1C]/10'
                    : 'border-[#334139]/12 hover:border-[#334139]/25 hover:shadow-2xs',
                )}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#1E2D24] text-[#FDFFFC]">
                        v{rev.revision}
                      </span>
                      {isLatest && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#064C1C]/10 text-[#064C1C] border border-[#064C1C]/25">
                          Active State
                        </span>
                      )}
                      {rev.tags.includes('rollback') && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Rollback
                        </span>
                      )}
                      {getAuthorBadge(rev.author_type, rev.author_name)}
                    </div>

                    <h3 className="text-sm font-bold text-[#1E2D24] leading-snug">
                      {rev.title}
                    </h3>
                  </div>

                  {/* Actions: Expand & Rollback */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isLatest && (
                      <button
                        type="button"
                        onClick={() => void handleRollback(rev)}
                        disabled={isRestoring}
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer',
                          isSuccess
                            ? 'bg-[#064C1C] text-white border-[#064C1C]'
                            : 'bg-white text-[#334139] border-[#334139]/20 hover:border-[#064C1C] hover:text-[#064C1C] hover:bg-[#064C1C]/5',
                        )}
                        title="Restore this architectural revision to canvas"
                      >
                        {isRestoring ? (
                          <RotateCcw size={11} className="animate-spin" />
                        ) : isSuccess ? (
                          <Check size={11} />
                        ) : (
                          <RotateCcw size={11} />
                        )}
                        <span>{isSuccess ? 'Restored' : isRestoring ? 'Restoring…' : 'Restore'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : rev.id);
                        onSelectRevision?.(rev);
                      }}
                      className="p-1 rounded-lg text-[#334139]/50 hover:text-[#1E2D24] hover:bg-[#334139]/5 transition-colors cursor-pointer"
                      aria-label={isExpanded ? 'Collapse revision details' : 'Expand revision details'}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>

                {/* Editorial Description */}
                {rev.description && (
                  <p className="text-xs text-[#334139]/80 leading-relaxed font-sans">
                    {rev.description}
                  </p>
                )}

                {/* Summary Metadata Metrics */}
                <div className="flex items-center gap-4 text-xs text-[#334139]/60 font-sans pt-1 border-t border-[#334139]/8">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-[#334139]/40" />
                    <span>{new Date(rev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers size={12} className="text-[#334139]/40" />
                    <span>
                      {rev.node_count} node{rev.node_count === 1 ? '' : 's'} · {rev.edge_count} connection{rev.edge_count === 1 ? '' : 's'}
                    </span>
                  </div>
                  {rev.stage_count > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      <Workflow size={12} className="text-[#334139]/40" />
                      <span>{rev.stage_count} stages</span>
                    </div>
                  )}
                </div>

                {/* Expanded Details: Changes list & operations */}
                {isExpanded && rev.operations_summary && rev.operations_summary.length > 0 && (
                  <div className="pt-2 border-t border-[#334139]/8 space-y-2 text-xs">
                    <div className="text-[11px] font-semibold text-[#1E2D24] uppercase tracking-wider">
                      Operations Applied ({rev.operations_summary.length})
                    </div>
                    <ul className="space-y-1.5 rounded-xl bg-[#FDFFFC] border border-[#334139]/10 p-2.5">
                      {rev.operations_summary.map((op, i) => (
                        <li key={i} className="flex items-start gap-2 text-[#334139]/85">
                          <Check size={12} className="text-[#064C1C] shrink-0 mt-0.5" />
                          <span className="leading-tight">{op}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

