import { useState } from "react";
import {
  Check,
  ShieldCheck,
  Workflow,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import { navigateTo } from "../../../utils/navigation";
import { useWorkspaceStore } from "../../workspace/store/workspaceStore";
import { DomainAuditRenderer } from "./DomainAuditRenderer";

export function ValidationCenter() {
  const projectName = useWorkspaceStore((s) => s.projectName);
  const [hasDataVariance, setHasDataVariance] = useState(true);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-10">
      {/* 1. Editorial Lead (Matching PlanProposalPage typography & spacing) */}
      <section className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-[#064C1C] font-semibold">
            <Check size={14} strokeWidth={3} className="shrink-0" />
            <span>Audited by a separate agent</span>
          </div>
          <span className="text-[#334139]/40">·</span>
          <span className="text-[#334139]/70">
            Nothing is graded by its own author
          </span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#334139] leading-snug">
          {projectName || "Retail Lakehouse Master Pipeline"} — Independent
          Audit
        </h1>

        <p className="text-sm md:text-base text-[#334139]/75 leading-relaxed max-w-2xl">
          A dedicated audit agent — separate from the builder agents that
          constructed your pipeline — checked the results and organized the
          findings to match your data.
        </p>
      </section>

      {/* 2. Separation of Builder vs. Auditor */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-[#334139]/12">
          <span className="text-sm font-bold text-[#334139]">
            Role Separation
          </span>
          <span className="text-xs text-[#334139]/60">
            Independent verification
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Builder Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#334139]/15 shadow-2xs flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#334139]/8 text-[#334139] flex items-center justify-center shrink-0 mt-0.5">
              <Workflow size={16} />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#334139]">
                  Builder Agents
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#334139]/[0.06] text-[#334139]/70 font-semibold">
                  Author
                </span>
              </div>
              <p className="text-sm text-[#334139]/75 leading-relaxed">
                Designed the schema, wrote the SQL transformations, and
                assembled the pipeline stages.
              </p>
            </div>
          </div>

          {/* Auditor Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#064C1C]/25 shadow-2xs flex items-start gap-3.5">
            <div
              style={{ backgroundColor: "#064C1C" }}
              className="w-8 h-8 rounded-lg text-[#FDFFFC] flex items-center justify-center shrink-0 mt-0.5"
            >
              <ShieldCheck size={16} />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1E2D24]">
                  Independent Audit Agent
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#064C1C]/10 text-[#064C1C] font-semibold">
                  Reviewer
                </span>
              </div>
              <p className="text-sm text-[#334139]/75 leading-relaxed">
                Separate from the builders. Checks the final numbers against raw
                source data in read-only mode.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Domain-Suited Audit Findings */}
      <section className="space-y-3">
        <DomainAuditRenderer
          onStatusChange={(variance) => setHasDataVariance(variance)}
        />
      </section>

      {/* 4. Bottom Summary & Sign-Off Card */}
      <section className="pt-2">
        <div className="p-5 md:p-6 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {hasDataVariance ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#D66F14]">
                  <AlertTriangle size={15} />
                  <span>1 discrepancy flagged for review</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#064C1C]">
                  <Check size={15} strokeWidth={3} />
                  <span>All audited metrics match source data</span>
                </span>
              )}
            </div>
            <p className="text-sm text-[#334139]/75 leading-relaxed">
              {hasDataVariance
                ? "Review the highlighted row above or return to the workspace to adjust the pipeline."
                : "Every tracked metric reconciled with zero variance against raw source ledgers."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo("/workspace")}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-[#FDFFFC] transition-all cursor-pointer shrink-0 shadow-xs",
              "bg-[#064C1C] hover:bg-[#1E2D24]",
            )}
          >
            <span>Back to Workspace</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
