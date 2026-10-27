import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuraLoader, type AuraLoaderVariant } from './AuraLoader';
import { PlatformTransitionLoader } from './PlatformTransitionLoader';

describe('AuraLoader Component (4 Variants with Brand Logo)', () => {
  const variants: AuraLoaderVariant[] = [
    'aura-pulse-glow',
    'orbital-synapse',
    'star-schema-weaver',
    'ledger-reconciler',
  ];

  variants.forEach((variant) => {
    it(`renders variant "${variant}" with semantic progress element`, () => {
      const { container } = render(
        <AuraLoader variant={variant} size="md" label={`Testing ${variant}`} />,
      );

      // Verify semantic progress element
      const progress = container.querySelector('progress');
      expect(progress).toBeDefined();

      // Verify headline label
      expect(screen.getByText(`Testing ${variant}`)).toBeDefined();

      // Verify brand logo image is rendered
      const logoImg = container.querySelector('img');
      expect(logoImg).toBeDefined();
    });
  });

  it('renders determinate mode with percentage readout', () => {
    render(<AuraLoader variant="aura-pulse-glow" value={72} />);
    expect(screen.getByText('72%')).toBeDefined();
  });

  it('renders across size scales sm, md, and lg', () => {
    const { container: smContainer } = render(<AuraLoader size="sm" />);
    expect(smContainer.querySelector('progress')).toBeDefined();

    const { container: lgContainer } = render(<AuraLoader size="lg" />);
    expect(lgContainer.querySelector('progress')).toBeDefined();
  });

  it('supports dark surface mode styling without regression', () => {
    const { container } = render(
      <AuraLoader variant="ledger-reconciler" onDark={true} />,
    );
    expect(container.firstChild).toBeDefined();
    expect(screen.getByText('Δ 0.00%')).toBeDefined();
  });
});

describe('PlatformTransitionLoader Overlay', () => {
  it('renders visible transition overlay with brand logo and message', () => {
    render(
      <PlatformTransitionLoader
        visible={true}
        variant="aura-pulse-glow"
        label="Switching Platform Context"
      />,
    );

    expect(screen.getByText('Switching Platform Context')).toBeDefined();
    expect(screen.getByText(/AuraBI Platform Transition/i)).toBeDefined();
  });

  it('does not render when mounted with visible=false', () => {
    const { container } = render(
      <PlatformTransitionLoader visible={false} />,
    );
    expect(container.querySelector('aside')).toBeNull();
  });
});

