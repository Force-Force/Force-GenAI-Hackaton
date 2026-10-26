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
import type { CohortPoint } from '../types';
import { AXIS_TICK, CHART_COLORS, ChartLegend, ChartTooltipCard } from './chartTheme';

interface CohortDecayGraphProps {
  data: CohortPoint[];
}

export function CohortDecayGraph({ data }: CohortDecayGraphProps) {
  return (
    <div className="space-y-3">
      <ChartLegend
        items={[
          { label: 'Enterprise', color: CHART_COLORS.primary },
          { label: 'Self-serve', color: CHART_COLORS.accent },
          { label: 'Marketplace', color: CHART_COLORS.muted, dashed: true },
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
          <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis
              domain={[40, 120]}
              ticks={[40, 60, 80, 100, 120]}
              tickFormatter={(v: number) => `${v}%`}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <ReferenceLine y={100} stroke={CHART_COLORS.text} strokeOpacity={0.35} strokeDasharray="4 4" />
            <Tooltip
              cursor={{ stroke: CHART_COLORS.text, strokeOpacity: 0.2 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as CohortPoint;
                return (
                  <ChartTooltipCard
                    title={String(label)}
                    rows={[
                      { label: 'Enterprise', value: `${p.cohortA}%`, color: CHART_COLORS.primary },
                      { label: 'Self-serve', value: `${p.cohortB}%`, color: CHART_COLORS.accent },
                      { label: 'Marketplace', value: `${p.cohortC}%`, color: CHART_COLORS.muted },
                    ]}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="cohortA"
              stroke={CHART_COLORS.primary}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="cohortB"
              stroke={CHART_COLORS.accent}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="cohortC"
              stroke={CHART_COLORS.muted}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
