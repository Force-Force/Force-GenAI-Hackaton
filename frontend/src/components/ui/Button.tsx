import React from 'react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * Tactile pill button matching the design system: 1px border + 3px bottom
 * border that lifts on hover and presses down on active.
 */
const base =
  'inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-bold ' +
  'transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/50';

const variants: Record<Variant, string> = {
  primary:
    'bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white border-b-[3px] border-indigo-800 ' +
    'hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] shadow-md shadow-[#4F46E5]/10',
  secondary:
    'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 border-b-[3px] border-b-slate-300 ' +
    'hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px]',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white border-b-[3px] border-emerald-800 ' +
    'hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px]',
  danger:
    'bg-white text-[#EF4444] border border-[#EF4444]/30 hover:border-[#EF4444] border-b-[3px] border-b-rose-200 ' +
    'hover:bg-[#EF4444]/5 active:border-b-[1px] active:translate-y-[1.5px]',
  ghost:
    'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], 'px-4 py-1.5', className)}
      {...rest}
    >
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
