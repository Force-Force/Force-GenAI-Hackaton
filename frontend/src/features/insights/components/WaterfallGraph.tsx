import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { WaterfallBarItem } from '../types';

interface WaterfallGraphProps {
  data: WaterfallBarItem[];
}

export function WaterfallGraph({ data }: WaterfallGraphProps) {
  const [isFocusedView, setIsFocusedView] = useState(true);

  // Compute stacked waterfall values for Recharts BarChart
  let cumulative = 0;
  const chartData = data.map((item) => {
    let placeholder = 0;
    let barValue = 0;

    if (item.type === 'base') {
      placeholder = 0;
      barValue = item.amount;
      cumulative = item.amount;
    } else if (item.type === 'total') {
      placeholder = 0;
      barValue = item.amount;
    } else {
      if (item.amount < 0) {
        placeholder = cumulative + item.amount;
        barValue = Math.abs(item.amount);
        cumulative += item.amount;
      } else {
        placeholder = cumulative;
        barValue = item.amount;
        cumulative += item.amount;
      }
    }

    let barColor = '#2B5B84';
    if (item.type === 'deduction') barColor = '#D66F14';
    if (item.type === 'total') barColor = '#064C1C';

    return {
      ...item,
      placeholder,
      barValue,
      barColor,
    };
  });

  return (
    <div className="w-full space-y-3">
      {/* Legend & Scale View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3 font-medium">
          <span className="flex items-center gap-1.5 text-[#1E2D24]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2B5B84]" />
            Gross Base
          </span>
          <span className="flex items-center gap-1.5 text-[#D66F14]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#D66F14]" />
            Deductions & Fees
          </span>
          <span className="flex items-center gap-1.5 text-[#064C1C]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#064C1C]" />
            Final Net Realized
          </span>
        </div>

        {/* Tableau Axis Scale Toggle */}
        <button
          type="button"
          onClick={() => setIsFocusedView(!isFocusedView)}
          title={isFocusedView ? 'Switch to Full Scale from $0' : 'Zoom into Leakage Variance ($1.05M–$1.28M)'}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white border border-[#334139]/20 text-[11px] font-mono text-[#334139]/70 hover:text-[#064C1C] hover:border-[#064C1C] cursor-pointer transition-colors shadow-2xs select-none"
        >
          {isFocusedView ? <ZoomOut size={11} /> : <ZoomIn size={11} />}
          <span>{isFocusedView ? 'Axis: Focused Variance' : 'Axis: Zero Baseline'}</span>
        </button>
      </div>

      {/* Real Recharts Stacked Waterfall BarChart */}
      <div className="w-full bg-[#FDFFFC] rounded-lg border border-[#334139]/15 p-2 sm:p-3 shadow-2xs">
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200} initialDimension={{ width: 600, height: 220 }}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 16, left: 8, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#334139"
                strokeOpacity="0.12"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10.5, fill: '#334139', fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#334139', strokeOpacity: 0.2 }}
                interval={0}
              />
              <YAxis
                domain={isFocusedView ? [1040000, 1280000] : [0, 1300000]}
                tickFormatter={(v) => `$${(v / 1000000).toFixed(2)}M`}
                tick={{ fontSize: 10, fill: '#334139', opacity: 0.7, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                width={54}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as typeof chartData[0];
                  return (
                    <div className="p-2.5 rounded-lg bg-[#1E2D24] text-[#FDFFFC] text-xs shadow-md space-y-1 min-w-[170px]">
                      <div className="font-bold flex items-center justify-between border-b border-white/10 pb-1">
                        <span>{item.label}</span>
                        <span className="font-mono text-[#D66F14]">{item.formatted}</span>
                      </div>
                      {item.driftPct && (
                        <div className="flex items-center justify-between text-[10.5px] text-amber-300 font-mono">
                          <span>Margin Impact:</span>
                          <span>{item.driftPct}</span>
                        </div>
                      )}
                      {item.note && (
                        <p className="text-[10px] text-white/80 pt-1 border-t border-white/10 leading-snug">
                          {item.note}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="placeholder"
                stackId="waterfall"
                fill="transparent"
                isAnimationActive={false}
              />
              <Bar
                dataKey="barValue"
                stackId="waterfall"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.barColor} />
                ))}
                <LabelList
                  dataKey="formatted"
                  position="top"
                  offset={6}
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    fill: '#1E2D24',
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tableau Waterfall Step Summary Shelf */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-2 border-t border-[#334139]/10 text-xs select-none">
          {data.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded bg-white border border-[#334139]/10 space-y-0.5"
            >
              <div className="text-[10.5px] font-semibold text-[#334139] truncate">
                {item.label}
              </div>
              <div className="font-mono font-bold text-xs text-[#1E2D24]">
                {item.formatted}
              </div>
              {item.driftPct && (
                <div className="text-[10px] font-mono text-[#D66F14] font-semibold">
                  {item.driftPct}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
