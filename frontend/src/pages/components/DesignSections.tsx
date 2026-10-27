import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Bot,
  Database,
  Workflow,
  ShieldCheck,
  FileCode2,
  Play,
  Plus,
  Settings,
  Sparkles,
  Search,
  Bell,
  Trash2,
  Layers,
  Filter,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownArrow,
  Select,
  Dropdown,
  AuraLoader,
  type SelectOption,
  type DropdownItem,
  type AuraLoaderSize,
  type AuraLoaderVariant,
} from "../../components/ui";
import { cn } from "../../utils/cn";
export { InsightsTokensSection } from "./InsightsTokensSection";

/** Brand tokens (single source of truth for this page). */
export const C = {
  porcelain: "#FDFFFC",
  charcoalBrown: "#334139",
  evergreen: "#1E2D24",
  cinnamon: "#D66F14",
  blackForest: "#064C1C",
  // Backward-compatible aliases
  light: "#FDFFFC",
  sage: "#334139",
  amber: "#D66F14",
  pine: "#064C1C",
} as const;

export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-5 pt-8 border-t border-slate-200">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold font-sans">
          {eyebrow}
        </div>
        <h2
          className="text-xl font-bold tracking-tight font-sans"
          style={{ color: C.evergreen }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-sans">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons: five types                                                 */
/* ------------------------------------------------------------------ */
interface ButtonType {
  id: string;
  name: string;
  use: string;
  base: CSSProperties;
  hover: string;
}

const BUTTON_TYPES: ButtonType[] = [
  {
    id: "A",
    name: "Black Forest",
    use: "Primary action",
    base: {
      background: C.blackForest,
      color: C.porcelain,
      border: `1px solid ${C.blackForest}`,
    },
    hover: "hover:brightness-110",
  },
  {
    id: "B",
    name: "Cinnamon",
    use: "Agent / highlight action",
    base: {
      background: C.cinnamon,
      color: C.porcelain,
      border: `1px solid ${C.cinnamon}`,
    },
    hover: "hover:brightness-110",
  },
  {
    id: "C",
    name: "Evergreen",
    use: "Strong neutral action",
    base: {
      background: C.evergreen,
      color: C.porcelain,
      border: `1px solid ${C.evergreen}`,
    },
    hover: "hover:bg-[#334139]",
  },
  {
    id: "D",
    name: "Outline (Black Forest)",
    use: "Secondary action",
    base: {
      background: "transparent",
      color: C.blackForest,
      border: `1.5px solid ${C.blackForest}`,
    },
    hover: "hover:bg-[#064C1C]/10",
  },
  {
    id: "E",
    name: "Ghost (Charcoal Brown)",
    use: "Tertiary / toolbar action",
    base: {
      background: "transparent",
      color: C.charcoalBrown,
      border: "1px solid transparent",
    },
    hover: "hover:bg-[#334139]/10",
  },
];

const BTN_SIZES = [
  { key: "sm", cls: "px-3 py-1 text-[11px] gap-1.5", icon: 12 },
  { key: "md", cls: "px-4 py-2 text-xs gap-1.5", icon: 14 },
  { key: "lg", cls: "px-5.5 py-2.5 text-sm gap-2", icon: 16 },
] as const;

function Btn({
  type,
  size = "md",
  icon: Icon,
  children,
  disabled,
  onDark,
  shape = "pill",
}: {
  type: ButtonType;
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  children: ReactNode;
  disabled?: boolean;
  onDark?: boolean;
  shape?: "pill" | "rounded";
}) {
  const s = BTN_SIZES.find((x) => x.key === size)!;
  const radius = shape === "pill" ? "rounded-full" : "rounded-lg";
  // On dark surfaces, flip outline/ghost to the light colour for contrast.
  const style: CSSProperties =
    onDark && (type.id === "D" || type.id === "E")
      ? {
          ...type.base,
          color: C.light,
          borderColor: type.id === "D" ? C.light : "transparent",
        }
      : type.base;
  return (
    <button
      disabled={disabled}
      style={style}
      className={`inline-flex items-center justify-center ${radius} font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${s.cls} ${type.hover}`}
    >
      {Icon && <Icon size={s.icon} />}
      {children}
    </button>
  );
}

export function ButtonsSection() {
  const [shape, setShape] = useState<"pill" | "rounded">("pill");

  return (
    <Section
      id="buttons"
      eyebrow="01 · Buttons"
      title="Five button types — fully rounded (pill) preview"
    >
      {/* Interactive Shape Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
        <div>
          <div className="text-xs font-bold" style={{ color: C.evergreen }}>
            Corner Radius Style
          </div>
          <div className="text-[11px] text-slate-500">
            Currently showing:{" "}
            <span className="font-semibold text-[#064C1C]">
              {shape === "pill"
                ? "Fully Rounded (Pill / rounded-full)"
                : "Standard (rounded-lg / 8px)"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
          <button
            type="button"
            onClick={() => setShape("pill")}
            style={
              shape === "pill"
                ? { background: C.pine, color: C.light }
                : { color: C.evergreen }
            }
            className="px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            ● Fully Rounded (Pill)
          </button>
          <button
            type="button"
            onClick={() => setShape("rounded")}
            style={
              shape === "rounded"
                ? { background: C.pine, color: C.light }
                : { color: C.evergreen }
            }
            className="px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            Rounded (8px)
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {BUTTON_TYPES.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-1 lg:grid-cols-[200px_1fr_1fr] gap-4 items-center rounded-xl border border-slate-200 bg-white p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full font-sans"
                  style={{ background: C.evergreen, color: C.light }}
                >
                  {t.id}
                </span>
                <span
                  className="text-sm font-bold font-sans"
                  style={{ color: C.evergreen }}
                >
                  {t.name}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-sans">
                {t.use}
              </div>
            </div>

            {/* Light surface */}
            <div
              className="flex flex-wrap items-center gap-2 rounded-xl p-3 border border-slate-200"
              style={{ background: C.light }}
            >
              <Btn type={t} shape={shape}>
                Default
              </Btn>
              <Btn type={t} icon={Play} shape={shape}>
                With icon
              </Btn>
              <Btn type={t} disabled shape={shape}>
                Disabled
              </Btn>
            </div>

            {/* Dark surface */}
            <div
              className="flex flex-wrap items-center gap-2 rounded-xl p-3"
              style={{ background: C.evergreen }}
            >
              <Btn type={t} onDark shape={shape}>
                Default
              </Btn>
              <Btn type={t} icon={Play} onDark shape={shape}>
                With icon
              </Btn>
              <Btn type={t} disabled onDark shape={shape}>
                Disabled
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Headings & text                                                     */
/* ------------------------------------------------------------------ */
const HEADINGS = [
  {
    tag: "Display",
    cls: "text-5xl font-bold tracking-tight",
    spec: "48px / 700 / -0.025em",
  },
  {
    tag: "H1",
    cls: "text-3xl font-bold tracking-tight",
    spec: "30px / 700 / -0.025em",
  },
  {
    tag: "H2",
    cls: "text-2xl font-semibold tracking-tight",
    spec: "24px / 600",
  },
  { tag: "H3", cls: "text-xl font-semibold", spec: "20px / 600" },
  { tag: "H4", cls: "text-base font-semibold", spec: "16px / 600" },
];

const TEXTS = [
  {
    tag: "Body Large",
    cls: "text-base leading-relaxed font-sans",
    spec: "16px / 400 / 1.625",
  },
  {
    tag: "Body",
    cls: "text-sm leading-relaxed font-sans",
    spec: "14px / 400 / 1.625",
  },
  {
    tag: "Body Small",
    cls: "text-xs leading-relaxed font-sans",
    spec: "12px / 400 / 1.625",
  },
  {
    tag: "Caption",
    cls: "text-[11px] leading-snug opacity-70 font-sans",
    spec: "11px / 400 / 70% opacity",
  },
  {
    tag: "Code Snippet (Mono)",
    cls: "font-mono text-xs bg-black/10 px-2 py-0.5 rounded border border-current/15 inline-block",
    spec: "IBM Plex Mono 12px (Code sections only)",
  },
];

const SURFACES: { name: string; bg: string; fg: string; accent: string }[] = [
  {
    name: "On Porcelain #FDFFFC",
    bg: C.porcelain,
    fg: C.evergreen,
    accent: C.blackForest,
  },
  {
    name: "On Charcoal Brown #334139",
    bg: C.charcoalBrown,
    fg: C.porcelain,
    accent: C.cinnamon,
  },
  {
    name: "On Evergreen #1E2D24",
    bg: C.evergreen,
    fg: C.porcelain,
    accent: C.cinnamon,
  },
];

export function TypographySection() {
  return (
    <Section
      id="typography"
      eyebrow="02 · Headings & Text"
      title="Type scale on each surface"
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {SURFACES.map((s) => (
          <div
            key={s.name}
            className="rounded-xl border border-slate-200 p-5 space-y-4"
            style={{ background: s.bg, color: s.fg }}
          >
            <Label>{s.name}</Label>
            <div className="space-y-3">
              {HEADINGS.map((h, i) => (
                <div key={h.tag}>
                  <div
                    className={h.cls}
                    style={i === 0 ? { color: s.accent } : undefined}
                  >
                    {h.tag} heading
                  </div>
                  <div className="text-[11px] opacity-60 tabular-nums font-sans">
                    {h.spec}
                  </div>
                </div>
              ))}
            </div>
            <div className="h-px opacity-20" style={{ background: s.fg }} />
            <div className="space-y-3">
              {TEXTS.map((t) => (
                <div key={t.tag}>
                  <div className={t.cls}>
                    {t.tag} — The agent plans, you approve.
                  </div>
                  <div className="text-[11px] opacity-60 tabular-nums font-sans">
                    {t.spec}
                  </div>
                </div>
              ))}
              <a
                href="#typography"
                className="text-sm font-semibold underline underline-offset-2 font-sans"
                style={{ color: s.accent }}
              >
                Link text
              </a>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */
const ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Bot", Icon: Bot },
  { name: "Sparkles", Icon: Sparkles },
  { name: "Database", Icon: Database },
  { name: "Workflow", Icon: Workflow },
  { name: "ShieldCheck", Icon: ShieldCheck },
  { name: "FileCode2", Icon: FileCode2 },
  { name: "Play", Icon: Play },
  { name: "Plus", Icon: Plus },
  { name: "Search", Icon: Search },
  { name: "Bell", Icon: Bell },
  { name: "Settings", Icon: Settings },
  { name: "Trash2", Icon: Trash2 },
];

const ICON_COLORS = [
  { hex: C.light, bg: C.evergreen },
  { hex: C.sage, bg: C.light },
  { hex: C.evergreen, bg: C.light },
  { hex: C.amber, bg: C.light },
  { hex: C.pine, bg: C.light },
];

export function IconsSection() {
  return (
    <Section
      id="icons"
      eyebrow="03 · Icons"
      title="Icon set in every brand colour (Lucide)"
    >
      <div className="space-y-3">
        {ICON_COLORS.map((c) => (
          <div
            key={c.hex}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4"
            style={{ background: c.bg }}
          >
            <code
              className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-black/10 w-24 text-center"
              style={{ color: c.hex }}
            >
              {c.hex}
            </code>
            {ICONS.map(({ name, Icon }) => (
              <span key={name} title={name} style={{ color: c.hex }}>
                <Icon size={20} />
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Label>Icon tiles</Label>
      </div>
      <div className="flex flex-wrap gap-3">
        {[
          { bg: C.pine, fg: C.light, Icon: Bot },
          { bg: C.amber, fg: C.light, Icon: Sparkles },
          { bg: C.evergreen, fg: C.light, Icon: Database },
          { bg: C.sage, fg: C.light, Icon: Workflow },
          { bg: C.light, fg: C.pine, Icon: ShieldCheck, border: true },
        ].map(({ bg, fg, Icon, border }, i) => (
          <div
            key={i}
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: bg,
              color: fg,
              border: border ? `1px solid ${C.pine}` : undefined,
            }}
          >
            <Icon size={22} />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Colours (usage / tints)                                             */
/* ------------------------------------------------------------------ */
const TINTS = [
  { name: "Porcelain #FDFFFC", hex: C.porcelain, steps: [100, 80, 60, 40, 20] },
  {
    name: "Charcoal Brown #334139",
    hex: C.charcoalBrown,
    steps: [100, 80, 60, 40, 20],
  },
  { name: "Evergreen #1E2D24", hex: C.evergreen, steps: [100, 80, 60, 40, 20] },
  { name: "Cinnamon #D66F14", hex: C.cinnamon, steps: [100, 80, 60, 40, 20] },
  {
    name: "Black Forest #064C1C",
    hex: C.blackForest,
    steps: [100, 80, 60, 40, 20],
  },
];

const PAIRS = [
  { bg: C.light, fg: C.evergreen },
  { bg: C.light, fg: C.pine },
  { bg: C.sage, fg: C.light },
  { bg: C.evergreen, fg: C.light },
  { bg: C.evergreen, fg: C.amber },
  { bg: C.pine, fg: C.light },
  { bg: C.amber, fg: C.light },
];

export function ColorsSection() {
  return (
    <Section
      id="colors"
      eyebrow="04 · Colours"
      title="Opacity ramps and text/background pairings"
    >
      <div className="space-y-2">
        {TINTS.map((t) => (
          <div
            key={t.name}
            className="grid grid-cols-[170px_1fr] items-center gap-3"
          >
            <span
              className="text-xs font-bold font-sans"
              style={{ color: C.evergreen }}
            >
              {t.name}
            </span>
            <div className="grid grid-cols-5 h-10 rounded-lg overflow-hidden border border-slate-200">
              {t.steps.map((p) => (
                <div
                  key={p}
                  className="text-xs font-semibold tabular-nums flex items-center justify-center font-sans"
                  style={{
                    background: t.hex,
                    opacity: p / 100,
                    color: p > 50 && t.hex !== C.light ? C.light : C.evergreen,
                  }}
                >
                  {p}%
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {PAIRS.map((p, i) => (
          <div
            key={i}
            className="rounded-lg px-4 py-3 border border-slate-200"
            style={{ background: p.bg, color: p.fg }}
          >
            <div className="text-sm font-bold font-sans">Aa Agent</div>
            <div className="text-xs opacity-75 mt-0.5 font-sans">
              <code className="font-mono">{p.fg}</code> on{" "}
              <code className="font-mono">{p.bg}</code>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Sizes                                                               */
/* ------------------------------------------------------------------ */
const SIZE_SCALE = [
  { key: "xs", icon: 12, text: "text-[11px]", radius: "rounded", space: 4 },
  { key: "sm", icon: 14, text: "text-xs", radius: "rounded-md", space: 8 },
  { key: "md", icon: 16, text: "text-sm", radius: "rounded-lg", space: 12 },
  { key: "lg", icon: 20, text: "text-base", radius: "rounded-xl", space: 16 },
  { key: "xl", icon: 24, text: "text-xl", radius: "rounded-2xl", space: 24 },
];

export function SizesSection() {
  return (
    <Section
      id="sizes"
      eyebrow="05 · Sizes"
      title="Size scale: buttons, icons, text, radius, spacing"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <Label>Button sizes (per type)</Label>
        {BUTTON_TYPES.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3">
            <span
              className="text-xs font-bold w-6 font-sans"
              style={{ color: C.evergreen }}
            >
              {t.id}
            </span>
            {BTN_SIZES.map((s) => (
              <Btn key={s.key} type={t} size={s.key} icon={Plus}>
                {s.key.toUpperCase()}
              </Btn>
            ))}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
        <table className="w-full text-left font-sans">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <th className="py-2 pr-4">Token</th>
              <th className="pr-4">Icon</th>
              <th className="pr-4">Text</th>
              <th className="pr-4">Radius</th>
              <th>Spacing</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_SCALE.map((s) => (
              <tr key={s.key} className="border-t border-slate-100">
                <td
                  className="text-xs font-bold py-3 pr-4 font-sans"
                  style={{ color: C.evergreen }}
                >
                  {s.key}
                </td>
                <td className="pr-4">
                  <span
                    className="inline-flex items-center gap-2"
                    style={{ color: C.pine }}
                  >
                    <Bot size={s.icon} />
                    <span className="text-xs tabular-nums text-slate-500 font-sans">
                      {s.icon}px
                    </span>
                  </span>
                </td>
                <td
                  className={`pr-4 ${s.text} font-sans`}
                  style={{ color: C.evergreen }}
                >
                  Agent
                </td>
                <td className="pr-4">
                  <div
                    className={`w-10 h-7 ${s.radius}`}
                    style={{ background: C.sage }}
                  />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: s.space,
                        height: 12,
                        background: C.amber,
                      }}
                    />
                    <span className="text-xs tabular-nums text-slate-500 font-sans">
                      {s.space}px
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Custom Dropdowns & Dropdown Arrow Section                           */
/* ------------------------------------------------------------------ */

const SQL_DIALECT_OPTIONS: SelectOption[] = [
  {
    value: "zetaris",
    label: "Zetaris SQL Lakehouse",
    badge: "Recommended",
    description: "Zero-copy virtualization gateway",
    icon: <Layers size={14} />,
  },
  {
    value: "postgres",
    label: "PostgreSQL Engine",
    badge: "v16",
    description: "Transactional staging & relations",
    icon: <Database size={14} />,
  },
  {
    value: "snowflake",
    label: "Snowflake Warehouse",
    badge: "Cloud",
    description: "Curated dimensional marts & BI",
    icon: <FileCode2 size={14} />,
  },
  {
    value: "duckdb",
    label: "DuckDB In-Memory",
    description: "Sub-second vectorized aggregations",
    icon: <Terminal size={14} />,
  },
  {
    value: "stripe_api",
    label: "Stripe Events Stream",
    disabled: true,
    description: "Incoming webhook listener (Offline)",
    icon: <Filter size={14} />,
  },
];

const SIZE_SELECT_OPTIONS: SelectOption[] = [
  { value: "daily", label: "Daily Micro-batch (15m)" },
  { value: "hourly", label: "Hourly Batch Sync" },
  { value: "realtime", label: "Continuous CDC Stream (<30s)" },
];

const ACTION_MENU_ITEMS: DropdownItem[] = [
  {
    id: "1",
    label: "Execute DDL Compile",
    icon: <Play size={13} />,
    shortcut: "⌘E",
  },
  {
    id: "2",
    label: "Audit Referential Integrity",
    icon: <ShieldCheck size={13} />,
    shortcut: "⌘A",
  },
  {
    id: "3",
    label: "Export Schema as SQL",
    icon: <FileCode2 size={13} />,
    dividerBefore: true,
  },
  {
    id: "4",
    label: "Delete Transformation Stage",
    icon: <Trash2 size={13} />,
    danger: true,
  },
];

export function DropdownsSection() {
  const [arrowOpen, setArrowOpen] = useState(false);
  const [selectedDialect, setSelectedDialect] = useState("zetaris");
  const [selectedSizeOpt, setSelectedSizeOpt] = useState("daily");

  return (
    <Section
      id="dropdowns"
      eyebrow="06 · Controls"
      title="Custom Dropdown & Dropdown Arrow System"
    >
      {/* 1. Custom Dropdown Arrow Showcase */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Custom Dropdown Arrow (Interactive 180° Rotation)</Label>
            <p className="text-xs text-slate-500 mt-0.5">
              Precision geometric SVG chevron and caret with smooth rotation
              states and brand coloring.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setArrowOpen((prev) => !prev)}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#064C1C] text-[#FDFFFC] hover:bg-[#1E2D24] transition-all cursor-pointer shadow-xs"
          >
            Toggle State ({arrowOpen ? "Open 180°" : "Closed 0°"})
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-100 bg-[#FDFFFC] flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider font-sans">
              Chevron (16px)
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#064C1C]">
              <DropdownArrow isOpen={arrowOpen} size={16} />
            </div>
            <span className="text-xs text-slate-600 font-sans">
              {arrowOpen ? "Open (180°)" : "Closed (0°)"}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-[#FDFFFC] flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider font-sans">
              Chevron (12px Sm)
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#D66F14]">
              <DropdownArrow isOpen={arrowOpen} size={12} />
            </div>
            <span className="text-xs text-slate-600 font-sans">Cinnamon</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-[#FDFFFC] flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider font-sans">
              Caret Solid (16px)
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#334139]">
              <DropdownArrow isOpen={arrowOpen} size={16} variant="caret" />
            </div>
            <span className="text-xs text-slate-600 font-sans">
              Charcoal Caret
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-[#FDFFFC] flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider font-sans">
              Caret Solid (12px)
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#064C1C]">
              <DropdownArrow isOpen={arrowOpen} size={12} variant="caret" />
            </div>
            <span className="text-xs text-slate-600 font-sans">
              Forest Caret
            </span>
          </div>
        </div>
      </div>

      {/* 2. Custom Select Dropdown Variations */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <div>
          <Label>Accessible Custom Select Dropdowns</Label>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">
            Keyboard accessible (Arrow keys, Space/Enter, Escape), typeahead
            filter search, option badges, and Porcelain styling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rich Select with Icons, Badges & Search */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#334139] flex items-center justify-between font-sans">
              <span>SQL Engine Dialect (Rich with Search & Badges)</span>
              <span className="text-[11px] text-slate-500 font-medium font-sans">
                Searchable
              </span>
            </label>
            <Select
              value={selectedDialect}
              onChange={(val) => setSelectedDialect(val)}
              options={SQL_DIALECT_OPTIONS}
              searchable
              placeholder="Choose SQL dialect..."
            />
            <p className="text-xs text-slate-600 font-sans">
              Selected value:{" "}
              <code className="font-mono text-xs font-semibold text-[#064C1C] bg-slate-100 px-1 rounded">
                {selectedDialect}
              </code>
            </p>
          </div>

          {/* Size Scale */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#334139]">
              Size Variants (Compact Sm, Standard Md, Prominent Lg)
            </label>
            <div className="space-y-2">
              <Select
                value={selectedSizeOpt}
                onChange={(val) => setSelectedSizeOpt(val)}
                options={SIZE_SELECT_OPTIONS}
                size="sm"
                placeholder="Compact small select..."
              />
              <Select
                value={selectedSizeOpt}
                onChange={(val) => setSelectedSizeOpt(val)}
                options={SIZE_SELECT_OPTIONS}
                size="md"
                placeholder="Medium standard select..."
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
          {/* Action Menu Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#334139]">
              Action Dropdown Menu (Contextual Tools)
            </label>
            <div>
              <Dropdown
                trigger="Pipeline Actions"
                items={ACTION_MENU_ITEMS}
                align="left"
              />
            </div>
          </div>

          {/* Disabled & Error States */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#334139]">
              Validation Error & Disabled States
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                disabled
                value="duckdb"
                options={SQL_DIALECT_OPTIONS}
                size="sm"
                placeholder="Disabled state..."
              />
              <Select
                error="Required field"
                options={SIZE_SELECT_OPTIONS}
                size="sm"
                placeholder="With validation error..."
              />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 07 · Custom Loaders (3 Creative Agent-First Variants)               */
/* ------------------------------------------------------------------ */
const LOADER_VARIANTS_META: {
  id: AuraLoaderVariant;
  badge: string;
  title: string;
  concept: string;
  bestFor: string;
}[] = [
  {
    id: "aura-pulse-glow",
    badge: "Variant I · Signature",
    title: "Aura Halo Pulse (Platform Transition)",
    concept:
      "Signature brand logo animation with dual breathing concentric halo rings (Cinnamon & Black Forest) and conic progress sweep. Specifically engineered to mask unmounting latency and eliminate screen flashes between route changes.",
    bestFor:
      "Platform route changes, workspace boot, initial project load, and full-screen view transitions.",
  },
  {
    id: "orbital-synapse",
    badge: "Variant II · Agent Swarm",
    title: "Orbital Agent Synapse",
    concept:
      "Central brand logo hub flanked by counter-rotating dashed orbital trails and 3 satellite Agent micro-nodes (Planner, Builder, Auditor) executing live architectural telemetry.",
    bestFor:
      "Multi-agent orchestration, architectural prompt decomposition, and UIOP batch generation.",
  },
  {
    id: "star-schema-weaver",
    badge: "Variant III · Data Pipeline",
    title: "Star Schema Lineage Weaver",
    concept:
      "Live Kimball dimensional model with 4 conformed dimension satellites streaming animated dashed particles into a central diamond Fact Hub featuring the brand logo.",
    bestFor:
      "Pipeline compilation, DAG layout generation, warehouse loading, and data lineage visualization.",
  },
  {
    id: "ledger-reconciler",
    badge: "Variant IV · Audit & Verification",
    title: "Quantum Ledger Reconciler",
    concept:
      "Audit containment chamber featuring a holographic laser scanning beam sweeping across the brand logo, 5-bar parity frequency soundwaves, and zero-variance verification readout.",
    bestFor:
      "Financial reconciliation checks, independent audit contracts, and cryptographic ledger verification.",
  },
];

export function LoadersSection() {
  const [size, setSize] = useState<AuraLoaderSize>("md");
  const [mode, setMode] = useState<"indeterminate" | "determinate">(
    "indeterminate",
  );
  const [progressVal, setProgressVal] = useState<number>(68);
  const [surface, setSurface] = useState<"light" | "dark">("light");
  const [testingVariant, setTestingVariant] = useState<AuraLoaderVariant | null>(null);

  const isDark = surface === "dark";

  return (
    <Section
      id="loaders"
      eyebrow="07 · Custom Loaders"
      title="Four creative Agent-First loader variants with logo animation (semantic <progress>)"
    >
      {/* Interactive Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="space-y-0.5">
          <div className="text-xs font-bold" style={{ color: C.evergreen }}>
            Interactive Loader Playground & Screen Transition Simulator
          </div>
          <p className="text-[11px] text-slate-500">
            Built on native semantic{" "}
            <code className="font-mono text-[#064C1C]">&lt;progress&gt;</code>{" "}
            elements with CSS <code className="font-mono">@property</code> conic
            gradients, brand logo animations, and reduced-motion support.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Toggle: Indeterminate vs Determinate */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
            <button
              type="button"
              onClick={() => setMode("indeterminate")}
              style={
                mode === "indeterminate"
                  ? { background: C.blackForest, color: C.porcelain }
                  : { color: C.evergreen }
              }
              className="px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              Indeterminate
            </button>
            <button
              type="button"
              onClick={() => setMode("determinate")}
              style={
                mode === "determinate"
                  ? { background: C.cinnamon, color: C.porcelain }
                  : { color: C.evergreen }
              }
              className="px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              Determinate ({progressVal}%)
            </button>
          </div>

          {mode === "determinate" && (
            <input
              type="range"
              min={0}
              max={100}
              value={progressVal}
              onChange={(e) => setProgressVal(Number(e.target.value))}
              aria-label="Loader determinate percentage"
              className="w-28 accent-[#064C1C] cursor-pointer"
            />
          )}

          {/* Size Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
            {(["sm", "md", "lg"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                style={
                  size === s
                    ? { background: C.evergreen, color: C.porcelain }
                    : { color: C.evergreen }
                }
                className="px-2.5 py-1 rounded-full text-xs font-sans font-bold uppercase transition-all cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Surface Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
            <button
              type="button"
              onClick={() => setSurface("light")}
              style={
                surface === "light"
                  ? { background: C.blackForest, color: C.porcelain }
                  : { color: C.evergreen }
              }
              className="px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer font-sans"
            >
              Porcelain
            </button>
            <button
              type="button"
              onClick={() => setSurface("dark")}
              style={
                surface === "dark"
                  ? { background: C.evergreen, color: C.porcelain }
                  : { color: C.evergreen }
              }
              className="px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer font-sans"
            >
              Evergreen Dark
            </button>
          </div>
        </div>
      </div>

      {/* 4 Creative Variant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {LOADER_VARIANTS_META.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-shadow"
          >
            {/* Stage Preview Canvas */}
            <div
              style={{
                backgroundColor: isDark ? C.evergreen : C.porcelain,
              }}
              className="min-h-[220px] p-5 flex items-center justify-center border-b border-slate-200 transition-colors relative"
            >
              <AuraLoader
                variant={item.id}
                size={size}
                value={mode === "determinate" ? progressVal : undefined}
                onDark={isDark}
              />
            </div>

            {/* Variant Spec & Rationale */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      backgroundColor: `${C.cinnamon}18`,
                      color: C.cinnamon,
                    }}
                    className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  >
                    {item.badge}
                  </span>
                  <code className="font-mono text-[10px] text-slate-400">
                    &quot;{item.id}&quot;
                  </code>
                </div>
                <h3
                  className="text-xs font-bold tracking-tight"
                  style={{ color: C.evergreen }}
                >
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {item.concept}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <div className="text-[10px] text-slate-500">
                  <span className="font-bold text-[#064C1C]">Best for: </span>
                  {item.bestFor}
                </div>

                {/* Interactive Simulation Trigger */}
                <button
                  type="button"
                  onClick={() => setTestingVariant(item.id)}
                  style={{
                    backgroundColor: item.id === "aura-pulse-glow" ? C.blackForest : "#f1f5f9",
                    color: item.id === "aura-pulse-glow" ? C.porcelain : C.evergreen,
                  }}
                  className="w-full py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <Sparkles size={12} className={item.id === "aura-pulse-glow" ? "text-[#D66F14]" : "text-slate-500"} />
                  <span>Simulate Screen Transition</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Transition Overlay Simulator */}
      {testingVariant && (
        <aside
          aria-label="Live Screen Transition Demo"
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center p-6 animate-fadeIn transition-all backdrop-blur-md",
            isDark ? "bg-[#1E2D24]/94 text-[#FDFFFC]" : "bg-[#FDFFFC]/95 text-[#1E2D24]"
          )}
        >
          <div className="scale-110 flex flex-col items-center gap-4">
            <AuraLoader
              variant={testingVariant}
              size="lg"
              value={mode === "determinate" ? progressVal : undefined}
              onDark={isDark}
            />
          </div>

          <button
            type="button"
            onClick={() => setTestingVariant(null)}
            style={{
              backgroundColor: C.blackForest,
              color: C.porcelain,
            }}
            className="mt-8 px-5 py-2 rounded-full text-xs font-bold shadow-lg hover:opacity-95 transition-all cursor-pointer font-sans"
          >
            Dismiss Screen Transition Preview
          </button>
        </aside>
      )}
    </Section>
  );
}
