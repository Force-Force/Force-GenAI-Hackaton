import { useState } from 'react';
import {
  Undo2,
  Redo2,
  Save,
  RotateCcw,
  Database,
  RefreshCw,
  ArrowLeftRight,
  ArrowDownAZ,
  ArrowUpZA,
  Highlighter,
  Maximize2,
  Download,
  Share2,
  Check,
  Pause,
  Play,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface TableauToolbarProps {
  onRefresh?: () => void;
  onSwapAxes?: () => void;
  onToggleDataPane?: () => void;
  isDataPaneOpen?: boolean;
}

export function TableauToolbar({
  onRefresh,
  onSwapAxes,
  onToggleDataPane,
  isDataPaneOpen = true,
}: TableauToolbarProps) {
  const [isAutoUpdate, setIsAutoUpdate] = useState(true);
  const [fitMode, setFitMode] = useState<'standard' | 'width' | 'entire'>('standard');
  const [isSaved, setIsSaved] = useState(true);
  const [sortDirection, setSortDirection] = useState<'none' | 'asc' | 'desc'>('none');

  const handleSave = () => {
    setIsSaved(true);
  };

  const toggleSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="w-full bg-[#F8FAFC] border-b border-[#334139]/15 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs select-none shadow-2xs">
      {/* Left: Workbook History, Connection & Core Actions */}
      <div className="flex items-center gap-1">
        {/* Toggle Data Pane Pill */}
        <button
          type="button"
          onClick={onToggleDataPane}
          title={isDataPaneOpen ? 'Hide Data Pane' : 'Show Data Pane'}
          className={cn(
            'p-1.5 rounded hover:bg-[#334139]/10 transition-colors cursor-pointer flex items-center gap-1 font-medium',
            isDataPaneOpen ? 'bg-[#334139]/10 text-[#064C1C] font-semibold' : 'text-[#334139]/70',
          )}
        >
          <SlidersHorizontal size={13} />
          <span className="text-[11px] hidden sm:inline">Data Pane</span>
        </button>

        <div className="h-4 w-px bg-[#334139]/20 mx-1" />

        {/* Undo / Redo */}
        <button
          type="button"
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer"
        >
          <Undo2 size={13} />
        </button>
        <button
          type="button"
          title="Redo (Ctrl+Y)"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer"
        >
          <Redo2 size={13} />
        </button>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          title="Save Workbook (Ctrl+S)"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer"
        >
          <Save size={13} />
        </button>

        {/* Revert */}
        <button
          type="button"
          title="Revert to Saved"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer"
        >
          <RotateCcw size={13} />
        </button>

        <div className="h-4 w-px bg-[#334139]/20 mx-1" />

        {/* Live Data Source Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-[#334139]/15 text-[#334139] font-mono text-[11px]">
          <Database size={11} className="text-[#064C1C]" />
          <span className="font-semibold truncate max-w-[130px] sm:max-w-[180px]">
            retail_lakehouse_mart
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#064C1C] animate-pulse" title="Live Connection" />
        </div>

        {/* Pause/Resume Auto Update */}
        <button
          type="button"
          onClick={() => setIsAutoUpdate(!isAutoUpdate)}
          title={isAutoUpdate ? 'Pause Auto Updates' : 'Resume Auto Updates'}
          className={cn(
            'p-1.5 rounded hover:bg-[#334139]/10 transition-colors cursor-pointer',
            isAutoUpdate ? 'text-[#064C1C]' : 'text-amber-600',
          )}
        >
          {isAutoUpdate ? <Pause size={13} /> : <Play size={13} />}
        </button>

        {/* Refresh Data */}
        <button
          type="button"
          onClick={onRefresh}
          title="Run Query / Refresh Data (F5)"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#064C1C] transition-colors cursor-pointer"
        >
          <RefreshCw size={13} />
        </button>

        <div className="h-4 w-px bg-[#334139]/20 mx-1 hidden sm:block" />

        {/* Swap Rows & Columns */}
        <button
          type="button"
          onClick={onSwapAxes}
          title="Swap Rows and Columns (Ctrl+W)"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer hidden sm:flex items-center gap-1"
        >
          <ArrowLeftRight size={13} />
          <span className="text-[11px]">Swap</span>
        </button>

        {/* Sort */}
        <button
          type="button"
          onClick={toggleSort}
          title="Sort Visualizations"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer hidden md:flex items-center gap-1"
        >
          {sortDirection === 'desc' ? <ArrowDownAZ size={13} /> : <ArrowUpZA size={13} />}
          <span className="text-[11px]">Sort</span>
        </button>

        {/* Highlight */}
        <button
          type="button"
          title="Highlight Tool"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer hidden md:flex items-center gap-1"
        >
          <Highlighter size={13} />
        </button>
      </div>

      {/* Right: View Sizing, Presentation, and Share */}
      <div className="flex items-center gap-1.5">
        {/* Fit Selector */}
        <div className="hidden lg:flex items-center bg-white border border-[#334139]/15 rounded p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setFitMode('standard')}
            className={cn(
              'px-2 py-0.5 rounded cursor-pointer transition-colors',
              fitMode === 'standard' ? 'bg-[#334139]/10 font-bold text-[#1E2D24]' : 'text-[#334139]/60',
            )}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => setFitMode('width')}
            className={cn(
              'px-2 py-0.5 rounded cursor-pointer transition-colors',
              fitMode === 'width' ? 'bg-[#334139]/10 font-bold text-[#1E2D24]' : 'text-[#334139]/60',
            )}
          >
            Fit Width
          </button>
          <button
            type="button"
            onClick={() => setFitMode('entire')}
            className={cn(
              'px-2 py-0.5 rounded cursor-pointer transition-colors',
              fitMode === 'entire' ? 'bg-[#334139]/10 font-bold text-[#1E2D24]' : 'text-[#334139]/60',
            )}
          >
            Entire View
          </button>
        </div>

        {/* Presentation Mode */}
        <button
          type="button"
          title="Presentation Mode (F7)"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer"
        >
          <Maximize2 size={13} />
        </button>

        {/* Export / Download */}
        <button
          type="button"
          title="Download Workbook / PDF / Image"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer flex items-center gap-1"
        >
          <Download size={13} />
          <span className="text-[11px] hidden sm:inline">Export</span>
        </button>

        {/* Share */}
        <button
          type="button"
          title="Share Dashboard URL"
          className="p-1.5 rounded hover:bg-[#334139]/10 text-[#334139]/70 hover:text-[#334139] cursor-pointer"
        >
          <Share2 size={13} />
        </button>
      </div>
    </div>
  );
}
