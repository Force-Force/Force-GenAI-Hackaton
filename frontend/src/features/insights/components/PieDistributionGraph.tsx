import { useState } from "react";

interface PieSlice {
  label: string;
  value: number;
  sharePct: number;
  formatted?: string;
}

interface PieDistributionGraphProps {
  data: PieSlice[];
  size?: number;
}

const PALETTE = [
  "#064C1C",
  "#D66F14",
  "#334139",
  "#1E2D24",
  "#2E6930",
  "#E58A38",
  "#4F6357",
];

export function PieDistributionGraph({
  data,
  size = 260,
}: PieDistributionGraphProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return null;

  const radius = size / 2;
  const innerRadius = radius * 0.58; // Donut hole
  let cumulativeAngle = -Math.PI / 2; // Start from top 12 o'clock

  const slices = data.map((item, idx) => {
    const angle = (item.value / total) * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);

    const ix1 = radius + innerRadius * Math.cos(endAngle);
    const iy1 = radius + innerRadius * Math.sin(endAngle);
    const ix2 = radius + innerRadius * Math.cos(startAngle);
    const iy2 = radius + innerRadius * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;
    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");

    const color = PALETTE[idx % PALETTE.length];
    return {
      ...item,
      pathData,
      color,
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : slices[0];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
      {/* SVG Donut Chart */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice, idx) => (
            <path
              key={slice.label}
              d={slice.pathData}
              fill={slice.color}
              className="transition-all duration-200 cursor-pointer hover:opacity-85"
              style={{
                transformOrigin: `${radius}px ${radius}px`,
                transform: hoveredIdx === idx ? "scale(1.03)" : "scale(1)",
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* Donut Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-[11px] font-mono text-[#334139]/70 font-semibold truncate max-w-[120px]">
            {activeItem?.label}
          </span>
          <span className="text-xl font-bold tabular-nums text-[#1E2D24]">
            {activeItem?.sharePct.toFixed(1)}%
          </span>
          <span className="text-[10px] font-mono text-[#334139]/50">
            {activeItem?.formatted || activeItem?.value.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Legend & Breakdown */}
      <ul className="flex-1 space-y-2 w-full">
        {slices.map((slice, idx) => (
          <li
            key={slice.label}
            className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer text-xs ${
              hoveredIdx === idx ? "bg-[#334139]/8" : "hover:bg-[#334139]/4"
            }`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: slice.color }}
              />
              <span className="font-semibold text-[#1E2D24] truncate">
                {slice.label}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 tabular-nums font-mono">
              <span className="text-[#334139]/65">
                {slice.formatted || slice.value.toLocaleString()}
              </span>
              <span className="font-bold text-[#064C1C] min-w-[44px] text-right">
                {slice.sharePct.toFixed(1)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
