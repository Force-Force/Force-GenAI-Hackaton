import { useState } from 'react';
import { ArrowRight, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { StateFlowStage } from '../types';

interface StateFlowFunnelGraphProps {
  stages: StateFlowStage[];
}

export function StateFlowFunnelGraph({ stages }: StateFlowFunnelGraphProps) {
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[2]?.id || stages[0].id);

  const selectedStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  return (
    <div className="w-full space-y-4">
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

      {/* Funnel Pipeline Visual Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-[#FDFFFC] rounded-2xl border border-[#334139]/12 p-3 sm:p-4 shadow-2xs">
        {stages.map((stage, idx) => {
          const isSelected = stage.id === selectedStageId;
          const isBottleneck = stage.status === 'bottleneck';

          return (
            <div
              key={stage.id}
              onClick={() => setSelectedStageId(stage.id)}
              className={cn(
                'relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2',
                isSelected
                  ? 'bg-white border-[#064C1C] ring-2 ring-[#064C1C]/20 shadow-xs'
                  : 'bg-white/70 border-[#334139]/10 hover:border-[#334139]/30',
              )}
            >
              {/* Step indicator */}
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] font-bold text-[#334139]/40">
                  STAGE 0{idx + 1}
                </span>
                {isBottleneck ? (
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800">
                    Bottleneck
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-[#064C1C] font-semibold">
                    {stage.ratePct}%
                  </span>
                )}
              </div>

              {/* Title & Volume */}
              <div>
                <h4 className="text-xs font-bold text-[#1E2D24] leading-snug">
                  {stage.name}
                </h4>
                <div className="font-mono text-sm font-bold text-[#334139] mt-0.5">
                  {stage.count.toLocaleString()}
                </div>
              </div>

              {/* Dwell time badge */}
              <div className="flex items-center gap-1 text-[11px] font-mono text-[#334139]/60 border-t border-[#334139]/10 pt-1.5">
                <Clock size={11} className={isBottleneck ? 'text-[#D66F14]' : 'text-[#334139]/40'} />
                <span className={cn(isBottleneck && 'font-bold text-[#D66F14]')}>
                  {stage.avgDwellMinutes < 60
                    ? `${stage.avgDwellMinutes}m avg`
                    : `${(stage.avgDwellMinutes / 60).toFixed(1)}h avg`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stage Deep-Dive Card */}
      <div className="p-4 rounded-xl bg-white border border-[#334139]/15 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-2 border-b border-[#334139]/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1E2D24]">
              Selected State: {selectedStage.name}
            </span>
            <span className="font-mono text-[11px] text-[#334139]/60">
              ({selectedStage.count.toLocaleString()} records)
            </span>
          </div>
          {selectedStage.anomalyCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D66F14] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              <AlertCircle size={12} />
              {selectedStage.anomalyCount} quarantined events
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#064C1C] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 size={12} />
              Zero illegal state skips
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-[#334139]/80 leading-relaxed">
          {selectedStage.notes}
        </p>
      </div>
    </div>
  );
}

