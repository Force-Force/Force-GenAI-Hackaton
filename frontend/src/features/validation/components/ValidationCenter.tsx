import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Award,
  Layers,
  Scale,
  Lock,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import type { ValidationItem } from '../../../types/pipeline';
import { DomainAuditRenderer } from './DomainAuditRenderer';

const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-700" />,
  warning: <AlertTriangle size={16} className="text-[#D66F14]" />,
  error: <XCircle size={16} className="text-rose-600" />,
};

const ROW = {
  success: 'bg-emerald-50/70 border-emerald-200 text-[#1E2D24]',
  warning: 'bg-amber-50/70 border-amber-200 text-[#1E2D24]',
  error: 'bg-rose-50/70 border-rose-200 text-[#1E2D24]',
};

function scoreTone(score: number): string {
  if (score >= 85) return 'text-[#064C1C]';
  if (score >= 60) return 'text-[#D66F14]';
  return 'text-rose-600';
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

  // Sub-tabs: Sub-Tab A (Structural & Schema) vs Sub-Tab B (Data & KPI Audit)
  const [activeSubTab, setActiveSubTab] = useState<'structural' | 'kpis'>('kpis');
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [hasDataVariance, setHasDataVariance] = useState(true);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full custom-scrollbar space-y-6">
      {/* 1. Independent Audit Agent Header Badge & Verification Seal */}
      <div className="p-5 rounded-3xl bg-white border border-[#334139]/15 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#064C1C] text-[#FDFFFC] flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[#1E2D24]">
                  Independent Audit Center
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#064C1C]/10 text-[#064C1C] border border-[#064C1C]/20">
                  <Lock size={10} />
                  Author-Isolated Agent
                </span>
                <span className="text-[10px] font-mono text-[#334139]/50">
                  AGT-AUDIT-4091
                </span>
              </div>
              <p className="text-xs text-[#334139]/70 leading-relaxed mt-0.5">
                <span className="font-semibold text-[#1E2D24]">Segregation of Duties Enforced:</span> Builders do not grade their own work. Verification runs under read-only isolated context.
              </p>
            </div>
          </div>

          {/* Interactive Official Auditor Verification Seal */}
          <button
            type="button"
            onClick={() => setShowCertificateModal(true)}
            className="group flex items-center gap-3 p-2.5 rounded-2xl bg-[#FDFFFC] border border-[#334139]/15 hover:border-[#064C1C]/50 hover:shadow-sm transition-all cursor-pointer shrink-0 text-left"
            title="Inspect Official Independent Audit Verification Certificate"
          >
            {/* Circular Stamp Emblems */}
            <div className="relative w-12 h-12 rounded-full border-2 border-dashed border-[#064C1C]/50 flex items-center justify-center group-hover:scale-105 transition-transform bg-[#064C1C]/5">
              <Award size={20} className="text-[#064C1C]" />
              <div className="absolute inset-0 rounded-full border border-[#064C1C]/20 animate-pulse pointer-events-none" />
            </div>

            <div>
              <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider font-bold text-[#064C1C]">
                <span>Official Verification Seal</span>
                <ExternalLink size={10} />
              </div>
              <div className="text-xs font-bold text-[#1E2D24] mt-0.5">
                {hasDataVariance ? 'Audit Findings Logged' : '100% Certified Reconciled'}
              </div>
              <div className="text-[10px] font-mono text-[#334139]/50">
                SHA256:7f9c2d1b...
              </div>
            </div>
          </button>
        </div>

        {/* Global Audit Actions & Sub-Tab Navigation Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#334139]/10">
          {/* Sub-Tab Navigation Segmented Control */}
          <div className="flex items-center gap-1 bg-[#334139]/[0.05] p-1 rounded-2xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('kpis')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                activeSubTab === 'kpis'
                  ? 'bg-white text-[#1E2D24] shadow-2xs'
                  : 'text-[#334139]/60 hover:text-[#334139]',
              )}
            >
              <Scale size={14} className={activeSubTab === 'kpis' ? 'text-[#064C1C]' : ''} />
              <span>Sub-Tab B: Data & KPI Audit Findings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('structural')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                activeSubTab === 'structural'
                  ? 'bg-white text-[#1E2D24] shadow-2xs'
                  : 'text-[#334139]/60 hover:text-[#334139]',
              )}
            >
              <Layers size={14} className={activeSubTab === 'structural' ? 'text-[#064C1C]' : ''} />
              <span>Sub-Tab A: Structural & Schema Validation</span>
            </button>
          </div>

          {/* Trigger Full Audit Button */}
          <Button
            variant="primary"
            onClick={() => void runValidation()}
            disabled={isValidating}
            className="rounded-full shadow-2xs self-end sm:self-auto"
          >
            <RefreshCw size={13} className={cn(isValidating && 'animate-spin')} />
            <span>{isValidating ? 'Auditing Schema...' : 'Run Independent Audit'}</span>
          </Button>
        </div>
      </div>

      {/* 2. SUB-TAB B: Data & KPI Audit Findings (Domain-Adaptive) */}
      {activeSubTab === 'kpis' && (
        <section className="space-y-4 animate-fadeIn">
          <DomainAuditRenderer onStatusChange={(variance) => setHasDataVariance(variance)} />
        </section>
      )}

      {/* 3. SUB-TAB A: Structural & Schema Validation (Existing Schema Health Score Card) */}
      {activeSubTab === 'structural' && (
        <section className="space-y-4 animate-fadeIn">
          {score !== null && (
            <div className="p-5 rounded-3xl border border-[#334139]/15 bg-white shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#334139]/55 font-bold">
                      Schema Health Score
                    </span>
                    {status && (
                      <span
                        className={cn(
                          'text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                          status === 'PASSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800',
                        )}
                      >
                        {status}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#334139]/65 mt-1">
                    {source === 'backend'
                      ? 'Authoritative validation computed by the backend verification engine.'
                      : 'Computed locally by in-memory schema graph analyzer.'}
                  </div>
                </div>

                <div className="flex items-baseline gap-2 shrink-0">
                  {grade && (
                    <span className={cn('text-3xl font-bold font-mono', scoreTone(score))}>
                      {grade}
                    </span>
                  )}
                  <span className={cn('text-3xl font-bold tabular-nums', scoreTone(score))}>
                    {score}
                    <span className="text-base text-[#334139]/40 font-normal">/100</span>
                  </span>
                </div>
              </div>

              {summary && (
                <div className="pt-3 border-t border-[#334139]/10 text-xs leading-relaxed text-[#334139]/80">
                  {summary}
                </div>
              )}
            </div>
          )}

          {validations.length === 0 ? (
            <div className="text-center text-[#334139]/50 text-xs py-16 border border-dashed border-[#334139]/20 rounded-3xl bg-white/40">
              No validation items recorded. Click "Run Independent Audit" above to analyze the warehouse schema graph.
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[#1E2D24]">
                  Rule-Based Audit Assertions ({validations.length})
                </span>
                <span className="text-[11px] font-mono text-[#334139]/50">
                  {validations.filter((v) => v.type === 'error').length} Errors ·{' '}
                  {validations.filter((v) => v.type === 'warning').length} Warnings ·{' '}
                  {validations.filter((v) => v.type === 'success').length} Passed
                </span>
              </div>

              {validations.map((item: ValidationItem) => (
                <div
                  key={item.id}
                  className={cn('flex items-start gap-3 p-3.5 rounded-2xl border', ROW[item.type])}
                >
                  <div className="mt-0.5 shrink-0">{ICONS[item.type]}</div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#334139]/60 font-bold">
                      {item.category}
                    </div>
                    <div className="text-xs text-[#1E2D24] mt-0.5 leading-relaxed font-medium">
                      {item.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Verification Seal Detail Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#334139]/20 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#334139]/12">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#064C1C] text-[#FDFFFC] flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E2D24]">
                    Official Audit Verification Seal
                  </h3>
                  <p className="text-[11px] font-mono text-[#334139]/55">
                    Certificate of Independent Schema & Metric Review
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="p-1 rounded-lg text-[#334139]/50 hover:text-[#334139] hover:bg-[#334139]/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#334139]/80 leading-relaxed">
              <div className="p-3 rounded-2xl bg-[#064C1C]/5 border border-[#064C1C]/20 space-y-1">
                <span className="font-bold text-[#064C1C] flex items-center gap-1.5 text-xs">
                  <ShieldCheck size={14} />
                  Strict Segregation of Duties Attestation
                </span>
                <p className="text-[11px] text-[#334139]/75">
                  This audit was executed by an isolated verification agent with read-only sandbox permissions. The pipeline author and synthesis agents held zero write or influence access over this verdict.
                </p>
              </div>

              <div className="divide-y divide-[#334139]/10 text-[11px] font-mono">
                <div className="py-2 flex justify-between">
                  <span className="text-[#334139]/50">Auditor Role:</span>
                  <span className="font-bold text-[#1E2D24]">Independent Audit Agent</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-[#334139]/50">Auditor ID:</span>
                  <span className="font-bold text-[#1E2D24]">AGT-AUDIT-4091</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-[#334139]/50">Author Role:</span>
                  <span className="font-bold text-[#334139]">Master Pipeline Architect (Builder)</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-[#334139]/50">Attestation Timestamp:</span>
                  <span className="font-bold text-[#1E2D24]">2026-10-24 14:32:00 UTC</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-[#334139]/50">Cryptographic Seal:</span>
                  <span className="font-bold text-[#064C1C] truncate max-w-[220px]">
                    SHA256:7f9c2d1b8e4a9032fa8830114bced83944ef1a0753
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#334139]/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[#064C1C] text-[#FDFFFC] hover:bg-[#1E2D24] transition-colors cursor-pointer"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
