import { useState } from 'react';
import {
  Search,
  Database,
  Calendar,
  Type,
  Hash,
  Globe2,
  Tag,
  Sliders,
  LineChart,
  BoxSelect,
  Layers,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface TableauDataPaneProps {
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
  onClose?: () => void;
}

export function TableauDataPane({
  selectedDomain,
  onSelectDomain,
}: TableauDataPaneProps) {
  const [activeTab, setActiveTab] = useState<'data' | 'analytics'>('data');
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState({
    dimensions: true,
    measures: true,
    parameters: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const dimensions = [
    { name: 'Order Date', icon: Calendar, type: 'date', domain: 'sales' },
    { name: 'Customer Segment', icon: Type, type: 'string', domain: 'customers' },
    { name: 'Fulfillment Stage', icon: Type, type: 'string', domain: 'operations' },
    { name: 'Region / Geo', icon: Globe2, type: 'geo', domain: 'sales' },
    { name: 'Promo Campaign', icon: Tag, type: 'string', domain: 'sales' },
    { name: 'Anomaly Flag', icon: Activity, type: 'boolean', domain: 'anomalies' },
  ];

  const measures = [
    { name: 'Gross Billings', calc: 'SUM', domain: 'sales' },
    { name: 'Net Realized', calc: 'SUM', domain: 'sales' },
    { name: 'Margin Leakage', calc: 'SUM', domain: 'sales' },
    { name: 'Enterprise NRR %', calc: 'AVG', domain: 'customers' },
    { name: 'Processed Orders', calc: 'COUNT', domain: 'operations' },
    { name: 'Stage Dwell Mins', calc: 'AVG', domain: 'operations' },
    { name: 'Residual Drift (±2σ)', calc: 'DELTA', domain: 'anomalies' },
  ];

  const filteredDimensions = dimensions.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredMeasures = measures.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <aside className="w-60 lg:w-64 bg-white border-r border-[#334139]/15 flex flex-col shrink-0 select-none text-xs h-full">
      {/* 1. Tableau Tabs: Data vs Analytics */}
      <div className="flex border-b border-[#334139]/15 bg-[#F8FAFC]">
        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={cn(
            'flex-1 py-2 text-center font-bold tracking-tight border-b-2 transition-colors cursor-pointer',
            activeTab === 'data'
              ? 'border-[#064C1C] text-[#064C1C] bg-white'
              : 'border-transparent text-[#334139]/60 hover:text-[#334139]',
          )}
        >
          Data
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={cn(
            'flex-1 py-2 text-center font-bold tracking-tight border-b-2 transition-colors cursor-pointer',
            activeTab === 'analytics'
              ? 'border-[#064C1C] text-[#064C1C] bg-white'
              : 'border-transparent text-[#334139]/60 hover:text-[#334139]',
          )}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'data' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          {/* Active Data Source Pill */}
          <div className="p-2 rounded bg-[#334139]/[0.03] border border-[#334139]/10 space-y-1">
            <div className="flex items-center gap-1.5 text-[#334139]/70 font-medium text-[11px]">
              <Database size={11} className="text-[#064C1C]" />
              <span>Tableau Data Source</span>
            </div>
            <div className="font-mono text-xs font-bold text-[#1E2D24] truncate">
              retail_lakehouse_mart
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#334139]/40"
            />
            <input
              type="text"
              placeholder="Find field..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 rounded bg-[#FDFFFC] border border-[#334139]/20 text-[#334139] text-xs placeholder-[#334139]/40 focus:outline-none focus:border-[#064C1C]"
            />
          </div>

          {/* Dimensions Section (Tableau Blue Pills) */}
          <div className="space-y-1">
            <div
              onClick={() => toggleSection('dimensions')}
              className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#334139]/60 cursor-pointer hover:text-[#334139] py-0.5"
            >
              <div className="flex items-center gap-1">
                {openSections.dimensions ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>Dimensions</span>
              </div>
              <span className="font-mono text-[10px] text-[#2B5B84] bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                {filteredDimensions.length}
              </span>
            </div>

            {openSections.dimensions && (
              <div className="space-y-1 pl-1 pt-1">
                {filteredDimensions.map((dim) => {
                  const Icon = dim.icon;
                  const isDomainSelected = selectedDomain === dim.domain;
                  return (
                    <div
                      key={dim.name}
                      onClick={() => onSelectDomain(dim.domain)}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors border group',
                        isDomainSelected
                          ? 'bg-sky-100 text-sky-900 border-sky-300 font-semibold shadow-2xs'
                          : 'bg-transparent text-[#334139]/80 border-transparent hover:bg-sky-50/70 hover:text-sky-900 hover:border-sky-200',
                      )}
                      title={`Filter by ${dim.name}`}
                    >
                      <Icon size={12} className="text-[#2B5B84] shrink-0" />
                      <span className="truncate flex-1">{dim.name}</span>
                      <span className="text-[10px] font-mono text-[#2B5B84]/60 opacity-0 group-hover:opacity-100">
                        =
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Measures Section (Tableau Green Pills) */}
          <div className="space-y-1 pt-2 border-t border-[#334139]/10">
            <div
              onClick={() => toggleSection('measures')}
              className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#334139]/60 cursor-pointer hover:text-[#334139] py-0.5"
            >
              <div className="flex items-center gap-1">
                {openSections.measures ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>Measures</span>
              </div>
              <span className="font-mono text-[10px] text-[#064C1C] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {filteredMeasures.length}
              </span>
            </div>

            {openSections.measures && (
              <div className="space-y-1 pl-1 pt-1">
                {filteredMeasures.map((measure) => {
                  const isDomainSelected = selectedDomain === measure.domain;
                  return (
                    <div
                      key={measure.name}
                      onClick={() => onSelectDomain(measure.domain)}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors border group',
                        isDomainSelected
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold shadow-2xs'
                          : 'bg-transparent text-[#334139]/80 border-transparent hover:bg-emerald-50/70 hover:text-emerald-900 hover:border-emerald-200',
                      )}
                      title={`Aggregate: ${measure.calc}(${measure.name})`}
                    >
                      <Hash size={12} className="text-[#064C1C] shrink-0" />
                      <span className="truncate flex-1">{measure.name}</span>
                      <span className="font-mono text-[10px] text-[#064C1C]/60 bg-white/70 px-1 rounded">
                        {measure.calc}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Parameters Section */}
          <div className="space-y-1 pt-2 border-t border-[#334139]/10">
            <div
              onClick={() => toggleSection('parameters')}
              className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#334139]/60 cursor-pointer hover:text-[#334139] py-0.5"
            >
              <div className="flex items-center gap-1">
                {openSections.parameters ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>Parameters</span>
              </div>
              <Sliders size={11} className="text-[#334139]/50" />
            </div>

            {openSections.parameters && (
              <div className="space-y-2 pl-1 pt-1 text-[11px]">
                <div className="p-2 rounded bg-[#FDFFFC] border border-[#334139]/12 space-y-1">
                  <div className="text-[#334139]/60 font-medium">Confidence Band</div>
                  <div className="font-mono font-bold text-[#1E2D24]">±2.0σ (95.4%)</div>
                </div>
                <div className="p-2 rounded bg-[#FDFFFC] border border-[#334139]/12 space-y-1">
                  <div className="text-[#334139]/60 font-medium">Cohort Window</div>
                  <div className="font-mono font-bold text-[#1E2D24]">Day 0 to Day 120</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Analytics Tab (Tableau Models & Reference Lines) */
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#334139]/60 py-0.5">
              Summarize
            </div>
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-2 p-2 rounded hover:bg-[#334139]/5 border border-[#334139]/10 cursor-pointer">
                <LineChart size={13} className="text-[#064C1C]" />
                <span className="font-medium text-[#1E2D24]">Constant / Target Line</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-[#334139]/5 border border-[#334139]/10 cursor-pointer">
                <TrendingUp size={13} className="text-[#064C1C]" />
                <span className="font-medium text-[#1E2D24]">Average with 95% CI</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-[#334139]/5 border border-[#334139]/10 cursor-pointer">
                <BoxSelect size={13} className="text-[#064C1C]" />
                <span className="font-medium text-[#1E2D24]">Box Plot Quartiles</span>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-[#334139]/10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#334139]/60 py-0.5">
              Model
            </div>
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-2 p-2 rounded bg-emerald-50 border border-emerald-200 cursor-pointer">
                <Activity size={13} className="text-[#064C1C]" />
                <div>
                  <div className="font-bold text-[#064C1C]">Prophet Anomaly Band</div>
                  <div className="text-[10px] text-[#064C1C]/70">Active on Velocity Series</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded hover:bg-[#334139]/5 border border-[#334139]/10 cursor-pointer">
                <Layers size={13} className="text-[#064C1C]" />
                <span className="font-medium text-[#1E2D24]">Cohort Decay Clustering</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
