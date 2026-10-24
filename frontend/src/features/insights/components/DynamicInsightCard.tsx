import { TrendingUp, TrendingDown } from 'lucide-react';
import type { AiInsightModel } from '../types';
import { WaterfallGraph } from './WaterfallGraph';
import { CohortDecayGraph } from './CohortDecayGraph';
import { StateFlowFunnelGraph } from './StateFlowFunnelGraph';
import { AnomalyRibbonGraph } from './AnomalyRibbonGraph';

interface DynamicInsightCardProps {
  insight: AiInsightModel;
}

export function DynamicInsightCard({ insight }: DynamicInsightCardProps) {
  const metrics = insight.headlineMetrics.slice(0, 3);

  return (
    <article className="rounded-2xl bg-white border border-[#334139]/15 shadow-2xs overflow-hidden">
      <header className="px-6 pt-5 pb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#064C1C]">
          {insight.categoryLabel}
        </p>
        <h3 className="mt-1 text-xl font-semibold text-[#1E2D24] leading-snug">{insight.title}</h3>
        <p className="mt-1 text-base text-[#334139]/80">{insight.summary}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 p-6 pt-4">
        <div className="min-w-0">
          {insight.selectedGraphType === 'waterfall-decomposition' && insight.waterfallData && (
            <WaterfallGraph data={insight.waterfallData} />
          )}
          {insight.selectedGraphType === 'cohort-decay-curve' && insight.cohortData && (
            <CohortDecayGraph data={insight.cohortData} />
          )}
          {insight.selectedGraphType === 'state-flow-funnel' && insight.stateFlowData && (
            <StateFlowFunnelGraph stages={insight.stateFlowData} />
          )}
          {insight.selectedGraphType === 'anomaly-ribbon' && insight.anomalyData && (
            <AnomalyRibbonGraph data={insight.anomalyData} />
          )}
        </div>

        <aside className="space-y-5 lg:border-l lg:border-[#334139]/10 lg:pl-6">
          <dl className="space-y-3">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-[#334139]/70">{m.label}</dt>
                <dd className="text-right">
                  <span className="text-lg font-semibold tabular-nums text-[#1E2D24]">{m.value}</span>
                  <span
                    className={`ml-2 inline-flex items-center gap-0.5 text-sm font-medium ${
                      m.trend === 'down' ? 'text-[#D66F14]' : 'text-[#064C1C]'
                    }`}
                  >
                    {m.trend === 'up' && <TrendingUp size={13} />}
                    {m.trend === 'down' && <TrendingDown size={13} />}
                    {m.delta}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <ul className="space-y-2.5 pt-4 border-t border-[#334139]/10">
            {insight.actionableInsights.map((d) => (
              <li key={d} className="flex items-start gap-2.5 text-base text-[#334139] leading-snug">
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
