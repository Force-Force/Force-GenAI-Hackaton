import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../../utils/cn';
import type { WaterfallBarItem } from '../types';

interface WaterfallGraphProps {
  data: WaterfallBarItem[];
}

export function WaterfallGraph({ data }: WaterfallGraphProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  let cumulative = 0;
  const computedBars = data.map((item) => {
    let start = 0;
    let height = 0;

    if (item.type === 'base') {
      start = 0;
      height = item.amount;
      cumulative = item.amount;
    } else if (item.type === 'total') {
      start = 0;
      height = item.amount;
    } else {
      if (item.amount < 0) {
        start = cumulative + item.amount;
        height = Math.abs(item.amount);
        cumulative += item.amount;
      } else {
        start = cumulative;
        height = item.amount;
        cumulative += item.amount;
      }
    }

    return {
      ...item,
      start,
      height,
    };
  });

  const maxVal = Math.max(...computedBars.map((b) => Math.max(b.start + b.height, b.amount))) * 1.08;

  return (
    <div className="w-full space-y-2">
      {/* Visual Header / Legend */}
      <div className="flex items-center gap-3 text-xs font-medium">
        <span className="flex items-center gap-1.5 text-[#1E2D24]">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#1E2D24]" />
          Gross Base
        </span>
        <span className="flex items-center gap-1.5 text-[#D66F14]">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#D66F14]" />
          Deductions & Fees
        </span>
        <span className="flex items-center gap-1.5 text-[#064C1C]">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#064C1C]" />
          Final Net Realized
        </span>
      </div>

      {/* SVG Chart Surface */}
      <div className="w-full bg-[#FDFFFC] rounded-2xl border border-[#334139]/12 p-3 sm:p-4 shadow-2xs overflow-hidden">
        <div className="h-56 sm:h-64 w-full flex items-end gap-2 sm:gap-3 relative pt-6 pb-2">
          {/* Subtle grid lines */}
          <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-[#334139]/20 w-full" />
            <div className="border-b border-[#334139]/20 w-full" />
            <div className="border-b border-[#334139]/30 w-full" />
          </div>

          {computedBars.map((bar, idx) => {
            const isHovered = hoveredId === bar.id;
            const bottomPct = (bar.start / maxVal) * 100;
            const heightPct = Math.max((bar.height / maxVal) * 100, 3);

            let barColor = 'bg-[#1E2D24]';
            if (bar.type === 'deduction') barColor = 'bg-[#D66F14]';
            if (bar.type === 'total') barColor = 'bg-[#064C1C]';

            return (
              <div
                key={bar.id}
                onMouseEnter={() => setHoveredId(bar.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer"
              >
                {/* Floating Value Tag */}
                <div
                  style={{ bottom: `calc(${bottomPct + heightPct}% + 4px)` }}
                  className={cn(
                    'absolute text-[11px] sm:text-xs font-mono font-bold transition-all whitespace-nowrap pointer-events-none',
                    bar.type === 'deduction' ? 'text-[#D66F14]' : bar.type === 'total' ? 'text-[#064C1C]' : 'text-[#1E2D24]',
                    isHovered ? 'scale-110' : '',
                  )}
                >
                  {bar.formatted}
                </div>

                {/* The Bar */}
                <div className="w-full h-full relative flex items-end justify-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.06 }}
                    style={{ bottom: `${bottomPct}%` }}
                    className={cn(
                      'absolute w-full max-w-[48px] rounded-t-md transition-all',
                      barColor,
                      isHovered ? 'brightness-110 shadow-md ring-2 ring-[#064C1C]/25' : 'shadow-2xs',
                    )}
                  />
                </div>

                {/* X-Axis Category Label */}
                <div className="mt-1.5 text-center w-full">
                  <div className="text-[11px] font-semibold text-[#334139] truncate">
                    {bar.label}
                  </div>
                </div>

                {/* Hover Popover Tooltip */}
                {isHovered && bar.note && (
                  <div className="absolute bottom-full mb-6 z-30 p-2.5 rounded-xl bg-[#1E2D24] text-[#FDFFFC] text-xs shadow-lg max-w-[200px] pointer-events-none animate-fadeIn">
                    <div className="font-bold flex items-center justify-between gap-2 border-b border-white/10 pb-1 mb-1">
                      <span>{bar.label}</span>
                      <span className="font-mono text-[#D66F14]">{bar.formatted}</span>
                    </div>
                    <p className="text-[11px] text-white/80 leading-snug">{bar.note}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
