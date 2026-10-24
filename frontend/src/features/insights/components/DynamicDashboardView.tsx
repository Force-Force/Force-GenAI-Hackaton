import { useState, useMemo } from 'react';
import { cn } from '../../../utils/cn';
import { AI_PROPOSED_INSIGHTS } from '../data/mockInsightData';
import { DynamicInsightCard } from './DynamicInsightCard';

const DOMAINS = [
  { id: 'all', label: 'All' },
  { id: 'sales', label: 'Sales' },
  { id: 'customers', label: 'Customers' },
  { id: 'operations', label: 'Operations' },
  { id: 'anomalies', label: 'Anomalies' },
] as const;

const SUMMARY = [
  { label: 'Net revenue', value: '$1.15M', delta: '+9.1%' },
  { label: 'Enterprise retention', value: '118%', delta: '+4.5%' },
  { label: 'Orders processed', value: '420K', delta: '99.85% delivered' },
  { label: 'Outliers', value: '1', delta: 'Oct 18' },
];

export function DynamicDashboardView() {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  const insights = useMemo(
    () =>
      AI_PROPOSED_INSIGHTS.filter((i) => selectedDomain === 'all' || i.domain === selectedDomain),
    [selectedDomain],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-[#334139]/15 px-5 py-4">
            <div className="text-sm text-[#334139]/70">{s.label}</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums text-[#1E2D24]">{s.value}</div>
            <div className="mt-0.5 text-sm text-[#334139]/70">{s.delta}</div>
          </div>
        ))}
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-[#334139]/15" aria-label="Insight categories">
        {DOMAINS.map((d) => {
          const active = selectedDomain === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDomain(d.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'px-4 py-2.5 text-base font-medium -mb-px border-b-2 transition-colors cursor-pointer',
                active
                  ? 'border-[#064C1C] text-[#064C1C]'
                  : 'border-transparent text-[#334139]/70 hover:text-[#1E2D24]',
              )}
            >
              {d.label}
            </button>
          );
        })}
      </nav>

      <div className="space-y-6">
        {insights.map((insight) => (
          <DynamicInsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
