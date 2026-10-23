import React from 'react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold ' +
  'transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/50';

const variants: Record<Variant, string> = {
  primary:
    'bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white',
  secondary:
    'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white',
  danger:
    'bg-white hover:bg-rose-50 text-[#EF4444] border border-[#EF4444]/30 hover:border-[#EF4444]',
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
