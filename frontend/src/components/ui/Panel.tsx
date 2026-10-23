import React from 'react';
import { cn } from '../../utils/cn';

interface PanelProps {
  className?: string;
  children: React.ReactNode;
}

/** White surface panel with slate border, matching the design system. */
export function Panel({ className, children }: PanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PanelHeader({ title, subtitle, icon, actions }: PanelHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b border-slate-150 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h3 className="text-sm font-sans font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
