import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { cn } from '../../../utils/cn';
import type { CohortPoint } from '../types';

interface CohortDecayGraphProps {
  data: CohortPoint[];
}

export function CohortDecayGraph({ data }: CohortDecayGraphProps) {
  const [activeTier, setActiveTier] = useState<'all' | 'enterprise' | 'selfServe'>('all');

  return (
    <div className="w-full space-y-3">
      {/* Legend & Interactive Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 font-medium">
          <button
            type="button"
            onClick={() => setActiveTier('all')}
            className={cn(
              'flex items-center gap-1.5 transition-colors cursor-pointer',
              activeTier === 'all' ? 'text-[#1E2D24] font-bold' : 'text-[#334139]/50',
            )}
          >
            <span className="w-3 h-0.5 bg-[#064C1C]" />
            Enterprise Tier (Expansion)
          </button>
          <button
            type="button"
            onClick={() => setActiveTier('selfServe')}
            className={cn(
              'flex items-center gap-1.5 transition-colors cursor-pointer',
              activeTier === 'selfServe' ? 'text-[#D66F14] font-bold' : 'text-[#334139]/50',
            )}
          >
            <span className="w-3 h-0.5 bg-[#D66F14]" />
            Self-Serve Tier (Decay)
          </button>
          <span className="flex items-center gap-1.5 text-slate-400 hidden sm:inline-flex">
            <span className="w-3 h-0.5 bg-slate-300 stroke-dashed" />
            Marketplace Benchmark
          </span>
        </div>
        <span className="font-mono text-xs text-[#334139]/60">
          100% Day 0 Baseline
        </span>
      </div>

      {/* Real Recharts LineChart */}
      <div className="w-full bg-[#FDFFFC] rounded-lg border border-[#334139]/15 p-2 sm:p-3 shadow-2xs">
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200} initialDimension={{ width: 600, height: 220 }}>
            <LineChart
              data={data}
              margin={{ top: 16, right: 24, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#334139"
                strokeOpacity="0.12"
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: '#334139' }}
                tickLine={false}
                axisLine={{ stroke: '#334139', strokeOpacity: 0.2 }}
                interval={0}
              />
              <YAxis
                domain={[30, 130]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10, fill: '#334139', opacity: 0.7, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ReferenceLine
                y={100}
                stroke="#334139"
                strokeDasharray="4 4"
                strokeOpacity={0.35}
                label={{
                  value: '100% Baseline',
                  position: 'insideTopLeft',
                  fill: '#334139',
                  fontSize: 10,
                  opacity: 0.6,
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="p-2.5 rounded-lg bg-[#1E2D24] text-[#FDFFFC] text-xs shadow-md space-y-1.5 min-w-[170px]">
                      <div className="font-bold border-b border-white/10 pb-1 font-mono">
                        Vintage: {label}
                      </div>
                      <div className="space-y-0.5 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Enterprise:</span>
                          <span className="font-bold">{payload[0]?.value}%</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-300">
                          <span>Self-Serve:</span>
                          <span className="font-bold">{payload[1]?.value}%</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Benchmark:</span>
                          <span>{payload[2]?.value}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="cohortA"
                name="Enterprise Tier"
                stroke="#064C1C"
                strokeWidth={activeTier === 'selfServe' ? 1 : 2.5}
                strokeOpacity={activeTier === 'selfServe' ? 0.35 : 1}
                dot={{ r: 3.5, fill: '#064C1C' }}
                activeDot={{ r: 5.5, fill: '#064C1C', stroke: '#FDFFFC', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="cohortB"
                name="Self-Serve Tier"
                stroke="#D66F14"
                strokeWidth={activeTier === 'enterprise' ? 1 : 2.5}
                strokeOpacity={activeTier === 'enterprise' ? 0.35 : 1}
                dot={{ r: 3.5, fill: '#D66F14' }}
                activeDot={{ r: 5.5, fill: '#D66F14', stroke: '#FDFFFC', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="cohortC"
                name="Marketplace Benchmark"
                stroke="#94A3B8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tableau Cohort Vintage Checkpoints */}
        <div className="flex items-center justify-between pt-2 border-t border-[#334139]/10 text-xs text-[#334139]/70 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#1E2D24]">Day 0</span>
            <span className="text-[11px] text-[#334139]/50">(Acquisition: 100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#064C1C]">Day 120</span>
            <span className="text-[11px] font-semibold text-[#064C1C]">(Enterprise: 118% NRR)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
