import {
  Filter,
  Calendar,
  Hash,
  Sparkles,
  Table as TableIcon,
  Search,
  Palette,
  Maximize2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface TableauShelvesBarProps {
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  displayMode: 'ai-dashboard' | 'table-ledger';
  onDisplayModeChange: (mode: 'ai-dashboard' | 'table-ledger') => void;
  totalInsightsCount: number;
}

export function TableauShelvesBar({
  selectedDomain,
  onSelectDomain,
  searchQuery,
  onSearchChange,
  displayMode,
  onDisplayModeChange,
  totalInsightsCount,
}: TableauShelvesBarProps) {
  return (
    <div className="w-full bg-[#F1F5F9] border-b border-[#334139]/15 select-none text-xs">
      {/* Top Shelves Row: Filters + Columns + Rows */}
      <div className="p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#334139]/10">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Columns Shelf */}
          <div className="flex items-center gap-1.5 bg-white border border-[#334139]/15 rounded px-2 py-1 shadow-2xs">
            <span className="font-mono text-[11px] font-bold text-[#334139]/60 uppercase">
              Columns:
            </span>
            <div className="inline-flex items-center gap-1 bg-[#2B5B84]/15 hover:bg-[#2B5B84]/25 border border-[#2B5B84]/35 text-[#2B5B84] px-2 py-0.5 rounded font-mono text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors">
              <Calendar size={11} />
              <span>MONTH(Order Date)</span>
              <ChevronDown size={10} className="text-[#2B5B84]/70" />
            </div>
          </div>

          {/* Rows Shelf */}
          <div className="flex items-center gap-1.5 bg-white border border-[#334139]/15 rounded px-2 py-1 shadow-2xs">
            <span className="font-mono text-[11px] font-bold text-[#334139]/60 uppercase">
              Rows:
            </span>
            <div className="inline-flex items-center gap-1 bg-[#064C1C]/15 hover:bg-[#064C1C]/25 border border-[#064C1C]/35 text-[#064C1C] px-2 py-0.5 rounded font-mono text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors">
              <Hash size={11} />
              <span>SUM(Net Realized Revenue)</span>
              <ChevronDown size={10} className="text-[#064C1C]/70" />
            </div>
          </div>

          {/* Filters Shelf with active filter pill */}
          <div className="flex items-center gap-1.5 bg-white border border-[#334139]/15 rounded px-2 py-1 shadow-2xs hidden md:flex">
            <span className="font-mono text-[11px] font-bold text-[#334139]/60 uppercase flex items-center gap-1">
              <Filter size={11} />
              Filters:
            </span>
            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono text-[11px] font-semibold">
              <span>Domain: {selectedDomain.toUpperCase()}</span>
              <ChevronDown size={10} className="text-amber-700" />
            </div>
          </div>
        </div>

        {/* Tableau Mode Switcher (AI Dashboard vs Table Ledger) */}
        <div className="flex items-center gap-1 bg-white border border-[#334139]/15 p-0.5 rounded shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => onDisplayModeChange('ai-dashboard')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer text-xs font-semibold select-none',
              displayMode === 'ai-dashboard'
                ? 'bg-[#064C1C] text-white shadow-2xs'
                : 'text-[#334139]/70 hover:text-[#334139]',
            )}
          >
            <Sparkles size={12} />
            <span>AI Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => onDisplayModeChange('table-ledger')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer text-xs font-semibold select-none',
              displayMode === 'table-ledger'
                ? 'bg-[#064C1C] text-white shadow-2xs'
                : 'text-[#334139]/70 hover:text-[#334139]',
            )}
          >
            <TableIcon size={12} />
            <span>Table Ledger</span>
          </button>
        </div>
      </div>

      {/* Bottom Controls Strip: Domain Filter Tabs & Search */}
      <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 bg-white">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#334139]/50 uppercase font-bold mr-1 hidden sm:inline">
            Worksheet Scope:
          </span>
          <button
            type="button"
            onClick={() => onSelectDomain('all')}
            className={cn(
              'px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium border',
              selectedDomain === 'all'
                ? 'bg-[#1E2D24] text-white border-[#1E2D24] font-bold shadow-2xs'
                : 'bg-[#F8FAFC] text-[#334139]/70 border-[#334139]/15 hover:bg-[#334139]/10 hover:text-[#334139]',
            )}
          >
            All ({totalInsightsCount})
          </button>
          <button
            type="button"
            onClick={() => onSelectDomain('sales')}
            className={cn(
              'px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium border',
              selectedDomain === 'sales'
                ? 'bg-[#064C1C] text-white border-[#064C1C] font-bold shadow-2xs'
                : 'bg-[#F8FAFC] text-[#334139]/70 border-[#334139]/15 hover:bg-emerald-50 hover:text-[#064C1C] hover:border-emerald-200',
            )}
          >
            Sales
          </button>
          <button
            type="button"
            onClick={() => onSelectDomain('customers')}
            className={cn(
              'px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium border',
              selectedDomain === 'customers'
                ? 'bg-[#064C1C] text-white border-[#064C1C] font-bold shadow-2xs'
                : 'bg-[#F8FAFC] text-[#334139]/70 border-[#334139]/15 hover:bg-emerald-50 hover:text-[#064C1C] hover:border-emerald-200',
            )}
          >
            Cohorts & LTV
          </button>
          <button
            type="button"
            onClick={() => onSelectDomain('operations')}
            className={cn(
              'px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium border',
              selectedDomain === 'operations'
                ? 'bg-[#064C1C] text-white border-[#064C1C] font-bold shadow-2xs'
                : 'bg-[#F8FAFC] text-[#334139]/70 border-[#334139]/15 hover:bg-emerald-50 hover:text-[#064C1C] hover:border-emerald-200',
            )}
          >
            Operations
          </button>
          <button
            type="button"
            onClick={() => onSelectDomain('anomalies')}
            className={cn(
              'px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium border',
              selectedDomain === 'anomalies'
                ? 'bg-rose-700 text-white border-rose-700 font-bold shadow-2xs'
                : 'bg-[#F8FAFC] text-[#334139]/70 border-[#334139]/15 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200',
            )}
          >
            Anomalies (±2σ)
          </button>
        </div>

        {/* Filter / Search Input */}
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#334139]/40"
          />
          <input
            type="text"
            placeholder="Search insights..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-7 pr-2.5 py-1 rounded bg-[#FDFFFC] border border-[#334139]/20 text-[#334139] text-xs placeholder-[#334139]/40 focus:outline-none focus:border-[#064C1C] w-44 sm:w-56"
          />
        </div>
      </div>
    </div>
  );
}
