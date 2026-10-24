import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { AnomalyPoint } from '../types';

interface AnomalyRibbonGraphProps {
  data: AnomalyPoint[];
}

export function AnomalyRibbonGraph({ data }: AnomalyRibbonGraphProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(6); // Default highlight the anomaly at Oct 18

  const width = 640;
  const height = 240;
  const paddingX = 48;
  const paddingY = 24;

  const maxVal = 95000;
  const minVal = 25000;

  const getX = (idx: number) => paddingX + (idx / (data.length - 1)) * (width - paddingX * 2);
  const getY = (val: number) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);

  // Upper boundary curve
  const upperPath = data.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.expectedUpper);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Lower boundary reversed to form a polygon ribbon
  const lowerPathReversed = data
    .slice()
    .reverse()
    .map((curr, revIdx) => {
      const idx = data.length - 1 - revIdx;
      const x = getX(idx);
      const y = getY(curr.expectedLower);
      return `L ${x} ${y}`;
    })
    .join(' ');

  const ribbonArea = `${upperPath} ${lowerPathReversed} Z`;

  // Actual values line
  const actualLine = data.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.actual);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="w-full space-y-3">
      {/* Legend & Outlier summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1.5 text-[#064C1C]">
            <span className="w-3 h-0.5 bg-[#064C1C]" />
            Actual Sales Volume
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-3 h-2 bg-slate-200/80 rounded-xs" />
            Expected Confidence Band (±2.0σ)
          </span>
          <span className="flex items-center gap-1.5 text-rose-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200" />
            Detected Anomaly
          </span>
        </div>
        <span className="font-mono text-xs text-[#334139]/60">
          Forecast Bounds (±2.0σ)
        </span>
      </div>

      {/* Responsive SVG Chart Surface */}
      <div className="w-full bg-[#FDFFFC] rounded-2xl border border-[#334139]/12 p-4 sm:p-6 shadow-2xs overflow-hidden">
        <div className="relative w-full aspect-[2.6/1] min-h-[220px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Confidence Band Shaded Ribbon */}
            <motion.path
              d={ribbonArea}
              fill="#334139"
              fillOpacity="0.08"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            />

            {/* Upper Expected Boundary */}
            <path d={upperPath} fill="none" stroke="#334139" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.3" />

            {/* Actual Values Line */}
            <motion.path
              d={actualLine}
              fill="none"
              stroke="#064C1C"
              strokeWidth="2.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Data Points */}
            {data.map((point, idx) => {
              const x = getX(idx);
              const y = getY(point.actual);
              const isHovered = hoveredIdx === idx;

              return (
                <g key={point.date} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
                  {/* Vertical Hover Guideline */}
                  {isHovered && (
                    <line x1={x} y1={paddingY} x2={x} y2={height - paddingY} stroke="#334139" strokeOpacity="0.25" strokeDasharray="2 2" />
                  )}

                  {/* Anomaly Highlight Pulse */}
                  {point.isAnomaly && (
                    <circle cx={x} cy={y} r={isHovered ? 12 : 8} fill="#f43f5e" fillOpacity="0.25" className="animate-ping" />
                  )}

                  {/* Point Circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={point.isAnomaly ? 6 : isHovered ? 5 : 3.5}
                    fill={point.isAnomaly ? '#e11d48' : '#FDFFFC'}
                    stroke={point.isAnomaly ? '#fff' : '#064C1C'}
                    strokeWidth={point.isAnomaly ? '2' : '2'}
                    className="cursor-pointer transition-all"
                  />

                  {/* X-Axis Date */}
                  <text
                    x={x}
                    y={height - 6}
                    fontSize="11"
                    fontFamily="monospace"
                    fill="#334139"
                    opacity={isHovered ? '0.9' : '0.55'}
                    textAnchor="middle"
                  >
                    {point.date}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Anomaly Tooltip Callout */}
          {hoveredIdx !== null && (
            <div
              style={{ left: `${(hoveredIdx / (data.length - 1)) * 75 + 10}%` }}
              className="absolute top-2 z-20 p-3 rounded-xl bg-[#1E2D24] text-[#FDFFFC] text-xs shadow-lg max-w-[240px] pointer-events-none animate-fadeIn space-y-1"
            >
              <div className="font-mono text-[11px] font-bold text-white/60 border-b border-white/10 pb-1 flex items-center justify-between">
                <span>{data[hoveredIdx].date} Reading</span>
                {data[hoveredIdx].isAnomaly && (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle size={11} /> Outlier
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>Actual:</span>
                <span className="font-bold text-sm text-[#FDFFFC]">${data[hoveredIdx].actual.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/70 font-mono">
                <span>Upper Limit:</span>
                <span>${data[hoveredIdx].expectedUpper.toLocaleString()}</span>
              </div>
              {data[hoveredIdx].anomalyCause && (
                <p className="text-[11px] text-amber-300 pt-1 border-t border-white/10 leading-snug">
                  Cause: {data[hoveredIdx].anomalyCause}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

