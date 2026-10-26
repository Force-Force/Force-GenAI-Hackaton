import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select, type SelectOption } from './Select';
import { DropdownArrow } from './DropdownArrow';

const sampleOptions: SelectOption[] = [
  { value: 'postgres', label: 'PostgreSQL Database', description: 'Port 5432' },
  { value: 'snowflake', label: 'Snowflake Mart', badge: 'Cloud' },
  { value: 'duckdb', label: 'DuckDB In-Memory' },
  { value: 'stripe', label: 'Stripe Events API', disabled: true },
];

describe('DropdownArrow Component', () => {
  it('renders without error and toggles rotation class based on isOpen', () => {
    const { container, rerender } = render(<DropdownArrow isOpen={false} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.classList.contains('rotate-0')).toBe(true);

    rerender(<DropdownArrow isOpen={true} />);
    expect(svg?.classList.contains('rotate-180')).toBe(true);
  });

  it('renders caret variant properly', () => {
    const { container } = render(<DropdownArrow variant="caret" isOpen={true} />);
    const path = container.querySelector('path');
    expect(path?.getAttribute('d')).toContain('M4.5 6.5');
  });
});

describe('Custom Select Component', () => {
  it('renders placeholder when no value is provided', () => {
    render(<Select options={sampleOptions} placeholder="Choose warehouse..." />);
    expect(screen.getByText('Choose warehouse...')).toBeDefined();
  });

  it('renders selected option label and badge', () => {
    render(<Select options={sampleOptions} value="snowflake" />);
    expect(screen.getByText('Snowflake Mart')).toBeDefined();
    expect(screen.getByText('Cloud')).toBeDefined();
  });

  it('opens options list on click and selects an item', () => {
    const handleChange = vi.fn();
    render(<Select options={sampleOptions} onChange={handleChange} />);

    const trigger = screen.getByRole('button');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    // Open dropdown
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('listbox')).toBeDefined();

    // Select PostgreSQL
    const option = screen.getByText('PostgreSQL Database');
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith('postgres');
  });

  it('supports keyboard navigation with ArrowDown and Enter', () => {
    const handleChange = vi.fn();
    render(<Select options={sampleOptions} onChange={handleChange} />);

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Press ArrowDown to move to next item and Enter to choose
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalled();
  });

  it('closes on Escape key', () => {
    render(<Select options={sampleOptions} />);
    const trigger = screen.getByRole('button');

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeDefined();

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('does not select disabled options', () => {
    const handleChange = vi.fn();
    render(<Select options={sampleOptions} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button'));
    const disabledOption = screen.getByText('Stripe Events API');
    fireEvent.click(disabledOption);

    expect(handleChange).not.toHaveBeenCalled();
  });
});

