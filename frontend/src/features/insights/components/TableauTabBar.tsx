import {
  LayoutDashboard,
  BarChart2,
  LineChart,
  GitFork,
  Activity,
  Table as TableIcon,
  Plus,
  BookOpen,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export type TableauActiveSheet =
  | 'dashboard'
  | 'waterfall'
  | 'cohort'
  | 'funnel'
  | 'anomaly'
  | 'ledger';

interface TableauTabBarProps {
  activeSheet: TableauActiveSheet;
  onSelectSheet: (sheet: TableauActiveSheet) => void;
}

export function TableauTabBar({ activeSheet, onSelectSheet }: TableauTabBarProps) {
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      type: 'dashboard',
    },
    {
      id: 'waterfall' as const,
      label: 'Sales Waterfall',
      icon: BarChart2,
      type: 'worksheet',
    },
    {
      id: 'cohort' as const,
      label: 'Cohort Retention',
      icon: LineChart,
      type: 'worksheet',
    },
    {
      id: 'funnel' as const,
      label: 'Fulfillment Funnel',
      icon: GitFork,
      type: 'worksheet',
    },
    {
      id: 'anomaly' as const,
      label: 'Anomaly Ribbon',
      icon: Activity,
      type: 'worksheet',
    },
    {
      id: 'ledger' as const,
      label: 'Table Ledger',
      icon: TableIcon,
      type: 'crosstab',
    },
  ];

  return (
    <footer className="w-full bg-[#E2E8F0] border-t border-[#334139]/20 px-2 flex items-center justify-between select-none text-xs shrink-0 z-10 shadow-sm overflow-x-auto no-scrollbar">
      {/* Worksheet / Dashboard Tabs */}
      <div className="flex items-center gap-0.5">
        {tabs.map((tab) => {
          const isActive = activeSheet === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectSheet(tab.id)}
              className={cn(
                'group relative flex items-center gap-1.5 px-3 py-2 border-t-2 transition-all cursor-pointer text-xs whitespace-nowrap',
                isActive
                  ? 'bg-white border-[#D66F14] text-[#1E2D24] font-bold shadow-2xs'
                  : 'bg-[#CBD5E1]/60 border-transparent text-[#334139]/70 hover:bg-[#CBD5E1] hover:text-[#1E2D24]',
              )}
            >
              <Icon
                size={12}
                className={cn(
                  isActive ? 'text-[#064C1C]' : 'text-[#334139]/50 group-hover:text-[#334139]',
                )}
              />
              <span>{tab.label}</span>
              {tab.type === 'dashboard' && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 text-amber-800 ml-0.5">
                  Dash
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tableau New Sheet / Dashboard / Story Buttons */}
      <div className="flex items-center gap-1 pl-2 shrink-0 py-1 border-l border-[#334139]/20">
        <button
          type="button"
          title="New Worksheet"
          className="p-1 rounded hover:bg-white text-[#334139]/70 hover:text-[#064C1C] cursor-pointer flex items-center gap-0.5"
        >
          <Plus size={12} />
          <BarChart2 size={11} />
        </button>
        <button
          type="button"
          title="New Dashboard"
          className="p-1 rounded hover:bg-white text-[#334139]/70 hover:text-[#064C1C] cursor-pointer flex items-center gap-0.5"
        >
          <Plus size={12} />
          <LayoutDashboard size={11} />
        </button>
        <button
          type="button"
          title="New Story"
          className="p-1 rounded hover:bg-white text-[#334139]/70 hover:text-[#064C1C] cursor-pointer flex items-center gap-0.5"
        >
          <Plus size={12} />
          <BookOpen size={11} />
        </button>
      </div>
    </footer>
  );
}
