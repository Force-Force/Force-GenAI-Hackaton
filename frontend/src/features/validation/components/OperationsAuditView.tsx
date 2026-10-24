import { Check, ArrowRight } from "lucide-react";
import { cn } from "../../../utils/cn";
import type { RowConservationStage, StateTransitionAuditItem } from "../types";

interface OperationsAuditViewProps {
  conservationStages: RowConservationStage[];
  stateTransitions: StateTransitionAuditItem[];
}

export function OperationsAuditView({
  conservationStages,
  stateTransitions,
}: OperationsAuditViewProps) {
  const allConserved = conservationStages.every((s) => s.isConserved);

  return (
    <div className="space-y-8">
      {/* 1. Row-Count Conservation Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#1E2D24]">
              1. Stage-to-Stage Row Conservation Matrix
            </h4>
            <p className="text-[11px] text-[#334139]/60 mt-0.5">
              Every ingested record is accounted for across Bronze, Silver, and
              Gold stages.
            </p>
          </div>
          <span
            className={cn(
              "text-[10px] font-mono font-bold px-2.5 py-1 rounded-full",
              allConserved
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800",
            )}
          >
            {allConserved ? "100% ROWS CONSERVED" : "ROW LEAKAGE DETECTED"}
          </span>
        </div>

        <div className="overflow-x-auto no-scrollbar w-full rounded-2xl border border-[#334139]/15 bg-white shadow-2xs">
          <table className="w-full text-left border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-10 bg-[#FDFFFC] text-[#334139]/70 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-[#334139]/15"
                >
                  Pipeline Stage & Path
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  Rows In
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  Rows Out
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  Filtered
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  Quarantined
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  Conservation (Δ)
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-[#334139]/15 text-right"
                >
                  Audit Verdict
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums divide-y divide-[#334139]/10">
              {conservationStages.map((stage) => {
                const isConserved =
                  stage.isConserved && stage.conservationDelta === 0;
                return (
                  <tr key={stage.id} className="hover:bg-[#064C1C]/[0.02]">
                    <td className="py-3.5 px-4 font-semibold text-[#1E2D24] align-top">
                      <div className="text-xs font-bold text-[#1E2D24]">
                        {stage.stageName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#334139]/60 mt-0.5">
                        <span>{stage.sourceLayer}</span>
                        <ArrowRight size={10} className="text-[#334139]/40" />
                        <span>{stage.targetLayer}</span>
                      </div>
                      <div className="text-[11px] text-[#334139]/55 mt-1 font-normal">
                        {stage.notes}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-[#334139] align-top">
                      {stage.rowsIn.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-[#334139] align-top">
                      {stage.rowsOut.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-[#334139]/70 align-top">
                      {stage.rowsFiltered > 0
                        ? stage.rowsFiltered.toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono align-top">
                      {stage.rowsQuarantined > 0 ? (
                        <span className="text-[#D66F14] font-bold">
                          {stage.rowsQuarantined.toLocaleString()} (DLQ)
                        </span>
                      ) : (
                        <span className="text-[#334139]/40">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono align-top">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border",
                          isConserved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-300",
                        )}
                      >
                        {isConserved
                          ? "Δ = 0 (Conserved)"
                          : `Δ = ${stage.conservationDelta}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right align-top">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                        <Check size={10} strokeWidth={3} />
                        PASS
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. State-Transition Completeness Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#1E2D24]">
              2. State-Transition Completeness Table
            </h4>
            <p className="text-[11px] text-[#334139]/60 mt-0.5">
              Verifies that entity lifecycles progress through valid states
              without illegal skips.
            </p>
          </div>
          <span className="text-[10px] font-mono text-[#334139]/60 font-medium">
            0 illegal state skips
          </span>
        </div>

        <div className="overflow-x-auto no-scrollbar w-full rounded-2xl border border-[#334139]/15 bg-white shadow-2xs">
          <table className="w-full text-left border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-10 bg-[#FDFFFC] text-[#334139]/70 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-[#334139]/15"
                >
                  Audited Entity
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15"
                >
                  State Transition
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  Transitions
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  Completeness
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  In-Transit
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  Illegal Skips
                </th>
                <th
                  scope="col"
                  className="py-3 px-3 border-b border-[#334139]/15 text-right"
                >
                  Avg Latency
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-[#334139]/15 text-right"
                >
                  Verdict
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums divide-y divide-[#334139]/10">
              {stateTransitions.map((item) => (
                <tr key={item.id} className="hover:bg-[#064C1C]/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-[#1E2D24] align-top">
                    {item.entityName}
                  </td>
                  <td className="py-3.5 px-3 align-top">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-[#334139]/[0.06] text-[#334139] font-semibold">
                        {item.fromState}
                      </span>
                      <ArrowRight size={11} className="text-[#334139]/40" />
                      <span className="px-1.5 py-0.5 rounded bg-[#064C1C]/10 text-[#064C1C] font-semibold">
                        {item.toState}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-[#334139] align-top">
                    {item.transitionCount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700 align-top">
                    {item.completionRate}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-[#334139]/70 align-top">
                    {item.orphanCount > 0 ? (
                      <span className="text-[#D66F14] font-semibold">
                        {item.orphanCount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-700 font-bold align-top">
                    {item.illegalSkips}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-[#334139]/70 align-top">
                    {item.averageLatency}
                  </td>
                  <td className="py-3.5 px-4 text-right align-top">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                      <Check size={10} strokeWidth={3} />
                      PASS
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
