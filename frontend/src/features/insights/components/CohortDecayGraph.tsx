import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../../utils/cn';
import type { CohortPoint } from '../types';

interface CohortDecayGraphProps {
  data: CohortPoint[];
}

export function CohortDecayGraph({ data }: CohortDecayGraphProps) {
  const [activeTier, setActiveTier] = useState<'all' | 'enterprise' | 'selfServe'>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 640;
  const height = 240;
  const paddingX = 48;
  const paddingY = 24;

  const maxVal = 130; // Up to 130% for expansion
  const minVal = 30;

  const getX = (index: number) => paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
  const getY = (val: number) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);

  // Generate SVG curve path
  const createPath = (key: 'cohortA' | 'cohortB' | 'cohortC') => {
    return data.reduce((acc, curr, idx) => {
      const x = getX(idx);
      const y = getY(curr[key]);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  const pathEnterprise = createPath('cohortA');
  const pathSelfServe = createPath('cohortB');
  const pathMarketplace = createPath('cohortC');

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
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-0.5 bg-slate-300 stroke-dashed" />
            Marketplace Benchmark
          </span>
        </div>
        <span className="font-mono text-xs text-[#334139]/60">
          100% Day 0 Baseline
        </span>
      </div>

      {/* Responsive SVG Container */}
      <div className="w-full bg-[#FDFFFC] rounded-2xl border border-[#334139]/12 p-4 sm:p-6 shadow-2xs overflow-hidden">
        <div className="relative w-full aspect-[2.6/1] min-h-[220px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* 100% Baseline Line */}
            <line
              x1={paddingX}
              y1={getY(100)}
              x2={width - paddingX}
              y2={getY(100)}
              stroke="#334139"
              strokeDasharray="4 4"
              strokeOpacity="0.25"
            />
            <text
              x={paddingX - 6}
              y={getY(100) + 4}
              fontSize="10"
              fontFamily="monospace"
              fill="#334139"
              opacity="0.6"
              textAnchor="end"
            >
              100%
            </text>

            {/* Grid references */}
            <text x={paddingX - 6} y={getY(120) + 4} fontSize="10" fontFamily="monospace" fill="#334139" opacity="0.4" textAnchor="end">
              120%
            </text>
            <text x={paddingX - 6} y={getY(60) + 4} fontSize="10" fontFamily="monospace" fill="#334139" opacity="0.4" textAnchor="end">
              60%
            </text>

            {/* Curve 3: Marketplace (Benchmark) */}
            <motion.path
              d={pathMarketplace}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Curve 2: Self-Serve Tier (Decay) */}
            <motion.path
              d={pathSelfServe}
              fill="none"
              stroke="#D66F14"
              strokeWidth={activeTier === 'selfServe' || activeTier === 'all' ? '2.5' : '1'}
              strokeOpacity={activeTier === 'enterprise' ? '0.2' : '1'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Curve 1: Enterprise Tier (Net Expansion) */}
            <motion.path
              d={pathEnterprise}
              fill="none"
              stroke="#064C1C"
              strokeWidth={activeTier === 'enterprise' || activeTier === 'all' ? '3' : '1'}
              strokeOpacity={activeTier === 'selfServe' ? '0.2' : '1'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Interactive Points on Active Curves */}
            {data.map((point, idx) => {
              const x = getX(idx);
              const yA = getY(point.cohortA);
              const yB = getY(point.cohortB);
              const isHovered = hoveredIndex === idx;

              return (
                <g key={point.period} onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                  {/* Vertical hover indicator line */}
                  {isHovered && (
                    <line x1={x} y1={paddingY} x2={x} y2={height - paddingY} stroke="#334139" strokeOpacity="0.2" />
                  )}

                  {/* Enterprise Point */}
                  <circle
                    cx={x}
                    cy={yA}
                    r={isHovered ? 6 : 4}
                    fill="#FDFFFC"
                    stroke="#064C1C"
                    strokeWidth="2.5"
                    className="cursor-pointer transition-all"
                  />

                  {/* Self-Serve Point */}
                  <circle
                    cx={x}
                    cy={yB}
                    r={isHovered ? 5 : 3.5}
                    fill="#FDFFFC"
                    stroke="#D66F14"
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                  />

                  {/* X-Axis Period Label */}
                  <text
                    x={x}
                    y={height - 6}
                    fontSize="11"
                    fontFamily="monospace"
                    fill="#334139"
                    opacity={isHovered ? '0.9' : '0.55'}
                    textAnchor="middle"
                  >
                    {point.period}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Active Hover Detail Card */}
          {hoveredIndex !== null && (
            <div
              style={{ left: `${(hoveredIndex / (data.length - 1)) * 80 + 10}%` }}
              className="absolute top-2 z-20 p-2.5 rounded-xl bg-[#1E2D24] text-[#FDFFFC] text-xs shadow-lg pointer-events-none animate-fadeIn space-y-1"
            >
              <div className="font-mono text-[11px] font-bold text-[#FDFFFC]/60 border-b border-white/10 pb-0.5">
                {data[hoveredIndex].period} Cohort Status
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#064C1C] bg-white/90 px-1 py-0.2 rounded font-bold text-[11px]">Enterprise</span>
                <span className="font-mono font-bold">{data[hoveredIndex].cohortA}% NRR</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#D66F14] bg-white/90 px-1 py-0.2 rounded font-bold text-[11px]">Self-Serve</span>
                <span className="font-mono font-bold text-[#D66F14]">{data[hoveredIndex].cohortB}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

