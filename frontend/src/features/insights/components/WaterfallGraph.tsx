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
import type { WaterfallBarItem } from '../types';
import { AXIS_TICK, CHART_COLORS, ChartLegend, ChartTooltipCard } from './chartTheme';

interface WaterfallGraphProps {
  data: WaterfallBarItem[];
}

export function WaterfallGraph({ data }: WaterfallGraphProps) {
  let running = 0;
  const rows = data.map((item) => {
    let offset = 0;
    let value = item.amount;
    if (item.type === 'base') {
      running = item.amount;
    } else if (item.type === 'total') {
      value = item.amount;
    } else {
      running += item.amount;
      offset = item.amount < 0 ? running : running - item.amount;
      value = Math.abs(item.amount);
    }
    const color =
      item.type === 'deduction'
        ? CHART_COLORS.accent
        : item.type === 'total'
          ? CHART_COLORS.primary
          : CHART_COLORS.ink;
    return { ...item, offset, value, color };
  });

  return (
    <div className="space-y-3">
      <ChartLegend
        items={[
          { label: 'Gross', color: CHART_COLORS.ink },
          { label: 'Deductions', color: CHART_COLORS.accent },
          { label: 'Net', color: CHART_COLORS.primary },
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
          <BarChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 4 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} />
            <YAxis
              domain={[1100000, 1260000]}
              ticks={[1100000, 1150000, 1200000, 1250000]}
              tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(2)}M`}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={64}
              allowDataOverflow
            />
            <Tooltip
              cursor={{ fill: 'rgba(51,65,57,0.05)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as (typeof rows)[number];
                return (
                  <ChartTooltipCard
                    title={item.label}
                    rows={[
                      { label: 'Amount', value: item.formatted, color: item.color },
                      ...(item.driftPct ? [{ label: 'Share of gross', value: item.driftPct }] : []),
                    ]}
                    footer={item.note}
                  />
                );
              }}
            />
            <Bar dataKey="offset" stackId="w" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="value" stackId="w" radius={[6, 6, 0, 0]} maxBarSize={72}>
              {rows.map((r) => (
                <Cell key={r.id} fill={r.color} />
              ))}
              <LabelList
                dataKey="formatted"
                position="top"
                offset={8}
                style={{ fontSize: 13, fontWeight: 600, fill: CHART_COLORS.ink }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
