import type { ReactNode } from 'react';

/** Shared palette + helpers so every insight chart looks like one family. */
export const CHART_COLORS = {
  ink: '#1E2D24',
  text: '#334139',
  primary: '#064C1C',
  accent: '#D66F14',
  muted: '#94A3B8',
  grid: 'rgba(51, 65, 57, 0.10)',
  band: 'rgba(6, 76, 28, 0.10)',
} as const;

export const AXIS_TICK = { fontSize: 12, fill: CHART_COLORS.text } as const;

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#334139]/80">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span
            className="inline-block w-3.5 h-0.5 rounded-full"
            style={{
              backgroundColor: item.dashed ? 'transparent' : item.color,
              borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartTooltipCard({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: { label: string; value: ReactNode; color?: string }[];
  footer?: ReactNode;
}) {
  return (
    <div className="min-w-[180px] rounded-xl border border-[#334139]/15 bg-white px-3.5 py-2.5 text-sm shadow-lg">
      <div className="font-semibold text-[#1E2D24] pb-1.5 mb-1.5 border-b border-[#334139]/10">
        {title}
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-[#334139]/75">
              {row.color && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
              )}
              {row.label}
            </span>
            <span className="font-semibold tabular-nums text-[#1E2D24]">{row.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 pt-1.5 border-t border-[#334139]/10 text-[#334139]/70">{footer}</div>}
    </div>
  );
}

