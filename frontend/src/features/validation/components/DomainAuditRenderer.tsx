import { useState, useMemo } from "react";
import { cn } from "../../../utils/cn";
import { usePipelineStore } from "../../workspace/store/pipelineStore";
import type { AuditDataDomain, FinancialReconciliationItem } from "../types";
import {
  INITIAL_FINANCIAL_RECONCILIATION,
  INITIAL_ROW_CONSERVATION,
  INITIAL_STATE_TRANSITIONS,
} from "../data/mockAuditData";
import { ReconciliationTable } from "./ReconciliationTable";
import { OperationsAuditView } from "./OperationsAuditView";

interface DomainAuditRendererProps {
  onStatusChange?: (hasVariance: boolean) => void;
}

export function DomainAuditRenderer({
  onStatusChange,
}: DomainAuditRendererProps) {
  const nodes = usePipelineStore((s) => s.nodes);

  // Detect domain from pipeline schema nodes
  const detectedDomain: AuditDataDomain = useMemo(() => {
    const nodeNames = nodes
      .map((n) => `${n.data?.label || ""} ${n.data?.description || ""}`)
      .join(" ")
      .toLowerCase();

    if (
      nodeNames.includes("inventory") ||
      nodeNames.includes("shipment") ||
      nodeNames.includes("wms") ||
      nodeNames.includes("sku") ||
      nodeNames.includes("logistics")
    ) {
      return "operations";
    }
    return "finance";
  }, [nodes]);

  const [selectedDomain, setSelectedDomain] = useState<AuditDataDomain | null>(
    null,
  );
  const activeDomain = selectedDomain ?? detectedDomain;

  const [financialItems, setFinancialItems] = useState<
    FinancialReconciliationItem[]
  >(INITIAL_FINANCIAL_RECONCILIATION);
  const [isSimulating, setIsSimulating] = useState(false);

  const toggleSimulatedVariance = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setFinancialItems((prev) => {
        const hasVariance = prev.some((i) => i.status === "VARIANCE_DETECTED");
        if (hasVariance) {
          const resolved = prev.map((item) => ({
            ...item,
            warehouse: {
              ...item.warehouse,
              value: item.sourceLedger.value,
              formatted: item.sourceLedger.formatted,
            },
            martKpi: {
              ...item.martKpi,
              value: item.sourceLedger.value,
              formatted: item.sourceLedger.formatted,
            },
            variance: 0.0,
            varianceFormatted: "$0.00 (0.00%)",
            status: "RECONCILED" as const,
          }));
          onStatusChange?.(false);
          return resolved;
        } else {
          const withVariance = prev.map((item) => {
            if (item.id === "kpi-fin-05") {
              return {
                ...item,
                martKpi: {
                  ...item.martKpi,
                  value: 14350.0,
                  formatted: "$14,350.00",
                },
                variance: 150.0,
                varianceFormatted: "+$150.00 (+1.05%)",
                status: "VARIANCE_DETECTED" as const,
              };
            }
            return item;
          });
          onStatusChange?.(true);
          return withVariance;
        }
      });
      setIsSimulating(false);
    }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Section Header & Domain Switcher (Matching PlanProposalPage style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#334139]/12">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#334139]">
            Audit Findings
          </span>
          <span className="text-[11px] text-[#334139]/50 font-mono">
            {activeDomain === "finance"
              ? "Reconciliation Table"
              : "Row Conservation & Transitions"}
          </span>
        </div>

        {/* Domain Format Switcher Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDomain("finance")}
            className={cn(
              "inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all cursor-pointer select-none",
              activeDomain === "finance"
                ? "bg-[#064C1C] text-[#FDFFFC] border-[#064C1C] shadow-2xs"
                : "bg-white text-[#334139] border-[#334139]/25 hover:border-[#334139]/60",
            )}
          >
            <span>Finance / Accounting</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDomain("operations")}
            className={cn(
              "inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all cursor-pointer select-none",
              activeDomain === "operations"
                ? "bg-[#064C1C] text-[#FDFFFC] border-[#064C1C] shadow-2xs"
                : "bg-white text-[#334139] border-[#334139]/25 hover:border-[#334139]/60",
            )}
          >
            <span>Operations / Inventory</span>
          </button>
        </div>
      </div>

      {/* Render Domain-Specific Audit Component */}
      {activeDomain === "finance" ? (
        <ReconciliationTable
          items={financialItems}
          onToggleSimulatedVariance={toggleSimulatedVariance}
          isSimulating={isSimulating}
        />
      ) : (
        <OperationsAuditView
          conservationStages={INITIAL_ROW_CONSERVATION}
          stateTransitions={INITIAL_STATE_TRANSITIONS}
        />
      )}
    </div>
  );
}
