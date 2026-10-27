import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { AuraLoader, type AuraLoaderVariant, type AuraLoaderSize } from './AuraLoader';
import { cn } from '../../utils/cn';

export interface PlatformTransitionLoaderProps {
  /** Which of the 4 loader variants to display. Defaults to 'aura-pulse-glow'. */
  variant?: AuraLoaderVariant;
  /** Size scale. Defaults to 'lg'. */
  size?: AuraLoaderSize;
  /** Visibility state. */
  visible?: boolean;
  /** Primary label. */
  label?: string;
  /** Secondary subtitle / telemetry message. */
  sublabel?: string;
  /** Render on dark backdrop surface. */
  onDark?: boolean;
  /** Optional dismiss callback (e.g. for preview testing). */
  onClose?: () => void;
  className?: string;
}

/**
 * Platform Transition Loader
 *
 * Full-screen or viewport-level transition screen engineered to prevent
 * abrupt screen flashes between route and view changes in the platform.
 */
export function PlatformTransitionLoader({
  variant = 'aura-pulse-glow',
  size = 'lg',
  visible = true,
  label,
  sublabel,
  onDark = false,
  onClose,
  className,
}: PlatformTransitionLoaderProps) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 240);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <aside
      aria-label="Platform Loading Overlay"
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center p-6 transition-all duration-200',
        visible ? 'opacity-100 backdrop-blur-md' : 'opacity-0 pointer-events-none backdrop-blur-none',
        onDark
          ? 'bg-[#1E2D24]/92 text-[#FDFFFC]'
          : 'bg-[#FDFFFC]/94 text-[#1E2D24]',
        className,
      )}
    >
      {/* Optional Close Button for Playground Testing */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close transition overlay"
          className={cn(
            'absolute top-6 right-6 p-2 rounded-full transition-colors cursor-pointer border',
            onDark
              ? 'border-white/20 bg-white/10 hover:bg-white/20 text-[#FDFFFC]'
              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600',
          )}
        >
          <X size={16} />
        </button>
      )}

      {/* Brand Watermark Eyebrow */}
      <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-wider opacity-75 font-sans">
        <Sparkles size={14} className="text-[#D66F14]" />
        <span>AuraBI Platform Transition</span>
      </div>

      {/* Core Animated Loader */}
      <div className="scale-105 sm:scale-110 transition-transform">
        <AuraLoader
          variant={variant}
          size={size}
          label={label}
          sublabel={sublabel}
          onDark={onDark}
        />
      </div>

      {/* Keyboard escape hint for interactive review */}
      {onClose && (
        <p className="mt-8 text-[11px] font-mono opacity-60">
          Click close or press anywhere to return to components playground
        </p>
      )}
    </aside>
  );
}

