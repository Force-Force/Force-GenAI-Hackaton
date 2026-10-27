import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Database, Scale, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { cn } from '../../utils/cn';
import logoUrl from '../../assets/logo.png';

export type AuraLoaderVariant =
  | 'aura-pulse-glow'
  | 'orbital-synapse'
  | 'star-schema-weaver'
  | 'ledger-reconciler';

export type AuraLoaderSize = 'sm' | 'md' | 'lg';

export interface AuraLoaderProps {
  /** Which of the 4 creative AuraBI loader architectures to render. */
  variant?: AuraLoaderVariant;
  /** Size scale ('sm' | 'md' | 'lg'). */
  size?: AuraLoaderSize;
  /**
   * Optional 0..100 progress percentage.
   * When omitted, the underlying `<progress>` element is indeterminate.
   */
  value?: number;
  /** Primary status headline displayed below or alongside the loader. */
  label?: string;
  /** Secondary monospace telemetry subtitle (cycles automatically if omitted). */
  sublabel?: string;
  /** Render for dark Evergreen (#1E2D24) or Charcoal Brown (#334139) surfaces. */
  onDark?: boolean;
  className?: string;
}

const TELEMETRY_PHRASES: Record<AuraLoaderVariant, string[]> = {
  'aura-pulse-glow': [
    'hydrating lakehouse environment…',
    'synchronizing workspace session…',
    'rendering certified UIOP components…',
  ],
  'orbital-synapse': [
    'planner-agent :: decomposing architectural prompt…',
    'builder-agent :: synthesizing UIOP v1.0 batch…',
    'audit-agent :: isolating KPI reconciliation rules…',
  ],
  'star-schema-weaver': [
    'binding dim_customer_360 → fact_daily_revenue…',
    'resolving SCD Type-2 surrogate keys…',
    'compiling ANSI SQL-92 star schema DDL…',
  ],
  'ledger-reconciler': [
    'comparing raw_stripe_events vs fact_revenue…',
    'verifying idempotent charge parity (Δ 0.00%)…',
    'sealing cryptographic audit contract…',
  ],
};

const SIZE_CONFIG: Record<
  AuraLoaderSize,
  {
    ringPx: number;
    outerPx: number;
    thicknessPx: number;
    iconSize: number;
    titleCls: string;
    subCls: string;
  }
> = {
  sm: {
    ringPx: 52,
    outerPx: 84,
    thicknessPx: 3,
    iconSize: 22,
    titleCls: 'text-xs',
    subCls: 'text-[10px]',
  },
  md: {
    ringPx: 76,
    outerPx: 124,
    thicknessPx: 4,
    iconSize: 32,
    titleCls: 'text-sm',
    subCls: 'text-[11px]',
  },
  lg: {
    ringPx: 104,
    outerPx: 168,
    thicknessPx: 5,
    iconSize: 44,
    titleCls: 'text-base',
    subCls: 'text-xs',
  },
};

/**
 * Semantic `<progress>` ring primitive following Modern Web Guidance
 * (`spinner` for indeterminate & `progress-ring` for determinate 0..100 values).
 */
function SemanticProgressRing({
  value,
  sizePx,
  thicknessPx,
  primaryColor,
  trackColor,
  ariaLabel,
  className,
}: {
  value?: number;
  sizePx: number;
  thicknessPx: number;
  primaryColor: string;
  trackColor: string;
  ariaLabel: string;
  className?: string;
}) {
  const progressRef = useRef<HTMLProgressElement>(null);
  const isDeterminate = typeof value === 'number';
  const clampedValue = isDeterminate
    ? Math.max(0, Math.min(100, Math.round(value)))
    : undefined;

  // Fallback for browsers that don't support `attr(value type(<number>))` in CSS
  useEffect(() => {
    const el = progressRef.current;
    if (!el || !isDeterminate) return;

    const supportsTypedAttr =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('width: attr(value type(<number>))');

    if (!supportsTypedAttr) {
      el.style.setProperty('--value', el.getAttribute('value') ?? '0');
      const observer = new MutationObserver(() => {
        el.style.setProperty('--value', el.getAttribute('value') ?? '0');
      });
      observer.observe(el, {
        attributes: true,
        attributeFilter: ['value'],
      });
      return () => observer.disconnect();
    }
  }, [isDeterminate, clampedValue]);

  const style = {
    '--size': `${sizePx}px`,
    '--thickness': `${thicknessPx}px`,
    '--spinner-color': primaryColor,
    '--fill-color': primaryColor,
    '--track-color': trackColor,
    ...(isDeterminate ? { '--value': clampedValue } : {}),
  } as CSSProperties;

  if (isDeterminate) {
    return (
      <progress
        ref={progressRef}
        value={clampedValue}
        max={100}
        aria-label={ariaLabel}
        style={style}
        className={cn('aura-progress-ring', className)}
      />
    );
  }

  return (
    <progress
      ref={progressRef}
      aria-label={ariaLabel}
      style={style}
      className={cn('aura-spinner', className)}
    />
  );
}

export function AuraLoader({
  variant = 'aura-pulse-glow',
  size = 'md',
  value,
  label,
  sublabel,
  onDark = false,
  className,
}: AuraLoaderProps) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const cfg = SIZE_CONFIG[size];
  const isDeterminate = typeof value === 'number';
  const clampedValue = isDeterminate
    ? Math.max(0, Math.min(100, Math.round(value)))
    : undefined;

  useEffect(() => {
    if (sublabel) return;
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % TELEMETRY_PHRASES[variant].length);
    }, 2200);
    return () => clearInterval(id);
  }, [variant, sublabel]);

  const activeSublabel = sublabel ?? TELEMETRY_PHRASES[variant][phraseIdx];
  const textPrimary = onDark ? '#FDFFFC' : '#1E2D24';
  const textMuted = onDark ? 'rgba(253, 255, 252, 0.68)' : 'rgba(51, 65, 57, 0.68)';
  const ringTrack = onDark
    ? 'rgba(253, 255, 252, 0.14)'
    : 'rgba(51, 65, 57, 0.14)';

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center text-center select-none',
        size === 'sm' ? 'gap-2.5' : size === 'md' ? 'gap-3.5' : 'gap-4',
        className,
      )}
    >
      {/* ===================================================================
          VARIANT 1: AURA HALO PULSE (SIGNATURE PLATFORM TRANSITION LOADER)
          Breathing radial halo rings in Black Forest & Cinnamon with a centered
          pulsing AuraBI logo and smooth conic progress sweep.
         =================================================================== */}
      {variant === 'aura-pulse-glow' && (
        <div
          style={{ width: cfg.outerPx, height: cfg.outerPx }}
          className="relative flex items-center justify-center"
        >
          {/* Outer Breathing Radial Halo Ring 1 */}
          <div
            className="absolute inset-0 rounded-full border border-[#D66F14]/25 aura-halo-expand-1 pointer-events-none"
            style={{
              background: onDark
                ? 'radial-gradient(circle, rgba(214,111,20,0.18) 0%, rgba(214,111,20,0.02) 65%, transparent 100%)'
                : 'radial-gradient(circle, rgba(214,111,20,0.12) 0%, rgba(214,111,20,0.02) 65%, transparent 100%)',
            }}
          />

          {/* Inner Counter-Breathing Halo Ring 2 */}
          <div
            className="absolute inset-2.5 rounded-full border border-[#064C1C]/30 aura-halo-expand-2 pointer-events-none"
            style={{
              background: onDark
                ? 'radial-gradient(circle, rgba(6,76,28,0.25) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(6,76,28,0.15) 0%, transparent 70%)',
            }}
          />

          {/* Primary Semantic <progress> Conic Ring */}
          <SemanticProgressRing
            value={clampedValue}
            sizePx={cfg.ringPx}
            thicknessPx={cfg.thicknessPx}
            primaryColor={onDark ? '#D66F14' : '#064C1C'}
            trackColor={ringTrack}
            ariaLabel={label ?? 'AuraBI Platform Transition Progress'}
          />

          {/* Center Elevated Brand Hub with Logo */}
          <div
            style={{
              width: cfg.ringPx * 0.64,
              height: cfg.ringPx * 0.64,
              backgroundColor: onDark ? '#1E2D24' : '#FDFFFC',
              borderColor: onDark ? 'rgba(253,255,252,0.2)' : 'rgba(30,45,36,0.12)',
            }}
            className="absolute rounded-full flex flex-col items-center justify-center shadow-lg border p-1.5 overflow-hidden transition-colors"
          >
            {isDeterminate ? (
              <span
                style={{ color: onDark ? '#FDFFFC' : '#1E2D24' }}
                className="font-mono text-[11px] font-bold tracking-tight"
              >
                {clampedValue}%
              </span>
            ) : (
              <img
                src={logoUrl}
                alt="AuraBI Platform Logo"
                style={{ width: cfg.iconSize, height: cfg.iconSize }}
                className="object-contain select-none aura-logo-pulse"
              />
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          VARIANT 2: ORBITAL AGENT SYNAPSE
          Multi-agent orbital ring with counter-rotating Cinnamon & Black Forest
          semantic `<progress>` trails + 3 satellite agent nodes + Logo Core.
         =================================================================== */}
      {variant === 'orbital-synapse' && (
        <div
          style={{ width: cfg.outerPx, height: cfg.outerPx }}
          className="relative flex items-center justify-center"
        >
          {/* Outer dashed orbital track with 3 Agent Satellites */}
          <div
            className="absolute inset-0 rounded-full border border-dashed transition-colors animate-[aura-progress-spin_10s_linear_infinite] motion-reduce:animate-[aura-progress-spin_30s_linear_infinite]"
            style={{
              borderColor: onDark
                ? 'rgba(253, 255, 252, 0.18)'
                : 'rgba(51, 65, 57, 0.22)',
            }}
          >
            {/* Satellite 1: Planner Agent (Top) */}
            <span
              title="Planner Agent"
              style={{ backgroundColor: '#064C1C' }}
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ring-2 ring-[#FDFFFC] shadow-xs"
            />
            {/* Satellite 2: Builder Agent (Bottom Right) */}
            <span
              title="Builder Agent"
              style={{ backgroundColor: '#D66F14' }}
              className="absolute bottom-2 right-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#FDFFFC] shadow-xs"
            />
            {/* Satellite 3: Independent Audit Agent (Bottom Left) */}
            <span
              title="Independent Audit Agent"
              style={{ backgroundColor: onDark ? '#FDFFFC' : '#334139' }}
              className="absolute bottom-2 left-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#D66F14]/50 shadow-xs"
            />
          </div>

          {/* Primary Semantic <progress> Conic Ring */}
          <SemanticProgressRing
            value={clampedValue}
            sizePx={cfg.ringPx}
            thicknessPx={cfg.thicknessPx}
            primaryColor={onDark ? '#D66F14' : '#064C1C'}
            trackColor={ringTrack}
            ariaLabel={label ?? 'AuraBI Agent Orchestration Progress'}
          />

          {/* Center AI Core Hub with Brand Logo */}
          <div
            style={{
              width: cfg.ringPx * 0.58,
              height: cfg.ringPx * 0.58,
              backgroundColor: onDark ? '#064C1C' : '#1E2D24',
              color: '#FDFFFC',
            }}
            className="absolute rounded-full flex flex-col items-center justify-center shadow-md border border-white/15"
          >
            {isDeterminate ? (
              <span className="font-mono text-[11px] font-bold tracking-tight">
                {clampedValue}%
              </span>
            ) : (
              <img
                src={logoUrl}
                alt="AuraBI Core"
                style={{ width: cfg.iconSize - 2, height: cfg.iconSize - 2 }}
                className="object-contain select-none aura-logo-pulse"
              />
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          VARIANT 3: KIMBALL STAR-SCHEMA WEAVER
          A live miniature Star Schema where 4 satellite Dimension nodes stream
          animated foreign-key packets into a central Fact hub holding the logo.
         =================================================================== */}
      {variant === 'star-schema-weaver' && (
        <div
          style={{ width: cfg.outerPx, height: cfg.outerPx }}
          className="relative flex items-center justify-center"
        >
          {/* Animated SVG Foreign-Key Spokes connecting Dimensions -> Fact Hub */}
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            {/* 4 diagonal foreign-key lineage lines */}
            <line
              x1="20"
              y1="20"
              x2="60"
              y2="60"
              stroke={onDark ? 'rgba(253,255,252,0.22)' : 'rgba(51,65,57,0.22)'}
              strokeWidth="1.75"
            />
            <line
              x1="100"
              y1="20"
              x2="60"
              y2="60"
              stroke={onDark ? 'rgba(253,255,252,0.22)' : 'rgba(51,65,57,0.22)'}
              strokeWidth="1.75"
            />
            <line
              x1="20"
              y1="100"
              x2="60"
              y2="60"
              stroke={onDark ? 'rgba(253,255,252,0.22)' : 'rgba(51,65,57,0.22)'}
              strokeWidth="1.75"
            />
            <line
              x1="100"
              y1="100"
              x2="60"
              y2="60"
              stroke={onDark ? 'rgba(253,255,252,0.22)' : 'rgba(51,65,57,0.22)'}
              strokeWidth="1.75"
            />

            {/* Streaming Cinnamon data packets along the spokes */}
            <line
              x1="20"
              y1="20"
              x2="60"
              y2="60"
              stroke="#D66F14"
              strokeWidth="2"
              className="aura-edge-flow"
            />
            <line
              x1="100"
              y1="20"
              x2="60"
              y2="60"
              stroke="#064C1C"
              strokeWidth="2"
              className="aura-edge-flow"
            />
            <line
              x1="20"
              y1="100"
              x2="60"
              y2="60"
              stroke="#064C1C"
              strokeWidth="2"
              className="aura-edge-flow"
            />
            <line
              x1="100"
              y1="100"
              x2="60"
              y2="60"
              stroke="#D66F14"
              strokeWidth="2"
              className="aura-edge-flow"
            />
          </svg>

          {/* 4 Corner Satellite Dimension Pills */}
          {[
            { pos: 'top-1 left-1', tag: 'D1', bg: '#334139' },
            { pos: 'top-1 right-1', tag: 'D2', bg: '#D66F14' },
            { pos: 'bottom-1 left-1', tag: 'D3', bg: '#D66F14' },
            { pos: 'bottom-1 right-1', tag: 'D4', bg: '#334139' },
          ].map((dim) => (
            <div
              key={dim.tag}
              style={{ backgroundColor: dim.bg, color: '#FDFFFC' }}
              className={cn(
                'absolute rounded-md font-mono font-bold flex items-center justify-center shadow-xs border border-white/20',
                size === 'sm'
                  ? 'w-4 h-4 text-[7px]'
                  : size === 'md'
                    ? 'w-5 h-5 text-[8px]'
                    : 'w-6 h-6 text-[9px]',
                dim.pos,
              )}
            >
              {dim.tag}
            </div>
          ))}

          {/* Semantic <progress> Ring surrounding the Central Fact Hub */}
          <SemanticProgressRing
            value={clampedValue}
            sizePx={cfg.ringPx * 0.88}
            thicknessPx={cfg.thicknessPx}
            primaryColor="#D66F14"
            trackColor={ringTrack}
            ariaLabel={label ?? 'Star Schema Compilation Progress'}
          />

          {/* Central Fact Table Diamond Hub featuring AuraBI Logo */}
          <div
            style={{
              width: cfg.ringPx * 0.54,
              height: cfg.ringPx * 0.54,
              backgroundColor: '#064C1C',
              color: '#FDFFFC',
            }}
            className="absolute rounded-xl rotate-45 flex items-center justify-center shadow-md border border-white/20 overflow-hidden"
          >
            <div className="-rotate-45 flex flex-col items-center justify-center">
              {isDeterminate ? (
                <span className="font-mono text-[10px] font-bold">
                  {clampedValue}%
                </span>
              ) : (
                <img
                  src={logoUrl}
                  alt="Fact Hub"
                  style={{ width: cfg.iconSize - 6, height: cfg.iconSize - 6 }}
                  className="object-contain select-none"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VARIANT 4: QUANTUM LEDGER RECONCILER
          Audit Capsule with Holographic Laser Scanning over the Brand Logo,
          5 synchronized frequency wave bars and zero-variance verification.
         =================================================================== */}
      {variant === 'ledger-reconciler' && (
        <div
          style={{
            backgroundColor: onDark
              ? 'rgba(253, 255, 252, 0.05)'
              : '#FDFFFC',
            borderColor: onDark
              ? 'rgba(253, 255, 252, 0.14)'
              : 'rgba(51, 65, 57, 0.16)',
          }}
          className={cn(
            'relative rounded-2xl border shadow-xs flex items-center gap-3.5 overflow-hidden',
            size === 'sm'
              ? 'px-3.5 py-2.5'
              : size === 'md'
                ? 'px-4.5 py-3.5'
                : 'px-6 py-4.5',
          )}
        >
          {/* Left: Semantic <progress> Ring with Laser-Scanned Brand Logo */}
          <div className="relative flex items-center justify-center shrink-0">
            <SemanticProgressRing
              value={clampedValue}
              sizePx={cfg.ringPx * 0.76}
              thicknessPx={cfg.thicknessPx}
              primaryColor="#064C1C"
              trackColor={ringTrack}
              ariaLabel={label ?? 'KPI Ledger Audit Progress'}
            />
            
            {/* Center Logo Hub with Laser Scanning Sweep */}
            <div
              style={{
                width: cfg.ringPx * 0.5,
                height: cfg.ringPx * 0.5,
                backgroundColor: onDark ? '#1E2D24' : '#FDFFFC',
              }}
              className="absolute rounded-full flex items-center justify-center overflow-hidden border border-[#064C1C]/20 shadow-xs"
            >
              {isDeterminate ? (
                <span
                  style={{ color: onDark ? '#FDFFFC' : '#064C1C' }}
                  className="font-mono text-[10px] font-bold"
                >
                  {clampedValue}%
                </span>
              ) : (
                <>
                  <img
                    src={logoUrl}
                    alt="Audited Logo"
                    style={{ width: cfg.iconSize - 6, height: cfg.iconSize - 6 }}
                    className="object-contain select-none"
                  />
                  {/* Holographic scanning laser line */}
                  <span className="absolute left-0 right-0 h-0.5 bg-[#D66F14] shadow-[0_0_8px_#D66F14] aura-laser-scan pointer-events-none" />
                </>
              )}
            </div>
          </div>

          {/* Right: 5-Bar Ledger Parity Equalizer + Variance Readout */}
          <div className="flex flex-col items-start gap-1.5 text-left">
            <div className="flex items-center gap-1.5">
              <span
                style={{ backgroundColor: '#D66F14', color: '#FDFFFC' }}
                className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              >
                Audit Check
              </span>
              <span
                style={{ color: onDark ? '#FDFFFC' : '#064C1C' }}
                className="font-mono text-[10px] font-bold inline-flex items-center gap-1"
              >
                <ShieldCheck size={11} />
                Δ 0.00%
              </span>
            </div>

            {/* 5 Paired Source/Mart Wave Bars */}
            <div className="flex items-end gap-1.5 h-6 pt-1">
              {[
                { cls: 'animate-soundwave-1', color: '#064C1C' },
                { cls: 'animate-soundwave-2', color: '#D66F14' },
                { cls: 'animate-soundwave-3', color: '#334139' },
                { cls: 'animate-soundwave-4', color: '#064C1C' },
                { cls: 'animate-soundwave-5', color: '#D66F14' },
              ].map((bar, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor:
                      bar.color === '#334139' && onDark ? '#FDFFFC' : bar.color,
                  }}
                  className={cn(
                    'w-1.5 rounded-full transition-all',
                    bar.cls,
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Typography Caption & Live Telemetry Subtitle */}
      <div className="space-y-0.5 max-w-[280px]">
        <div
          style={{ color: textPrimary }}
          className={cn(
            'font-bold tracking-tight flex items-center justify-center gap-1.5',
            cfg.titleCls,
          )}
        >
          <Sparkles size={12} className="text-[#D66F14] shrink-0" />
          <span>
            {label ??
              (variant === 'aura-pulse-glow'
                ? 'Initializing Platform Environment'
                : variant === 'orbital-synapse'
                  ? 'Synthesizing Agent Architecture'
                  : variant === 'star-schema-weaver'
                    ? 'Weaving Dimensional Star Schema'
                    : 'Reconciling Ledger & Mart KPIs')}
          </span>
        </div>

        <p
          style={{ color: textMuted }}
          className={cn('font-mono truncate', cfg.subCls)}
        >
          {activeSublabel}
        </p>
      </div>
    </div>
  );
}

export { Workflow, Database, Scale, ShieldCheck };
