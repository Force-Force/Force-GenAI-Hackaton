import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type ReactElement,
  cloneElement,
} from 'react';
import { DropdownArrow } from './DropdownArrow';
import { cn } from '../../utils/cn';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  dividerBefore?: boolean;
}

export interface DropdownProps {
  /** Custom trigger element or string label */
  trigger: ReactNode;
  /** List of dropdown actions */
  items: DropdownItem[];
  /** Alignment of popover: 'left' | 'right' */
  align?: 'left' | 'right';
  /** Optional custom width */
  width?: string;
  /** Whether to show the DropdownArrow on button triggers automatically */
  showArrow?: boolean;
  className?: string;
  menuClassName?: string;
}

/**
 * Custom Dropdown Menu for contextual actions and toolbars in AuraBI.
 */
export function Dropdown({
  trigger,
  items,
  align = 'right',
  width = 'w-52',
  showArrow = true,
  className,
  menuClassName,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick?.();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* Trigger */}
      {typeof trigger === 'string' ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer select-none"
        >
          <span>{trigger}</span>
          {showArrow && <DropdownArrow isOpen={isOpen} size={13} className="text-[#334139]/60" />}
        </button>
      ) : (
        <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
          {trigger}
        </div>
      )}

      {/* Popover Menu */}
      {isOpen && (
        <div
          style={{ backgroundColor: '#FDFFFC' }}
          className={cn(
            'absolute z-50 mt-1.5 rounded-2xl border border-[#334139]/15 shadow-xl p-1.5 animate-fadeIn text-xs font-sans',
            width,
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {items.map((item) => (
            <div key={item.id}>
              {item.dividerBefore && (
                <div className="my-1 border-t border-[#334139]/10" role="separator" />
              )}
              <button
                type="button"
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={cn(
                  'w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer select-none text-left',
                  item.danger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-[#334139] hover:bg-[#334139]/[0.05]',
                  item.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.icon && <span className="shrink-0 text-sm">{item.icon}</span>}
                  <span className="truncate font-medium">{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-[10px] font-mono text-[#334139]/40 tracking-wider">
                    {item.shortcut}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

