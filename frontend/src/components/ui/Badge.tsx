import React from 'react';
import { cn } from '../../utils/cn';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  primary: 'bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/20',
  success: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
  warning: 'bg-amber-50 text-amber-600 border-amber-200/60',
  danger: 'bg-rose-50 text-rose-600 border-rose-200/60',
  info: 'bg-sky-50 text-sky-700 border-sky-200/60',
};

interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
