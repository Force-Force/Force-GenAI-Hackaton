import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import type { AnomalyPoint } from '../types';
import { AXIS_TICK, CHART_COLORS, ChartLegend, ChartTooltipCard } from './chartTheme';

interface AnomalyRibbonGraphProps {
  data: AnomalyPoint[];
}

const fmtK = (v: number) => `$${(v / 1000).toFixed(0)}K`;

export function AnomalyRibbonGraph({ data }: AnomalyRibbonGraphProps) {
  const rows = data.map((d) => ({
    ...d,
    base: d.expectedLower,
    band: d.expectedUpper - d.expectedLower,
  }));
  const outlier = data.find((d) => d.isAnomaly);

  return (
    <div className="space-y-3">
      <ChartLegend
        items={[
          { label: 'Daily sales', color: CHART_COLORS.primary },
          { label: 'Expected range', color: 'rgba(6,76,28,0.25)' },
          { label: 'Outlier', color: '#e11d48' },
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
          <ComposedChart data={rows} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis
              domain={[20000, 100000]}
              ticks={[20000, 40000, 60000, 80000, 100000]}
              tickFormatter={fmtK}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              cursor={{ stroke: CHART_COLORS.text, strokeOpacity: 0.2 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof rows)[number];
                return (
                  <ChartTooltipCard
                    title={p.date}
                    rows={[
                      { label: 'Sales', value: `$${p.actual.toLocaleString()}`, color: CHART_COLORS.primary },
                      { label: 'Expected', value: `${fmtK(p.expectedLower)} – ${fmtK(p.expectedUpper)}` },
                    ]}
                    footer={p.isAnomaly ? p.anomalyCause : undefined}
                  />
                );
              }}
            />
            <Area dataKey="base" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area dataKey="band" stackId="b" stroke="none" fill={CHART_COLORS.band} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={CHART_COLORS.primary}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
            {outlier && (
              <ReferenceDot
                x={outlier.date}
                y={outlier.actual}
                r={7}
                fill="#e11d48"
                stroke="#fff"
                strokeWidth={2.5}
                label={{
                  value: fmtK(outlier.actual),
                  position: 'top',
                  fill: '#e11d48',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
