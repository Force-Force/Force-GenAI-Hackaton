import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Database,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import type { AiInsightModel } from "../types";
import { WaterfallGraph } from "./WaterfallGraph";
import { CohortDecayGraph } from "./CohortDecayGraph";
import { StateFlowFunnelGraph } from "./StateFlowFunnelGraph";
import { AnomalyRibbonGraph } from "./AnomalyRibbonGraph";
import { PieDistributionGraph } from "./PieDistributionGraph";
import { CategoricalBarGraph } from "./CategoricalBarGraph";
import { TrendLineGraph } from "./TrendLineGraph";
import { KpiBreakdownTable } from "./KpiBreakdownTable";

interface DynamicInsightCardProps {
  insight: AiInsightModel;
}

export function DynamicInsightCard({ insight }: DynamicInsightCardProps) {
  const [showProvenance, setShowProvenance] = useState(false);
  const metrics = insight.headlineMetrics?.slice(0, 3) || [];

  return (
    <article className="rounded-2xl bg-white border border-[#334139]/15 shadow-2xs overflow-hidden">
      <header className="px-6 pt-5 pb-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#064C1C]">
            {insight.categoryLabel}
          </p>
          {insight.aiConfidenceScore && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#064C1C]/10 text-[#064C1C]">
              <Sparkles size={11} className="text-[#D66F14]" />
              {insight.aiConfidenceScore.toFixed(1)}% AI Confidence
            </span>
          )}
        </div>
        <h3 className="mt-1 text-xl font-semibold text-[#1E2D24] leading-snug">
          {insight.title}
        </h3>
        <p className="mt-1 text-base text-[#334139]/80">{insight.summary}</p>
        {insight.aiReasoning && (
          <p className="mt-1 text-xs text-[#334139]/60 italic font-sans leading-relaxed">
            AI Rationale: {insight.aiReasoning}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 p-6 pt-4">
        <div className="min-w-0 space-y-4">
          {/* Chart Rendering */}
          {insight.selectedGraphType === "waterfall-decomposition" &&
            insight.waterfallData && (
              <WaterfallGraph data={insight.waterfallData} />
            )}
          {insight.selectedGraphType === "cohort-decay-curve" &&
            insight.cohortData && (
              <CohortDecayGraph data={insight.cohortData} />
            )}
          {insight.selectedGraphType === "state-flow-funnel" &&
            insight.stateFlowData && (
              <StateFlowFunnelGraph stages={insight.stateFlowData} />
            )}
          {insight.selectedGraphType === "anomaly-ribbon" &&
            insight.anomalyData && (
              <AnomalyRibbonGraph data={insight.anomalyData} />
            )}
          {insight.selectedGraphType === "pie" && insight.pieData && (
            <PieDistributionGraph data={insight.pieData} />
          )}
          {insight.selectedGraphType === "bar" && insight.barData && (
            <CategoricalBarGraph data={insight.barData} />
          )}
          {insight.selectedGraphType === "line" && insight.lineData && (
            <TrendLineGraph data={insight.lineData} />
          )}
          {insight.selectedGraphType === "kpi-table" && insight.tableData && (
            <KpiBreakdownTable
              columns={insight.tableData.columns}
              rows={insight.tableData.rows}
            />
          )}

          {/* SQL Provenance Drawer */}
          {insight.provenance && (
            <div className="pt-2 border-t border-[#334139]/10">
              <button
                type="button"
                onClick={() => setShowProvenance(!showProvenance)}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#064C1C] hover:underline cursor-pointer"
              >
                <Database size={12} />
                <span>
                  {showProvenance
                    ? "Hide Source SQL & Tables"
                    : "View Source SQL & Provenance"}
                </span>
                {showProvenance ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>

              {showProvenance && (
                <div className="mt-2 p-3 rounded-xl bg-[#334139]/[0.04] border border-[#334139]/15 space-y-1.5 text-xs animate-fadeIn">
                  {insight.provenance.sourceTables?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="font-bold text-[#334139]/70">
                        Source Tables:
                      </span>
                      {insight.provenance.sourceTables.map((tbl) => (
                        <code
                          key={tbl}
                          className="px-1.5 py-0.5 rounded bg-[#334139]/10 font-mono text-[10.5px]"
                        >
                          {tbl}
                        </code>
                      ))}
                    </div>
                  )}
                  {insight.provenance.executedSql && (
                    <pre className="p-2 rounded-lg bg-black/85 text-[#FDFFFC] font-mono text-[10.5px] overflow-x-auto custom-scrollbar">
                      {insight.provenance.executedSql}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5 lg:border-l lg:border-[#334139]/10 lg:pl-6">
          <dl className="space-y-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-sm text-[#334139]/70">{m.label}</dt>
                <dd className="text-right">
                  <span className="text-lg font-semibold tabular-nums text-[#1E2D24]">
                    {m.value}
                  </span>
                  <span
                    className={`ml-2 inline-flex items-center gap-0.5 text-sm font-medium ${
                      m.trend === "down" ? "text-[#D66F14]" : "text-[#064C1C]"
                    }`}
                  >
                    {m.trend === "up" && <TrendingUp size={13} />}
                    {m.trend === "down" && <TrendingDown size={13} />}
                    {m.delta}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <ul className="space-y-2.5 pt-4 border-t border-[#334139]/10">
            {insight.actionableInsights?.map((d) => (
              <li
                key={d}
                className="flex items-start gap-2.5 text-base text-[#334139] leading-snug"
              >
                <span className="mt-2 w-2 h-2 rounded-full bg-[#064C1C] shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </article>
  );
}
