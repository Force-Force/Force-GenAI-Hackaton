import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  Bot, Database, Workflow, ShieldCheck, FileCode2, Play, Plus, Settings,
  Sparkles, Search, Bell, Trash2, type LucideIcon,
} from 'lucide-react';

/** Brand tokens (single source of truth for this page). */
export const C = {
  porcelain: '#FDFFFC',
  charcoalBrown: '#334139',
  evergreen: '#1E2D24',
  cinnamon: '#D66F14',
  blackForest: '#064C1C',
  // Backward-compatible aliases
  light: '#FDFFFC',
  sage: '#334139',
  amber: '#D66F14',
  pine: '#064C1C',
} as const;

const MONO = 'font-mono';

export function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-5 pt-8 border-t border-slate-200">
      <div>
        <div className={`${MONO} text-[11px] uppercase tracking-wider text-slate-400 font-bold`}>{eyebrow}</div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: C.evergreen }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className={`${MONO} text-[10px] uppercase tracking-wider text-slate-400 font-bold`}>{children}</div>;
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
  { id: 'A', name: 'Black Forest', use: 'Primary action', base: { background: C.blackForest, color: C.porcelain, border: `1px solid ${C.blackForest}` }, hover: 'hover:brightness-110' },
  { id: 'B', name: 'Cinnamon', use: 'Agent / highlight action', base: { background: C.cinnamon, color: C.porcelain, border: `1px solid ${C.cinnamon}` }, hover: 'hover:brightness-110' },
  { id: 'C', name: 'Evergreen', use: 'Strong neutral action', base: { background: C.evergreen, color: C.porcelain, border: `1px solid ${C.evergreen}` }, hover: 'hover:bg-[#334139]' },
  { id: 'D', name: 'Outline (Black Forest)', use: 'Secondary action', base: { background: 'transparent', color: C.blackForest, border: `1.5px solid ${C.blackForest}` }, hover: 'hover:bg-[#064C1C]/10' },
  { id: 'E', name: 'Ghost (Charcoal Brown)', use: 'Tertiary / toolbar action', base: { background: 'transparent', color: C.charcoalBrown, border: '1px solid transparent' }, hover: 'hover:bg-[#334139]/10' },
];

const BTN_SIZES = [
  { key: 'sm', cls: 'px-3 py-1 text-[11px] gap-1.5', icon: 12 },
  { key: 'md', cls: 'px-4 py-2 text-xs gap-1.5', icon: 14 },
  { key: 'lg', cls: 'px-5.5 py-2.5 text-sm gap-2', icon: 16 },
] as const;

function Btn({ type, size = 'md', icon: Icon, children, disabled, onDark, shape = 'pill' }: {
  type: ButtonType; size?: 'sm' | 'md' | 'lg'; icon?: LucideIcon; children: ReactNode; disabled?: boolean; onDark?: boolean; shape?: 'pill' | 'rounded';
}) {
  const s = BTN_SIZES.find((x) => x.key === size)!;
  const radius = shape === 'pill' ? 'rounded-full' : 'rounded-lg';
  // On dark surfaces, flip outline/ghost to the light colour for contrast.
  const style: CSSProperties = onDark && (type.id === 'D' || type.id === 'E')
    ? { ...type.base, color: C.light, borderColor: type.id === 'D' ? C.light : 'transparent' }
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
  const [shape, setShape] = useState<'pill' | 'rounded'>('pill');

  return (
    <Section id="buttons" eyebrow="01 · Buttons" title="Five button types — fully rounded (pill) preview">
      {/* Interactive Shape Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
        <div>
          <div className="text-xs font-bold" style={{ color: C.evergreen }}>Corner Radius Style</div>
          <div className="text-[11px] text-slate-500">Currently showing: <span className="font-semibold text-[#064C1C]">{shape === 'pill' ? 'Fully Rounded (Pill / rounded-full)' : 'Standard (rounded-lg / 8px)'}</span></div>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
          <button
            type="button"
            onClick={() => setShape('pill')}
            style={shape === 'pill' ? { background: C.pine, color: C.light } : { color: C.evergreen }}
            className="px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            ● Fully Rounded (Pill)
          </button>
          <button
            type="button"
            onClick={() => setShape('rounded')}
            style={shape === 'rounded' ? { background: C.pine, color: C.light } : { color: C.evergreen }}
            className="px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            Rounded (8px)
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {BUTTON_TYPES.map((t) => (
          <div key={t.id} className="grid grid-cols-1 lg:grid-cols-[200px_1fr_1fr] gap-4 items-center rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`${MONO} text-xs font-bold px-2 py-0.5 rounded-full`} style={{ background: C.evergreen, color: C.light }}>{t.id}</span>
                <span className="text-sm font-bold" style={{ color: C.evergreen }}>{t.name}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{t.use}</div>
            </div>

            {/* Light surface */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl p-3 border border-slate-200" style={{ background: C.light }}>
              <Btn type={t} shape={shape}>Default</Btn>
              <Btn type={t} icon={Play} shape={shape}>With icon</Btn>
              <Btn type={t} disabled shape={shape}>Disabled</Btn>
            </div>

            {/* Dark surface */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl p-3" style={{ background: C.evergreen }}>
              <Btn type={t} onDark shape={shape}>Default</Btn>
              <Btn type={t} icon={Play} onDark shape={shape}>With icon</Btn>
              <Btn type={t} disabled onDark shape={shape}>Disabled</Btn>
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
  { tag: 'Display', cls: 'text-5xl font-bold tracking-tight', spec: '48px / 700 / -0.025em' },
  { tag: 'H1', cls: 'text-3xl font-bold tracking-tight', spec: '30px / 700 / -0.025em' },
  { tag: 'H2', cls: 'text-2xl font-semibold tracking-tight', spec: '24px / 600' },
  { tag: 'H3', cls: 'text-xl font-semibold', spec: '20px / 600' },
  { tag: 'H4', cls: 'text-base font-semibold', spec: '16px / 600' },
];

const TEXTS = [
  { tag: 'Body Large', cls: 'text-base leading-relaxed', spec: '16px / 400 / 1.625' },
  { tag: 'Body', cls: 'text-sm leading-relaxed', spec: '14px / 400 / 1.625' },
  { tag: 'Body Small', cls: 'text-xs leading-relaxed', spec: '12px / 400 / 1.625' },
  { tag: 'Caption', cls: 'text-[11px] leading-snug opacity-70', spec: '11px / 400 / 70% opacity' },
  { tag: 'Label (mono)', cls: `${MONO} text-[10px] uppercase tracking-wider font-bold`, spec: 'IBM Plex Mono 10px / 700 / caps' },
];

const SURFACES: { name: string; bg: string; fg: string; accent: string }[] = [
  { name: 'On Porcelain #FDFFFC', bg: C.porcelain, fg: C.evergreen, accent: C.blackForest },
  { name: 'On Charcoal Brown #334139', bg: C.charcoalBrown, fg: C.porcelain, accent: C.cinnamon },
  { name: 'On Evergreen #1E2D24', bg: C.evergreen, fg: C.porcelain, accent: C.cinnamon },
];

export function TypographySection() {
  return (
    <Section id="typography" eyebrow="02 · Headings & Text" title="Type scale on each surface">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {SURFACES.map((s) => (
          <div key={s.name} className="rounded-xl border border-slate-200 p-5 space-y-4" style={{ background: s.bg, color: s.fg }}>
            <Label>{s.name}</Label>
            <div className="space-y-3">
              {HEADINGS.map((h, i) => (
                <div key={h.tag}>
                  <div className={h.cls} style={i === 0 ? { color: s.accent } : undefined}>{h.tag} heading</div>
                  <div className={`${MONO} text-[10px] opacity-60`}>{h.spec}</div>
                </div>
              ))}
            </div>
            <div className="h-px opacity-20" style={{ background: s.fg }} />
            <div className="space-y-3">
              {TEXTS.map((t) => (
                <div key={t.tag}>
                  <div className={t.cls}>{t.tag} — The agent plans, you approve.</div>
                  <div className={`${MONO} text-[10px] opacity-60`}>{t.spec}</div>
                </div>
              ))}
              <a href="#typography" className="text-sm font-semibold underline underline-offset-2" style={{ color: s.accent }}>Link text</a>
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
  { name: 'Bot', Icon: Bot }, { name: 'Sparkles', Icon: Sparkles }, { name: 'Database', Icon: Database },
  { name: 'Workflow', Icon: Workflow }, { name: 'ShieldCheck', Icon: ShieldCheck }, { name: 'FileCode2', Icon: FileCode2 },
  { name: 'Play', Icon: Play }, { name: 'Plus', Icon: Plus }, { name: 'Search', Icon: Search },
  { name: 'Bell', Icon: Bell }, { name: 'Settings', Icon: Settings }, { name: 'Trash2', Icon: Trash2 },
];

const ICON_COLORS = [
  { hex: C.light, bg: C.evergreen }, { hex: C.sage, bg: C.light },
  { hex: C.evergreen, bg: C.light }, { hex: C.amber, bg: C.light }, { hex: C.pine, bg: C.light },
];

export function IconsSection() {
  return (
    <Section id="icons" eyebrow="03 · Icons" title="Icon set in every brand colour (Lucide)">
      <div className="space-y-3">
        {ICON_COLORS.map((c) => (
          <div key={c.hex} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4" style={{ background: c.bg }}>
            <span className={`${MONO} text-[11px] font-bold w-20`} style={{ color: c.hex }}>{c.hex}</span>
            {ICONS.map(({ name, Icon }) => (
              <span key={name} title={name} style={{ color: c.hex }}><Icon size={20} /></span>
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Label>Icon tiles</Label>
      </div>
      <div className="flex flex-wrap gap-3">
        {[
          { bg: C.pine, fg: C.light, Icon: Bot }, { bg: C.amber, fg: C.light, Icon: Sparkles },
          { bg: C.evergreen, fg: C.light, Icon: Database }, { bg: C.sage, fg: C.light, Icon: Workflow },
          { bg: C.light, fg: C.pine, Icon: ShieldCheck, border: true },
        ].map(({ bg, fg, Icon, border }, i) => (
          <div key={i} className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: bg, color: fg, border: border ? `1px solid ${C.pine}` : undefined }}>
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
  { name: 'Porcelain #FDFFFC', hex: C.porcelain, steps: [100, 80, 60, 40, 20] },
  { name: 'Charcoal Brown #334139', hex: C.charcoalBrown, steps: [100, 80, 60, 40, 20] },
  { name: 'Evergreen #1E2D24', hex: C.evergreen, steps: [100, 80, 60, 40, 20] },
  { name: 'Cinnamon #D66F14', hex: C.cinnamon, steps: [100, 80, 60, 40, 20] },
  { name: 'Black Forest #064C1C', hex: C.blackForest, steps: [100, 80, 60, 40, 20] },
];

const PAIRS = [
  { bg: C.light, fg: C.evergreen }, { bg: C.light, fg: C.pine }, { bg: C.sage, fg: C.light },
  { bg: C.evergreen, fg: C.light }, { bg: C.evergreen, fg: C.amber }, { bg: C.pine, fg: C.light }, { bg: C.amber, fg: C.light },
];

export function ColorsSection() {
  return (
    <Section id="colors" eyebrow="04 · Colours" title="Opacity ramps and text/background pairings">
      <div className="space-y-2">
        {TINTS.map((t) => (
          <div key={t.name} className="grid grid-cols-[170px_1fr] items-center gap-3">
            <span className={`${MONO} text-[11px] font-bold`} style={{ color: C.evergreen }}>{t.name}</span>
            <div className="grid grid-cols-5 h-10 rounded-lg overflow-hidden border border-slate-200">
              {t.steps.map((p) => (
                <div key={p} className={`${MONO} text-[10px] flex items-center justify-center`}
                  style={{ background: t.hex, opacity: p / 100, color: p > 50 && t.hex !== C.light ? C.light : C.evergreen }}>{p}%</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {PAIRS.map((p, i) => (
          <div key={i} className="rounded-lg px-4 py-3 border border-slate-200" style={{ background: p.bg, color: p.fg }}>
            <div className="text-sm font-bold">Aa Agent</div>
            <div className={`${MONO} text-[10px]`}>{p.fg} on {p.bg}</div>
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
  { key: 'xs', icon: 12, text: 'text-[11px]', radius: 'rounded', space: 4 },
  { key: 'sm', icon: 14, text: 'text-xs', radius: 'rounded-md', space: 8 },
  { key: 'md', icon: 16, text: 'text-sm', radius: 'rounded-lg', space: 12 },
  { key: 'lg', icon: 20, text: 'text-base', radius: 'rounded-xl', space: 16 },
  { key: 'xl', icon: 24, text: 'text-xl', radius: 'rounded-2xl', space: 24 },
];

export function SizesSection() {
  return (
    <Section id="sizes" eyebrow="05 · Sizes" title="Size scale: buttons, icons, text, radius, spacing">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <Label>Button sizes (per type)</Label>
        {BUTTON_TYPES.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3">
            <span className={`${MONO} text-xs font-bold w-6`} style={{ color: C.evergreen }}>{t.id}</span>
            {BTN_SIZES.map((s) => (
              <Btn key={s.key} type={t} size={s.key} icon={Plus}>{s.key.toUpperCase()}</Btn>
            ))}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className={`${MONO} text-[10px] uppercase tracking-wider text-slate-400`}>
              <th className="py-2 pr-4">Token</th><th className="pr-4">Icon</th><th className="pr-4">Text</th><th className="pr-4">Radius</th><th>Spacing</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_SCALE.map((s) => (
              <tr key={s.key} className="border-t border-slate-100">
                <td className={`${MONO} text-xs font-bold py-3 pr-4`} style={{ color: C.evergreen }}>{s.key}</td>
                <td className="pr-4"><span className="inline-flex items-center gap-2" style={{ color: C.pine }}><Bot size={s.icon} /><span className={`${MONO} text-[10px] text-slate-400`}>{s.icon}px</span></span></td>
                <td className={`pr-4 ${s.text}`} style={{ color: C.evergreen }}>Agent</td>
                <td className="pr-4"><div className={`w-10 h-7 ${s.radius}`} style={{ background: C.sage }} /></td>
                <td><div className="flex items-center gap-2"><div style={{ width: s.space, height: 12, background: C.amber }} /><span className={`${MONO} text-[10px] text-slate-400`}>{s.space}px</span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

