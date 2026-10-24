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
import type { StateFlowStage } from '../types';
import { AXIS_TICK, CHART_COLORS, ChartLegend, ChartTooltipCard } from './chartTheme';

interface StateFlowFunnelGraphProps {
  stages: StateFlowStage[];
}

/** Time spent in each stage (terminal stage excluded) — where orders wait. */
export function StateFlowFunnelGraph({ stages }: StateFlowFunnelGraphProps) {
  const rows = stages.slice(0, -1).map((s) => ({
    ...s,
    color: s.status === 'bottleneck' ? CHART_COLORS.accent : CHART_COLORS.primary,
  }));

  return (
    <div className="space-y-3">
      <ChartLegend
        items={[
          { label: 'Avg. wait per stage', color: CHART_COLORS.primary },
          { label: 'Bottleneck', color: CHART_COLORS.accent },
        ]}
      />
      <div className="h-[300px] w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={280}
          minHeight={240}
          initialDimension={{ width: 600, height: 300 }}
        >
          <BarChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 4 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} />
            <YAxis
              tickFormatter={(v: number) => `${v}m`}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: 'rgba(51,65,57,0.05)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const s = payload[0].payload as (typeof rows)[number];
                return (
                  <ChartTooltipCard
                    title={s.name}
                    rows={[
                      { label: 'Avg. wait', value: `${s.avgDwellMinutes} min`, color: s.color },
                      { label: 'Orders', value: s.count.toLocaleString() },
                      { label: 'Flagged', value: s.anomalyCount.toLocaleString() },
                    ]}
                    footer={s.notes}
                  />
                );
              }}
            />
            <Bar dataKey="avgDwellMinutes" radius={[6, 6, 0, 0]} maxBarSize={72}>
              {rows.map((r) => (
                <Cell key={r.id} fill={r.color} />
              ))}
              <LabelList
                dataKey="avgDwellMinutes"
                position="top"
                offset={8}
                formatter={(v: unknown) => `${v}m`}
                style={{ fontSize: 13, fontWeight: 600, fill: CHART_COLORS.ink }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
