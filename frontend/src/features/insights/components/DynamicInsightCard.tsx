import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { AiInsightModel, DynamicGraphType } from '../types';
import { WaterfallGraph } from './WaterfallGraph';
import { CohortDecayGraph } from './CohortDecayGraph';
import { StateFlowFunnelGraph } from './StateFlowFunnelGraph';
import { AnomalyRibbonGraph } from './AnomalyRibbonGraph';

interface DynamicInsightCardProps {
  insight: AiInsightModel;
}

export function DynamicInsightCard({ insight }: DynamicInsightCardProps) {
  const [activeGraphType, setActiveGraphType] = useState<DynamicGraphType>(
    insight.selectedGraphType,
  );

  return (
    <article className="p-5 sm:p-6 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-sm space-y-5 transition-all hover:border-[#064C1C]/35 flex flex-col justify-between">
      {/* 1. Header: Domain Pill, KPI, Title, and Adaptive Graph Selector */}
      <div className="space-y-3 border-b border-[#334139]/10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#064C1C]/10 text-[#064C1C] uppercase tracking-wider">
              {insight.categoryLabel}
            </span>
            <span className="font-mono text-xs text-[#334139]/55">
              KPI: {insight.kpiName}
            </span>
          </div>

          {/* Graph Type Switcher Pills */}
          <div className="flex items-center gap-1 bg-[#334139]/[0.05] p-0.5 rounded-full text-xs font-medium">
            {insight.availableGraphOptions.map((opt) => {
              const isActive = activeGraphType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setActiveGraphType(opt.type)}
                  className={cn(
                    'px-3 py-1 rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 select-none',
                    isActive
                      ? 'bg-white text-[#1E2D24] shadow-2xs font-bold'
                      : 'text-[#334139]/60 hover:text-[#334139]',
                  )}
                  title={opt.reasoning}
                >
                  {opt.isAiRecommended && (
                    <span className="text-[10px] font-bold text-[#064C1C]">AI</span>
                  )}
                  <span>{opt.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <h3 className="text-lg md:text-xl font-bold text-[#1E2D24] leading-snug">
          {insight.title}
        </h3>

        {/* High-Impact 1-Sentence Summary */}
        <p className="text-sm text-[#334139]/85 leading-relaxed font-medium">
          {insight.summary}
        </p>
      </div>

      {/* 2. Dynamic Non-Standard Graph Rendering */}
      <div className="pt-1 pb-1">
        {activeGraphType === 'waterfall-decomposition' && insight.waterfallData && (
          <WaterfallGraph data={insight.waterfallData} />
        )}

        {activeGraphType === 'cohort-decay-curve' && insight.cohortData && (
          <CohortDecayGraph data={insight.cohortData} />
        )}

        {activeGraphType === 'state-flow-funnel' && insight.stateFlowData && (
          <StateFlowFunnelGraph stages={insight.stateFlowData} />
        )}

        {activeGraphType === 'anomaly-ribbon' && insight.anomalyData && (
          <AnomalyRibbonGraph data={insight.anomalyData} />
        )}
      </div>

      {/* 3. Headline Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {insight.headlineMetrics.map((metric) => (
          <div
            key={metric.label}
            className="p-3 rounded-xl bg-[#334139]/[0.03] border border-[#334139]/10 space-y-0.5"
          >
            <span className="text-[11px] font-medium text-[#334139]/60">
              {metric.label}
            </span>
            <div className="text-base sm:text-lg font-mono font-bold text-[#1E2D24]">
              {metric.value}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              {metric.trend === 'up' && <TrendingUp size={11} className="text-[#064C1C]" />}
              {metric.trend === 'down' && <TrendingDown size={11} className="text-[#D66F14]" />}
              <span className={metric.trend === 'up' ? 'text-[#064C1C]' : 'text-[#D66F14]'}>
                {metric.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Actionable Key Drivers with MD-sized bullets */}
      <div className="pt-3 border-t border-[#334139]/10 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#334139]/60 font-mono flex items-center gap-1.5">
          <Layers size={13} className="text-[#064C1C]" />
          Key Drivers
        </h4>
        <ul className="space-y-1.5">
          {insight.actionableInsights.map((driver) => (
            <li
              key={driver}
              className="flex items-start gap-2.5 text-xs sm:text-sm text-[#334139]/80 leading-relaxed"
            >
              <span className="w-2 h-2 rounded-full bg-[#064C1C] shrink-0 mt-1.5" />
              <span>{driver}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
