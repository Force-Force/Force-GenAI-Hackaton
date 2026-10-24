import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import type { AnomalyPoint } from '../types';

interface AnomalyRibbonGraphProps {
  data: AnomalyPoint[];
}

export function AnomalyRibbonGraph({ data }: AnomalyRibbonGraphProps) {
  // Transform data for Recharts stacked Area (transparent base + ribbon band)
  const chartData = data.map((item) => ({
    ...item,
    bandBottom: item.expectedLower,
    bandHeight: item.expectedUpper - item.expectedLower,
  }));

  const anomalyPoint = data.find((p) => p.isAnomaly);

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

      {/* Real Recharts ComposedChart with Shaded Band Ribbon */}
      <div className="w-full bg-[#FDFFFC] rounded-lg border border-[#334139]/15 p-2 sm:p-3 shadow-2xs">
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200} initialDimension={{ width: 600, height: 220 }}>
            <ComposedChart
              data={chartData}
              margin={{ top: 16, right: 24, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#334139"
                strokeOpacity="0.12"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#334139', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#334139', strokeOpacity: 0.2 }}
                interval={0}
              />
              <YAxis
                domain={[25000, 95000]}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 10, fill: '#334139', opacity: 0.7, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as typeof chartData[0];
                  return (
                    <div className="p-2.5 rounded-lg bg-[#1E2D24] text-[#FDFFFC] text-xs shadow-md space-y-1 min-w-[190px]">
                      <div className="font-mono text-[11px] font-bold text-white/70 border-b border-white/10 pb-1 flex items-center justify-between">
                        <span>{item.date} Reading</span>
                        {item.isAnomaly && (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle size={11} /> Outlier
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span>Actual Volume:</span>
                        <span className="font-bold text-sm text-[#FDFFFC]">
                          ${item.actual.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] text-white/70 font-mono">
                        <span>Expected Band:</span>
                        <span>
                          ${(item.expectedLower / 1000).toFixed(0)}K – ${(item.expectedUpper / 1000).toFixed(0)}K
                        </span>
                      </div>
                      {item.anomalyCause && (
                        <p className="text-[10px] text-amber-300 pt-1 border-t border-white/10 leading-snug">
                          {item.anomalyCause}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                dataKey="bandBottom"
                stackId="band"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                dataKey="bandHeight"
                stackId="band"
                stroke="#334139"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                fill="#334139"
                fillOpacity={0.08}
                isAnimationActive={true}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#064C1C"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy) return null;
                  const isAnomaly = payload.isAnomaly;

                  if (isAnomaly) {
                    return (
                      <g key={`dot-${payload.date}`}>
                        <circle cx={cx} cy={cy} r={7} fill="#f43f5e" fillOpacity={0.3} className="animate-ping" />
                        <circle cx={cx} cy={cy} r={5} fill="#e11d48" stroke="#FDFFFC" strokeWidth={2} />
                      </g>
                    );
                  }
                  return (
                    <circle
                      key={`dot-${payload.date}`}
                      cx={cx}
                      cy={cy}
                      r={3.5}
                      fill="#FDFFFC"
                      stroke="#064C1C"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 6, fill: '#064C1C', stroke: '#FDFFFC', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Tableau Outlier Inspection Shelf */}
        {anomalyPoint && (
          <div className="flex items-center justify-between pt-2 border-t border-[#334139]/10 text-xs select-none">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                {anomalyPoint.date}
              </span>
              <span className="text-[#1E2D24] font-medium">
                Peak Velocity: ${anomalyPoint.actual.toLocaleString()}
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#D66F14] font-semibold hidden sm:inline">
              {anomalyPoint.anomalyDelta || '+$27.7K Outlier'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
