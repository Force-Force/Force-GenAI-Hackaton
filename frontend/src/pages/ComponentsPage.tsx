import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Palette,
  Sparkles,
  Layers,
  Box,
} from "lucide-react";
import { navigateTo } from "../utils/navigation";
import {
  ButtonsSection,
  TypographySection,
  IconsSection,
  ColorsSection,
  SizesSection,
  DropdownsSection,
  LoadersSection,
  InsightsTokensSection,
} from "./components/DesignSections";
interface PaletteColor {
  hex: string;
  name: string;
  role: string;
  textColor: string;
  borderColor?: string;
  description: string;
}

const PALETTE: PaletteColor[] = [
  {
    hex: "#FDFFFC",
    name: "Porcelain",
    role: "Primary Surface / Canvas Background",
    textColor: "#1E2D24",
    borderColor: "#e2e8f0",
    description:
      "Clean, warm high-contrast background and text contrast surface.",
  },
  {
    hex: "#334139",
    name: "Charcoal Brown",
    role: "Secondary Card & Container Surface",
    textColor: "#FDFFFC",
    description:
      "Muted dark earthy tone for sidebar elements and secondary surfaces.",
  },
  {
    hex: "#1E2D24",
    name: "Evergreen",
    role: "Dominant Dark Chrome & Typography",
    textColor: "#FDFFFC",
    description:
      "Deep, rich evergreen for high-contrast headers, top bars, and solid text.",
  },
  {
    hex: "#D66F14",
    name: "Cinnamon",
    role: "Primary Accent & Agent Highlights",
    textColor: "#FDFFFC",
    description:
      "Vibrant warm spice accent for agent action cards, status badges, and interactive alerts.",
  },
  {
    hex: "#064C1C",
    name: "Black Forest",
    role: "Brand Signature & Primary CTA",
    textColor: "#FDFFFC",
    description:
      "Commanding dark forest green for key CTA buttons, active pipeline states, and headers.",
  },
];

export function ComponentsPage() {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopy = (hex: string) => {
    void navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1E2D24] font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Back to Pipeline Workspace"
          >
            <ArrowLeft size={14} />
            <span>Back to Workspace</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-[#064C1C]" />
            <h1 className="text-sm font-bold tracking-tight text-slate-900">
              Agent-First Design System • Components Route
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <code className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-50 text-[#064C1C] border border-emerald-200 font-semibold">
            /components
          </code>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Intro */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Sparkles size={14} className="text-[#D66F14]" />
            <span>Agent-First Interface Palette</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Core Color System
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
            The fundamental palette required for the new agent-first interface
            architecture. Below are the full color rectangles and their design
            tokens.
          </p>
        </div>

        {/* 1. Full-Width Linear Palette Strip */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers size={13} /> Continuous Palette Strip
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-32 md:h-40">
            {PALETTE.map((color) => (
              <button
                key={color.hex}
                onClick={() => handleCopy(color.hex)}
                style={{ backgroundColor: color.hex, color: color.textColor }}
                className="relative flex flex-col justify-between p-4 text-left transition-transform hover:scale-[1.02] hover:z-10 cursor-pointer focus:outline-none group font-sans"
                aria-label={`Copy color ${color.hex}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-90 font-sans">
                    {color.name.split("/")[0].trim()}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/20 text-white">
                    {copiedHex === color.hex ? (
                      <Check size={12} />
                    ) : (
                      <Copy size={12} />
                    )}
                  </span>
                </div>
                <div>
                  <code className="text-base font-mono font-bold tracking-tight block">
                    {color.hex}
                  </code>
                  <div className="text-[11px] opacity-80 font-sans">
                    {copiedHex === color.hex ? "Copied!" : "Click to copy"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Detailed Rectangles / Swatch Cards */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Box size={13} /> Individual Color Rectangles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PALETTE.map((color) => (
              <div
                key={color.hex}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm hover:shadow transition-shadow"
              >
                {/* Visual Color Rectangle */}
                <div
                  className="h-36 w-full relative flex items-center justify-center p-3 transition-all"
                  style={{
                    backgroundColor: color.hex,
                    borderBottom: color.borderColor
                      ? `1px solid ${color.borderColor}`
                      : "none",
                  }}
                >
                  <button
                    onClick={() => handleCopy(color.hex)}
                    style={{ color: color.textColor }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/15 hover:bg-black/25 backdrop-blur-sm text-xs font-bold transition-all cursor-pointer"
                    aria-label={`Copy ${color.hex}`}
                  >
                    {copiedHex === color.hex ? (
                      <Check size={13} />
                    ) : (
                      <Copy size={13} />
                    )}
                    <code className="font-mono text-xs">{color.hex}</code>
                  </button>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2 font-sans">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {color.name}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                      {color.role}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    {color.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Agent-First Interface Component Composition Mockup */}
        <section className="space-y-4 pt-4 border-t border-slate-200">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Preview Application
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
              Agent-First Layout Composition
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Demonstrating how Porcelain (#FDFFFC), Charcoal Brown (#334139),
              Evergreen (#1E2D24), Cinnamon (#D66F14), and Black Forest
              (#064C1C) harmonize in the new interface.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-lg bg-[#FDFFFC]">
            {/* Top Bar in #1E2D24 */}
            <div
              style={{ backgroundColor: "#1E2D24" }}
              className="px-5 py-3 flex items-center justify-between text-[#FDFFFC]"
            >
              <div className="flex items-center gap-2.5">
                <div
                  style={{ backgroundColor: "#064C1C" }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner font-sans"
                >
                  AI
                </div>
                <span className="font-bold text-sm tracking-tight font-sans">
                  AuraBI Autonomous Agent
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: "#D66F14" }}
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white uppercase tracking-wider font-sans"
                >
                  Analysis Complete
                </span>
                <span className="text-xs opacity-75 font-sans font-medium">
                  AI Insights Live
                </span>
              </div>
            </div>

            {/* Split layout preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 min-h-[260px]">
              {/* Agent reasoning stream in #334139 */}
              <div
                style={{ backgroundColor: "#334139" }}
                className="p-5 text-[#FDFFFC] space-y-3 border-r border-[#1E2D24]/30"
              >
                <div className="text-[11px] uppercase tracking-wider opacity-80 font-bold font-sans">
                  Active Business Insights
                </div>
                <div className="text-xs font-medium leading-relaxed font-sans text-slate-200">
                  Evaluating quarterly sales, checkout conversion drop-off, and
                  customer retention dynamics.
                </div>
                <div
                  style={{ backgroundColor: "#1E2D24" }}
                  className="p-3 rounded-lg text-xs space-y-2 border border-white/10 font-sans"
                >
                  <div className="text-[#D66F14] font-semibold">
                    ▸ 1. Net revenue waterfall: +$340k expansion identified
                  </div>
                  <div className="text-white/90">
                    ▸ 2. Checkout drop-off: 42% bottleneck in mobile cart stage
                  </div>
                  <div className="text-emerald-400">
                    ▸ 3. Cohort retention: Q3 active renewal rate stabilized at
                    68%
                  </div>
                </div>
              </div>

              {/* Main workspace surface in #FDFFFC */}
              <div className="md:col-span-2 p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#064C1C]/10 text-[#064C1C] mb-2 font-sans">
                    <Sparkles size={12} /> Ready for Review
                  </div>
                  <h4 className="text-base font-bold text-[#1E2D24] font-sans">
                    Dynamic Dashboards Proposed by AI
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">
                    The AI evaluated your quarterly business metrics and
                    recommended 4 dynamic visualizations tailored to investigate
                    underlying trends rather than standard static charts.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-200 font-sans">
                  <button
                    onClick={() => navigateTo("/insights")}
                    style={{ backgroundColor: "#064C1C", color: "#FDFFFC" }}
                    className="px-5 py-2 rounded-full text-xs font-bold transition-opacity hover:opacity-95 cursor-pointer"
                  >
                    Review Key Insights
                  </button>
                  <button
                    onClick={() => navigateTo("/insights")}
                    style={{ backgroundColor: "#D66F14", color: "#FDFFFC" }}
                    className="px-5 py-2 rounded-full text-xs font-bold transition-opacity hover:opacity-95 cursor-pointer"
                  >
                    Customize KPI Focus
                  </button>
                  <button
                    onClick={() => navigateTo("/insights")}
                    className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Explore Full Dashboard →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. New Insights & Chart Design Tokens Section */}
        <InsightsTokensSection />

        <LoadersSection />
        <ButtonsSection />
        <TypographySection />
        <IconsSection />
        <ColorsSection />
        <SizesSection />
        <DropdownsSection />
      </main>
    </div>
  );
}
