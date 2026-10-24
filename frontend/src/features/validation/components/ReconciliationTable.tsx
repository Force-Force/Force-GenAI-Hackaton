import { useState } from "react";
import {
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Scale,
  RefreshCw,
  Search,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import type { FinancialReconciliationItem } from "../types";

interface ReconciliationTableProps {
  items: FinancialReconciliationItem[];
  onToggleSimulatedVariance?: () => void;
  isSimulating?: boolean;
}

export function ReconciliationTable({
  items,
  onToggleSimulatedVariance,
  isSimulating = false,
}: ReconciliationTableProps) {
  const [filter, setFilter] = useState<"all" | "reconciled" | "variance">(
    "all",
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter((item) => {
    if (filter === "reconciled" && item.status !== "RECONCILED") return false;
    if (filter === "variance" && item.status !== "VARIANCE_DETECTED")
      return false;
    if (
      searchQuery &&
      !item.kpiName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.category.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const reconciledCount = items.filter((i) => i.status === "RECONCILED").length;
  const varianceCount = items.filter(
    (i) => i.status === "VARIANCE_DETECTED",
  ).length;

  const handleCopySql = async (id: string, sql: string) => {
    await navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Table Controls & Summary Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#334139]/15 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#334139]/50"
            />
            <input
              type="text"
              placeholder="Search audited KPIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-full text-xs sm:text-sm bg-[#FDFFFC] border border-[#334139]/20 text-[#334139] placeholder-[#334139]/40 focus:outline-none focus:border-[#064C1C] w-48 sm:w-60"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#334139]/[0.05] p-0.5 rounded-full text-xs sm:text-sm font-medium">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-full transition-colors cursor-pointer",
                filter === "all"
                  ? "bg-white text-[#1E2D24] shadow-2xs font-bold"
                  : "text-[#334139]/60 hover:text-[#334139]",
              )}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("reconciled")}
              className={cn(
                "px-3 py-1.5 rounded-full transition-colors cursor-pointer inline-flex items-center gap-1.5",
                filter === "reconciled"
                  ? "bg-white text-[#064C1C] shadow-2xs font-bold"
                  : "text-[#334139]/60 hover:text-[#064C1C]",
              )}
            >
              <Check size={13} strokeWidth={2.5} className="text-[#064C1C]" />
              <span>Reconciled ({reconciledCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("variance")}
              className={cn(
                "px-3 py-1.5 rounded-full transition-colors cursor-pointer inline-flex items-center gap-1.5",
                filter === "variance"
                  ? "bg-white text-rose-700 shadow-2xs font-bold"
                  : "text-[#334139]/60 hover:text-rose-700",
              )}
            >
              <AlertTriangle size={13} className="text-rose-600" />
              <span>Variances ({varianceCount})</span>
            </button>
          </div>
        </div>

        {/* Interactive Demo Simulation Button */}
        {onToggleSimulatedVariance && (
          <button
            type="button"
            onClick={onToggleSimulatedVariance}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-[#334139]/20 text-[#334139] hover:bg-[#334139]/5 transition-colors cursor-pointer shrink-0"
            title="Toggle simulated ledger variance to test independent audit detection"
          >
            <RefreshCw
              size={13}
              className={cn(isSimulating && "animate-spin text-[#064C1C]")}
            />
            <span>
              {varianceCount > 0
                ? "Resolve All Variances"
                : "Inject Ledger Variance"}
            </span>
          </button>
        )}
      </div>

      {/* Main Financial Reconciliation Table */}
      <div className="overflow-x-auto no-scrollbar w-full rounded-2xl border border-[#334139]/15 bg-white shadow-2xs">
        <table className="w-full text-left border-separate border-spacing-0 text-xs sm:text-sm">
          <thead className="bg-[#FDFFFC] text-[#334139]/70 font-mono text-xs uppercase tracking-wider">
            <tr>
              <th
                scope="col"
                className="py-3 px-4 border-b border-[#334139]/15 sticky left-0 z-20 bg-[#FDFFFC]"
              >
                KPI Metric & Formula
              </th>
              <th
                scope="col"
                className="py-3 px-4 border-b border-[#334139]/15"
              >
                Source Ledger Totals
              </th>
              <th
                scope="col"
                className="py-3 px-4 border-b border-[#334139]/15"
              >
                Warehouse Totals
              </th>
              <th
                scope="col"
                className="py-3 px-4 border-b border-[#334139]/15"
              >
                Mart KPI Totals
              </th>
              <th
                scope="col"
                className="py-3 px-4 border-b border-[#334139]/15"
              >
                Variance (Δ)
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
            {filteredItems.map((item) => {
              const isZero = item.variance === 0;
              const isExpanded = expandedId === item.id;

              return (
                <tr
                  key={item.id}
                  className={cn(
                    "transition-colors",
                    isZero
                      ? "hover:bg-[#064C1C]/[0.02]"
                      : "bg-rose-50/40 hover:bg-rose-50/70",
                  )}
                >
                  {/* KPI Name & Category */}
                  <th
                    scope="row"
                    className="py-3.5 px-4 font-semibold text-[#1E2D24] align-top sticky left-0 z-10 bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : item.id)
                        }
                        className="text-[#334139]/50 hover:text-[#334139] cursor-pointer p-0.5 rounded"
                        title={
                          isExpanded
                            ? "Collapse assertions"
                            : "Expand assertions"
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1E2D24]">
                            {item.kpiName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#334139]/[0.06] text-[#334139]/70 font-semibold">
                            {item.category}
                          </span>
                        </div>
                        <div className="font-mono text-xs font-normal text-[#334139]/60 mt-0.5">
                          {item.formula}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Assertion Box */}
                    {isExpanded && (
                      <div className="mt-2.5 p-3.5 rounded-xl bg-[#FDFFFC] border border-[#334139]/15 text-xs font-normal text-[#334139] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[#064C1C] flex items-center gap-1.5">
                            <Scale size={13} />
                            Auditor SQL Assertion
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopySql(item.id, item.assertionSql)
                            }
                            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#334139]/60 hover:text-[#064C1C] cursor-pointer"
                          >
                            {copiedId === item.id ? (
                              <Check size={12} className="text-[#064C1C]" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>
                              {copiedId === item.id ? "Copied" : "Copy SQL"}
                            </span>
                          </button>
                        </div>
                        <pre className="p-2.5 rounded-lg bg-[#334139]/[0.05] font-mono text-xs leading-relaxed overflow-x-auto no-scrollbar">
                          {item.assertionSql}
                        </pre>
                        <div className="flex items-center justify-between text-xs text-[#334139]/55 font-mono">
                          <span>SLA Tolerance: {item.tolerance}</span>
                          <span>Timestamp: {item.lastAuditedAt}</span>
                        </div>
                      </div>
                    )}
                  </th>

                  {/* 1. Source Ledger Totals */}
                  <td className="py-3.5 px-4 font-mono text-[#334139] align-top">
                    <div className="font-bold text-sm">
                      {item.sourceLedger.formatted}
                    </div>
                    <div className="text-xs text-[#334139]/55 mt-0.5">
                      {item.sourceLedger.system}
                    </div>
                  </td>

                  {/* 2. Warehouse Totals */}
                  <td className="py-3.5 px-4 font-mono text-[#334139] align-top">
                    <div className="font-bold text-sm">
                      {item.warehouse.formatted}
                    </div>
                    <div className="text-xs text-[#334139]/55 mt-0.5">
                      {item.warehouse.layer}
                    </div>
                  </td>

                  {/* 3. Mart KPI Totals */}
                  <td className="py-3.5 px-4 font-mono text-[#334139] align-top">
                    <div className="font-bold text-sm">
                      {item.martKpi.formatted}
                    </div>
                    <div className="text-xs text-[#334139]/55 mt-0.5">
                      {item.martKpi.target}
                    </div>
                  </td>

                  {/* 4. Variance (Δ) - Emerald (0.00) or Rose (!= 0.00) */}
                  <td className="py-3.5 px-4 align-top">
                    <div
                      className={cn(
                        "inline-flex flex-col items-start px-2.5 py-1 rounded-lg border font-mono text-xs sm:text-sm font-bold",
                        isZero
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-300 shadow-2xs",
                      )}
                    >
                      <span>{item.varianceFormatted}</span>
                      <span className="text-[10px] font-normal opacity-80">
                        {isZero ? "Zero Variance" : "Discrepancy"}
                      </span>
                    </div>
                  </td>

                  {/* 5. Audit Verdict */}
                  <td className="py-3.5 px-4 text-right align-top">
                    {isZero ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 font-mono text-xs font-bold">
                        <Check size={12} strokeWidth={3} />
                        PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-mono text-xs font-bold">
                        <AlertTriangle size={12} />
                        FLAGGED
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
