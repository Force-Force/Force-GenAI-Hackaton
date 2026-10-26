interface BarItem {
  category: string;
  value: number;
  formatted?: string;
  secondaryValue?: number;
  target?: number;
}

interface CategoricalBarGraphProps {
  data: BarItem[];
  color?: string;
}

export function CategoricalBarGraph({
  data,
  color = "#064C1C",
}: CategoricalBarGraphProps) {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.value, d.target || 0)),
    1,
  );

  return (
    <div className="space-y-3 py-2">
      {data.map((item) => {
        const pct = Math.min(100, Math.max(4, (item.value / maxValue) * 100));
        const targetPct = item.target
          ? Math.min(100, (item.target / maxValue) * 100)
          : null;

        return (
          <div key={item.category} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-[#1E2D24] truncate max-w-[200px]">
                {item.category}
              </span>
              <span className="font-mono tabular-nums text-[#334139] font-bold">
                {item.formatted || item.value.toLocaleString()}
                {item.target && (
                  <span className="text-[10px] text-[#334139]/50 font-normal ml-1.5">
                    (Target: {item.target.toLocaleString()})
                  </span>
                )}
              </span>
            </div>

            <div className="relative h-6 bg-[#334139]/8 rounded-lg overflow-hidden flex items-center">
              {/* Primary Bar */}
              <div
                className="h-full rounded-lg transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                }}
              />

              {/* Target Marker */}
              {targetPct !== null && (
                <div
                  title={`Target: ${item.target?.toLocaleString()}`}
                  className="absolute top-0 bottom-0 w-0.5 bg-[#D66F14] z-10"
                  style={{ left: `${targetPct}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
