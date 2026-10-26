import { cn } from '../../utils/cn';

export interface DropdownArrowProps {
  /** Whether the associated dropdown menu is open (controls 180° rotation) */
  isOpen?: boolean;
  /** Size in pixels (default: 14) */
  size?: number;
  /** Optional additional class names */
  className?: string;
  /** Arrow color / tone */
  color?: string;
  /** Variant style: 'chevron' (default rounded chevron) | 'caret' (solid geometric caret) */
  variant?: 'chevron' | 'caret';
}

/**
 * Bespoke Dropdown Arrow for the AuraBI design system.
 * Features rounded caps, dynamic rotation on toggle, and brand-aligned styling.
 */
export function DropdownArrow({
  isOpen = false,
  size = 14,
  className,
  color = 'currentColor',
  variant = 'chevron',
}: DropdownArrowProps) {
  if (variant === 'caret') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={cn(
          'transition-transform duration-200 ease-out shrink-0 select-none pointer-events-none',
          isOpen ? 'rotate-180' : 'rotate-0',
          className,
        )}
      >
        <path
          d="M4.5 6.5L8 10.5L11.5 6.5H4.5Z"
          fill={color}
          stroke={color}
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn(
        'transition-transform duration-200 ease-out shrink-0 select-none pointer-events-none',
        isOpen ? 'rotate-180' : 'rotate-0',
        className,
      )}
    >
      <path
        d="M3.75 6L8 10.25L12.25 6"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

