interface LinePoint {
  x: string;
  y: number;
  series?: string;
  formatted?: string;
}

interface TrendLineGraphProps {
  data: LinePoint[];
  color?: string;
  height?: number;
}

export function TrendLineGraph({
  data,
  color = "#064C1C",
  height = 180,
}: TrendLineGraphProps) {
  if (data.length === 0) return null;

  const width = 500;
  const paddingX = 40;
  const paddingY = 25;

  const minY = Math.min(...data.map((d) => d.y));
  const maxY = Math.max(...data.map((d) => d.y));
  const yRange = maxY - minY || 1;

  const points = data.map((d, idx) => {
    const x =
      paddingX + (idx / Math.max(data.length - 1, 1)) * (width - 2 * paddingX);
    const y =
      height - paddingY - ((d.y - minY) / yRange) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="w-full overflow-x-auto py-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[220px]"
        aria-label="Trend line visualization"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Baseline grid line */}
        <line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          stroke="#334139"
          strokeOpacity="0.15"
          strokeWidth="1"
        />

        {/* Area fill */}
        <path d={areaD} fill="url(#trendGradient)" />

        {/* Trend stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points & X-labels */}
        {points.map((p, idx) => (
          <g key={p.x + idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#FDFFFC"
              stroke={color}
              strokeWidth="2"
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>{`${p.x}: ${p.formatted || p.y.toLocaleString()}`}</title>
            </circle>

            {/* Label on every few points or first & last */}
            {(idx === 0 ||
              idx === points.length - 1 ||
              idx === Math.floor(points.length / 2)) && (
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fontFamily="monospace"
                fill="#334139"
                opacity="0.65"
              >
                {p.x}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
