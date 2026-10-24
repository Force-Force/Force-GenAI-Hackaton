import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Sparkles,
  Check,
  Copy,
  BarChart3,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  CHART_COLORS,
  AXIS_TICK,
  ChartLegend,
  ChartTooltipCard,
} from "../../features/insights/components/chartTheme";

interface TokenItem {
  token: string;
  variable: string;
  hex: string;
  rgba?: string;
  usage: string;
  category: "series" | "accent" | "baseline" | "chrome" | "fill";
}

const INSIGHT_COLOR_TOKENS: TokenItem[] = [
  {
    token: "Primary Data Series",
    variable: "CHART_COLORS.primary",
    hex: "#064C1C",
    usage:
      "Main KPI bars, primary revenue streams, completed retention flows, and core volume metrics.",
    category: "series",
  },
  {
    token: "Accent & Bottlenecks",
    variable: "CHART_COLORS.accent",
    hex: "#D66F14",
    usage:
      "Funnel drop-offs, anomaly spikes, negative variances, and critical attention areas.",
    category: "accent",
  },
  {
    token: "Muted Benchmark",
    variable: "CHART_COLORS.muted",
    hex: "#94A3B8",
    usage:
      "Target baselines, prior period reference lines, and secondary comparison bars.",
    category: "baseline",
  },
  {
    token: "Ink / High Emphasis",
    variable: "CHART_COLORS.ink",
    hex: "#1E2D24",
    usage:
      "Chart titles, summary KPI figures, card headlines, and primary values.",
    category: "chrome",
  },
  {
    token: "Body & Axis Text",
    variable: "CHART_COLORS.text",
    hex: "#334139",
    usage:
      "Axis tick labels, card descriptions, legend items, and supporting analytical copy.",
    category: "chrome",
  },
  {
    token: "Confidence Band",
    variable: "CHART_COLORS.band",
    hex: "#064C1C",
    rgba: "rgba(6, 76, 28, 0.10)",
    usage:
      "Shaded expected-range areas, forecast intervals, and ribbon variance envelopes.",
    category: "fill",
  },
  {
    token: "Cartesian Gridlines",
    variable: "CHART_COLORS.grid",
    hex: "#334139",
    rgba: "rgba(51, 65, 57, 0.10)",
    usage: "Subtle horizontal chart guides and coordinate axes dividers.",
    category: "fill",
  },
];

const PREVIEW_DATA = [
  { month: "May", actual: 420, target: 380, variance: "+10.5%" },
  { month: "Jun", actual: 510, target: 440, variance: "+15.9%" },
  { month: "Jul", actual: 480, target: 460, variance: "+4.3%" },
  { month: "Aug", actual: 620, target: 500, variance: "+24.0%" },
  { month: "Sep", actual: 580, target: 520, variance: "+11.5%" },
  { month: "Oct", actual: 740, target: 560, variance: "+32.1%" },
];

export function InsightsTokensSection() {
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedVar(text);
    setTimeout(() => setCopiedVar(null), 1800);
  };

  return (
    <section
      id="insights-tokens"
      className="space-y-6 pt-8 border-t border-slate-200"
    >
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Sparkles size={14} className="text-[#D66F14]" />
          <span>08 · Insights & Data Visualization</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#1E2D24] mt-1">
          Dynamic Insight & Chart Design Tokens
        </h2>
        <p className="text-sm text-slate-600 max-w-3xl mt-1 leading-relaxed">
          Standardized visual tokens powering the dynamic AI insight dashboard.
          Built to ensure clean contrast, unified chart palettes, and clear
          numerical hierarchy without visual clutter.
        </p>
      </div>

      {/* 1. Chart Color Palette Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <BarChart3 size={13} /> Chart Color System
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {INSIGHT_COLOR_TOKENS.map((item) => (
            <div
              key={item.variable}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 border border-slate-200/80 shadow-2xs"
                    style={{ backgroundColor: item.rgba || item.hex }}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#1E2D24]">
                      {item.token}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.variable)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#064C1C] cursor-pointer mt-0.5"
                      title="Click to copy code variable"
                    >
                      <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700">
                        {item.variable}
                      </code>
                      {copiedVar === item.variable ? (
                        <Check size={11} className="text-[#064C1C]" />
                      ) : (
                        <Copy size={11} className="opacity-60" />
                      )}
                    </button>
                  </div>
                </div>

                <code className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {item.rgba ? "rgba(...)" : item.hex}
                </code>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">
                {item.usage}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Typography & Tabular Figures System */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1E2D24] flex items-center gap-2">
              <TrendingUp size={16} className="text-[#064C1C]" />
              Typography & Numerical Standards
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict typography hierarchy ensures clear legibility for
              executives and business users.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#064C1C]/10 text-[#064C1C]">
            Design Standard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="rounded-xl border border-slate-100 bg-[#FDFFFC] p-4 space-y-2">
            <div className="text-xs font-bold text-[#1E2D24]">
              1. Main Interface Font
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              Use{" "}
              <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                var(--font-sans)
              </code>{" "}
              (Google Sans / Google Sans Text) for all labels, titles, chart
              axes, tooltips, and badges.
            </div>
            <div className="text-sm font-bold text-[#1E2D24] pt-1">
              Net Revenue Performance
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-[#FDFFFC] p-4 space-y-2">
            <div className="text-xs font-bold text-[#1E2D24]">
              2. Tabular Numbers
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              Always pair numeric KPI metrics with{" "}
              <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                tabular-nums
              </code>
              . Digits occupy equal width so numbers never jitter or misalign.
            </div>
            <div className="text-xl font-bold text-[#064C1C] tabular-nums tracking-tight pt-1">
              $1,420,500{" "}
              <span className="text-xs font-semibold text-slate-500">
                (+18.4%)
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-[#FDFFFC] p-4 space-y-2">
            <div className="text-xs font-bold text-[#1E2D24]">
              3. Monospace Moderation
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              Use{" "}
              <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                var(--font-mono)
              </code>{" "}
              moderately and strictly on code sections (SQL, DDL, syntax
              blocks). Never on ordinary UI labels.
            </div>
            <div className="pt-1">
              <code className="font-mono text-[11px] bg-slate-100 px-2 py-1 rounded border border-slate-200 text-[#064C1C] block truncate">
                SELECT net_arr FROM kpi_marts
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Interactive Recharts & Tooltip Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#1E2D24]">
              Live Component Preview: Standardized Insight Chart
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive demonstration of the unified chart tokens, legends,
              and tooltip cards in action.
            </p>
          </div>

          <ChartLegend
            items={[
              { label: "Net Revenue ($k)", color: CHART_COLORS.primary },
              {
                label: "Target Baseline ($k)",
                color: CHART_COLORS.muted,
                dashed: true,
              },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Chart Canvas */}
          <div className="lg:col-span-2 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={PREVIEW_DATA}
                margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={CHART_COLORS.grid}
                />
                <XAxis
                  dataKey="month"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: CHART_COLORS.grid }}
                />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: number) => `$${val}k`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(51, 65, 57, 0.05)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as (typeof PREVIEW_DATA)[0];
                    return (
                      <ChartTooltipCard
                        title={`${item.month} Performance`}
                        rows={[
                          {
                            label: "Actual Revenue",
                            value: `$${item.actual}k`,
                            color: CHART_COLORS.primary,
                          },
                          {
                            label: "Target Baseline",
                            value: `$${item.target}k`,
                            color: CHART_COLORS.muted,
                          },
                        ]}
                        footer={`Variance: ${item.variance} ahead of target`}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="actual"
                  fill={CHART_COLORS.primary}
                  radius={[6, 6, 0, 0]}
                  name="Actual Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tooltip Card & Container Token Rationale */}
          <div className="space-y-4 rounded-xl border border-slate-100 bg-[#FDFFFC] p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E2D24]">
              <Info size={14} className="text-[#064C1C]" />
              <span>Container & Surface Hierarchy</span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <div>
                <strong className="text-[#1E2D24]">Insight Card:</strong>{" "}
                <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                  rounded-2xl border border-[#334139]/15 bg-white p-6 shadow-2xs
                </code>
              </div>
              <div>
                <strong className="text-[#1E2D24]">Metric Tile:</strong>{" "}
                <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                  rounded-xl border border-[#334139]/10 bg-[#FDFFFC] p-3.5
                </code>
              </div>
              <div>
                <strong className="text-[#1E2D24]">Tooltip Popover:</strong>{" "}
                <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                  rounded-xl border border-[#334139]/15 bg-white shadow-lg
                </code>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">
                Static Tooltip Preview:
              </span>
              <div className="mt-2">
                <ChartTooltipCard
                  title="October Performance"
                  rows={[
                    {
                      label: "Actual Revenue",
                      value: "$740k",
                      color: CHART_COLORS.primary,
                    },
                    {
                      label: "Target Baseline",
                      value: "$560k",
                      color: CHART_COLORS.muted,
                    },
                  ]}
                  footer="Variance: +32.1% ahead of target"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Code Implementation Example (Appropriate use of font-mono) */}
      <div className="bg-[#1E2D24] text-[#FDFFFC] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Developer Reference · Code Section
          </div>
          <button
            type="button"
            onClick={() =>
              handleCopy(
                `import { CHART_COLORS, AXIS_TICK, ChartLegend, ChartTooltipCard } from '@/features/insights/components/chartTheme';`,
              )
            }
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <Copy size={12} />
            <span>Copy Import</span>
          </button>
        </div>

        <pre className="font-mono text-xs overflow-x-auto p-3.5 rounded-xl bg-black/30 border border-white/10 text-emerald-200 leading-relaxed">
          {`// 1. Import shared tokens from chartTheme
import {
  CHART_COLORS,
  AXIS_TICK,
  ChartLegend,
  ChartTooltipCard,
} from '@/features/insights/components/chartTheme';

// 2. Consume tokens in any Recharts component
<CartesianGrid stroke={CHART_COLORS.grid} />
<XAxis tick={AXIS_TICK} />
<Bar dataKey="value" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />`}
        </pre>
      </div>
    </section>
  );
}
