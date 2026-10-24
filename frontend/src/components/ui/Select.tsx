import {
  useState,
  useRef,
  useEffect,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, Search, X } from 'lucide-react';
import { DropdownArrow } from './DropdownArrow';
import { cn } from '../../utils/cn';

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps<T extends string | number = string> {
  id?: string;
  value?: T;
  onChange?: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  searchable?: boolean;
  error?: boolean | string;
  className?: string;
  popoverClassName?: string;
  'aria-label'?: string;
  name?: string;
}

/**
 * Custom accessible Select dropdown for AuraBI.
 * Features keyboard navigation, custom DropdownArrow indicator,
 * typeahead filtering, and Brand Token aesthetics.
 */
export function Select<T extends string | number = string>({
  id: customId,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  size = 'md',
  searchable,
  error,
  className,
  popoverClassName,
  'aria-label': ariaLabel,
  name,
}: SelectProps<T>) {
  const generatedId = useId();
  const selectId = customId || generatedId;
  const listboxId = `${selectId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Auto-enable search if more than 8 options unless explicitly configured
  const isSearchable = searchable ?? options.length > 8;

  const filteredOptions = isSearchable && searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    : options;

  // Sync highlighted index when opening or filtering
  useEffect(() => {
    if (isOpen) {
      const idx = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
      if (isSearchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Click outside listener
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

  // Scroll active item into view safely
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const selectOption = (opt: SelectOption<T>) => {
    if (opt.disabled) return;
    onChange?.(opt.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < filteredOptions.length && filteredOptions[next].disabled) {
            next++;
          }
          return next < filteredOptions.length ? next : prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && filteredOptions[next].disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(filteredOptions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const sizeClasses = {
    sm: 'text-xs py-1.5 px-2.5 rounded-lg h-8',
    md: 'text-xs md:text-sm py-2 px-3 rounded-xl h-9 md:h-10',
    lg: 'text-sm md:text-base py-2.5 px-4 rounded-2xl h-11 md:h-12',
  }[size];

  const arrowSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full text-left font-sans', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for form integration */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value !== undefined ? String(value) : ''}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        style={{ backgroundColor: '#FDFFFC' }}
        className={cn(
          'w-full flex items-center justify-between gap-2 border text-[#334139] transition-all cursor-pointer select-none outline-none',
          sizeClasses,
          error
            ? 'border-rose-400 focus:ring-2 focus:ring-rose-400/20'
            : isOpen
            ? 'border-[#064C1C] ring-2 ring-[#064C1C]/15 shadow-sm'
            : 'border-[#334139]/20 hover:border-[#334139]/40 hover:bg-[#334139]/[0.02]',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none bg-[#334139]/5',
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 text-[#064C1C] flex items-center">
              {selectedOption.icon}
            </span>
          )}
          <span
            className={cn(
              'truncate font-medium',
              !selectedOption && 'text-[#334139]/40 font-normal',
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#064C1C]/10 text-[#064C1C]">
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Custom Dropdown Arrow */}
        <DropdownArrow
          isOpen={isOpen}
          size={arrowSize}
          className={cn(
            'text-[#334139]/50 transition-colors',
            isOpen ? 'text-[#064C1C]' : 'group-hover:text-[#334139]',
          )}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          style={{ backgroundColor: '#FDFFFC' }}
          className={cn(
            'absolute left-0 right-0 z-50 mt-1.5 rounded-2xl border border-[#334139]/15 shadow-xl overflow-hidden animate-fadeIn',
            popoverClassName,
          )}
        >
          {/* Optional Search Input */}
          {isSearchable && (
            <div className="p-2 border-b border-[#334139]/10 bg-[#334139]/[0.02]">
              <div className="relative flex items-center">
                <Search
                  size={13}
                  className="absolute left-2.5 text-[#334139]/40 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Filter options..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs font-sans bg-white border border-[#334139]/15 rounded-lg outline-none text-[#334139] placeholder:text-[#334139]/40 focus:border-[#064C1C]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-[#334139]/40 hover:text-[#334139] p-0.5 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel || placeholder}
            className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar text-xs"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-3 text-center text-[11px] text-[#334139]/50 font-sans">
                No matching options
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => selectOption(opt)}
                    onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer select-none',
                      isSelected
                        ? 'bg-[#064C1C]/10 text-[#064C1C] font-semibold'
                        : isHighlighted
                        ? 'bg-[#334139]/[0.05] text-[#334139]'
                        : 'text-[#334139]/90',
                      opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && (
                        <span
                          className={cn(
                            'shrink-0 text-sm flex items-center',
                            isSelected ? 'text-[#064C1C]' : 'text-[#334139]/60',
                          )}
                        >
                          {opt.icon}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{opt.label}</span>
                          {opt.badge && (
                            <span className="shrink-0 text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#064C1C]/10 text-[#064C1C]">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <p className="text-[10.5px] font-normal text-[#334139]/55 truncate mt-0.5">
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={13} strokeWidth={3} className="text-[#064C1C] shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Error message */}
      {typeof error === 'string' && (
        <p className="text-[11px] text-rose-600 font-sans mt-1">{error}</p>
      )}
    </div>
  );
}
