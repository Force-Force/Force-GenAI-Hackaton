import { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Table as TableIcon,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { AI_PROPOSED_INSIGHTS } from '../data/mockInsightData';
import { DynamicInsightCard } from './DynamicInsightCard';
import { ReconciliationTable } from '../../validation/components/ReconciliationTable';
import { OperationsAuditView } from '../../validation/components/OperationsAuditView';
import {
  INITIAL_FINANCIAL_RECONCILIATION,
  INITIAL_ROW_CONSERVATION,
  INITIAL_STATE_TRANSITIONS,
} from '../../validation/data/mockAuditData';

export function DynamicDashboardView() {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<'ai-dashboard' | 'table-ledger'>('ai-dashboard');

  const filteredInsights = useMemo(() => {
    return AI_PROPOSED_INSIGHTS.filter((item) => {
      if (selectedDomain !== 'all' && item.domain !== selectedDomain) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          item.kpiName.toLowerCase().includes(query) ||
          item.categoryLabel.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [selectedDomain, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Executive Summary Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#334139]/12 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-[#334139]/60">Net Realized Revenue</span>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#1E2D24]">$1.15M</div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#064C1C]">
            <TrendingUp size={12} />
            <span>+9.1% MoM ($91.7K leakage)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#334139]/12 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-[#334139]/60">Enterprise Retention</span>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#1E2D24]">118.2%</div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#064C1C]">
            <ArrowUpRight size={12} />
            <span>Day 90 expansion tier</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#334139]/12 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-[#334139]/60">Pipeline Throughput</span>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#1E2D24]">420,000</div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#064C1C]">
            <span>99.85% completed (18m peak dwell)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#334139]/12 shadow-2xs space-y-1">
          <span className="text-xs font-medium text-[#334139]/60">Active Outliers</span>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#D66F14]">1 Detected</div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D66F14]">
            <ShieldAlert size={12} />
            <span>+$27.7K surge on Oct 18 (+142%)</span>
          </div>
        </div>
      </div>

      {/* 2. Controls Toolbar: Search, Domain Filter Pills, and View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl md:rounded-3xl bg-white border border-[#334139]/15 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334139]/45"
            />
            <input
              type="text"
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3.5 py-1.5 rounded-full text-xs sm:text-sm bg-[#FDFFFC] border border-[#334139]/20 text-[#334139] placeholder-[#334139]/40 focus:outline-none focus:border-[#064C1C] w-48 sm:w-60"
            />
          </div>

          {/* Domain Filter Pills */}
          <div className="flex items-center gap-1 bg-[#334139]/[0.05] p-0.5 rounded-full text-xs font-medium">
            <button
              type="button"
              onClick={() => setSelectedDomain('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-full transition-colors cursor-pointer',
                selectedDomain === 'all'
                  ? 'bg-white text-[#1E2D24] shadow-2xs font-bold'
                  : 'text-[#334139]/60 hover:text-[#334139]',
              )}
            >
              All ({AI_PROPOSED_INSIGHTS.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDomain('sales')}
              className={cn(
                'px-3.5 py-1.5 rounded-full transition-colors cursor-pointer',
                selectedDomain === 'sales'
                  ? 'bg-white text-[#064C1C] shadow-2xs font-bold'
                  : 'text-[#334139]/60 hover:text-[#064C1C]',
              )}
            >
              Sales
            </button>
            <button
              type="button"
              onClick={() => setSelectedDomain('customers')}
              className={cn(
                'px-3.5 py-1.5 rounded-full transition-colors cursor-pointer',
                selectedDomain === 'customers'
                  ? 'bg-white text-[#064C1C] shadow-2xs font-bold'
                  : 'text-[#334139]/60 hover:text-[#064C1C]',
              )}
            >
              Cohorts & LTV
            </button>
            <button
              type="button"
              onClick={() => setSelectedDomain('operations')}
              className={cn(
                'px-3.5 py-1.5 rounded-full transition-colors cursor-pointer',
                selectedDomain === 'operations'
                  ? 'bg-white text-[#064C1C] shadow-2xs font-bold'
                  : 'text-[#334139]/60 hover:text-[#064C1C]',
              )}
            >
              Operations
            </button>
            <button
              type="button"
              onClick={() => setSelectedDomain('anomalies')}
              className={cn(
                'px-3.5 py-1.5 rounded-full transition-colors cursor-pointer',
                selectedDomain === 'anomalies'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold'
                  : 'text-[#334139]/60 hover:text-rose-700',
              )}
            >
              Anomalies (±2σ)
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#334139]/[0.05] p-0.5 rounded-full text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setDisplayMode('ai-dashboard')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer select-none',
              displayMode === 'ai-dashboard'
                ? 'bg-[#064C1C] text-[#FDFFFC] shadow-2xs'
                : 'text-[#334139]/65 hover:text-[#334139]',
            )}
          >
            <Sparkles size={13} />
            <span>AI Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('table-ledger')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer select-none',
              displayMode === 'table-ledger'
                ? 'bg-[#064C1C] text-[#FDFFFC] shadow-2xs'
                : 'text-[#334139]/65 hover:text-[#334139]',
            )}
          >
            <TableIcon size={13} />
            <span>Table Ledger</span>
          </button>
        </div>
      </div>

      {/* 3. Main Content: Enhanced 2-Column Responsive Card Grid */}
      {displayMode === 'ai-dashboard' ? (
        filteredInsights.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6 items-start">
            {filteredInsights.map((insight) => (
              <DynamicInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-white border border-[#334139]/15 space-y-2">
            <p className="text-base font-bold text-[#1E2D24]">No matching insights found</p>
            <p className="text-sm text-[#334139]/60">
              Try selecting a different domain filter or clearing your search term.
            </p>
          </div>
        )
      ) : (
        /* Underlying Ledger / Table Inspection Mode */
        <div className="space-y-8 animate-fadeIn">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1E2D24]">
              Underlying Financial Reconciliation Ledger
            </h3>
            <ReconciliationTable items={INITIAL_FINANCIAL_RECONCILIATION} />
          </div>

          <div className="space-y-2 pt-4 border-t border-[#334139]/12">
            <h3 className="text-base font-bold text-[#1E2D24]">
              Operations Conservation & State Transitions
            </h3>
            <OperationsAuditView
              conservationStages={INITIAL_ROW_CONSERVATION}
              stateTransitions={INITIAL_STATE_TRANSITIONS}
            />
          </div>
        </div>
      )}
    </div>
  );
}
