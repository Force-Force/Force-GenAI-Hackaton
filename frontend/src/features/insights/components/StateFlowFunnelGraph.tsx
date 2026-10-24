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
} from 'recharts';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { StateFlowStage } from '../types';

interface StateFlowFunnelGraphProps {
  stages: StateFlowStage[];
}

export function StateFlowFunnelGraph({ stages }: StateFlowFunnelGraphProps) {
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[2]?.id || stages[0].id);

  const selectedStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  const chartData = stages.map((s, idx) => ({
    ...s,
    stageNum: `STAGE 0${idx + 1}`,
    formattedCount: (s.count / 1000).toFixed(1) + 'K',
  }));

  return (
    <div className="w-full space-y-3">
      {/* Legend & Velocity Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1.5 text-[#064C1C]">
            <CheckCircle2 size={13} />
            Conserved Stage Transition
          </span>
          <span className="flex items-center gap-1.5 text-[#D66F14]">
            <AlertCircle size={13} />
            Dwell Bottleneck Identified
          </span>
        </div>
        <span className="font-mono text-xs text-[#334139]/60">
          420,000 Pipeline Volume
        </span>
      </div>

      {/* Real Recharts BarChart Funnel Throughput */}
      <div className="w-full bg-[#FDFFFC] rounded-lg border border-[#334139]/15 p-2 sm:p-3 shadow-2xs">
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={180} initialDimension={{ width: 600, height: 180 }}>
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 16, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#334139"
                strokeOpacity="0.12"
              />
              <XAxis
                dataKey="stageNum"
                tick={{ fontSize: 10.5, fill: '#334139', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#334139', strokeOpacity: 0.2 }}
              />
              <YAxis
                domain={[419000, 420500]}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 10, fill: '#334139', opacity: 0.7, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as StateFlowStage;
                  return (
                    <div className="p-2.5 rounded-lg bg-[#1E2D24] text-[#FDFFFC] text-xs shadow-md space-y-1 min-w-[170px]">
                      <div className="font-bold flex items-center justify-between border-b border-white/10 pb-1">
                        <span>{item.name}</span>
                        <span className="font-mono">{item.count.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] text-white/70 font-mono">
                        <span>Conversion:</span>
                        <span className="font-bold text-emerald-400">{item.ratePct}%</span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] text-white/70 font-mono">
                        <span>Avg Dwell:</span>
                        <span className={cn(item.status === 'bottleneck' ? 'text-amber-300 font-bold' : 'text-white')}>
                          {item.avgDwellMinutes} min
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.id}
                    onClick={() => setSelectedStageId(entry.id)}
                    fill={entry.status === 'bottleneck' ? '#D66F14' : entry.id === selectedStageId ? '#064C1C' : '#2B5B84'}
                    className="cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stage Inspection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {stages.map((stage, idx) => {
          const isSelected = stage.id === selectedStageId;
          const isBottleneck = stage.status === 'bottleneck';

          return (
            <div
              key={stage.id}
              onClick={() => setSelectedStageId(stage.id)}
              className={cn(
                'p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-1.5 select-none',
                isSelected
                  ? 'bg-white border-[#064C1C] ring-2 ring-[#064C1C]/20 shadow-xs'
                  : 'bg-white/80 border-[#334139]/12 hover:border-[#334139]/30',
              )}
            >
              {/* Step indicator */}
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[9.5px] font-bold text-[#334139]/40">
                  STAGE 0{idx + 1}
                </span>
                {isBottleneck ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                    Bottleneck
                  </span>
                ) : (
                  <span className="font-mono text-[9.5px] text-[#064C1C] font-semibold">
                    {stage.ratePct}%
                  </span>
                )}
              </div>

              {/* Title & Volume */}
              <div>
                <h4 className="text-xs font-bold text-[#1E2D24] leading-snug truncate">
                  {stage.name}
                </h4>
                <div className="font-mono text-xs font-bold text-[#334139] mt-0.5">
                  {stage.count.toLocaleString()}
                </div>
              </div>

              {/* Dwell time badge */}
              <div className="flex items-center gap-1 text-[10.5px] font-mono text-[#334139]/60 border-t border-[#334139]/10 pt-1">
                <Clock size={10} className={isBottleneck ? 'text-[#D66F14]' : 'text-[#334139]/40'} />
                <span className={cn(isBottleneck && 'font-bold text-[#D66F14]')}>
                  {stage.avgDwellMinutes < 60
                    ? `${stage.avgDwellMinutes}m`
                    : `${(stage.avgDwellMinutes / 60).toFixed(1)}h`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stage Note */}
      <div className="p-3 rounded-lg bg-white border border-[#334139]/15 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between gap-2 border-b border-[#334139]/10 pb-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1E2D24]">
              State Detail: {selectedStage.name}
            </span>
            <span className="font-mono text-[11px] text-[#334139]/60">
              ({selectedStage.count.toLocaleString()} orders)
            </span>
          </div>
          {selectedStage.anomalyCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D66F14] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              <AlertCircle size={11} />
              {selectedStage.anomalyCount} quarantined events
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#064C1C] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <CheckCircle2 size={11} />
              Conserved transition
            </span>
          )}
        </div>
        <p className="text-xs text-[#334139]/80 leading-relaxed">
          {selectedStage.notes}
        </p>
      </div>
    </div>
  );
}
