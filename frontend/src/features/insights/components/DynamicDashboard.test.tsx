import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicDashboardView } from './DynamicDashboardView';
import { WaterfallGraph } from './WaterfallGraph';
import { CohortDecayGraph } from './CohortDecayGraph';
import { StateFlowFunnelGraph } from './StateFlowFunnelGraph';
import { AnomalyRibbonGraph } from './AnomalyRibbonGraph';
import { AI_PROPOSED_INSIGHTS } from '../data/mockInsightData';

describe('Insights dashboard', () => {
  it('renders every AI-proposed insight', () => {
    render(<DynamicDashboardView />);
    for (const i of AI_PROPOSED_INSIGHTS) {
      expect(screen.getByText(i.title)).toBeInTheDocument();
    }
  });

  it('filters insights by category tab', () => {
    render(<DynamicDashboardView />);
    fireEvent.click(screen.getByRole('button', { name: 'Customers' }));
    expect(screen.getByText('Customer retention by segment')).toBeInTheDocument();
    expect(screen.queryByText('Where revenue leaks')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Where revenue leaks')).toBeInTheDocument();
  });

  it('renders the waterfall chart legend', () => {
    render(<WaterfallGraph data={AI_PROPOSED_INSIGHTS[0].waterfallData!} />);
    expect(screen.getByText('Deductions')).toBeInTheDocument();
  });

  it('renders the cohort chart legend', () => {
    render(<CohortDecayGraph data={AI_PROPOSED_INSIGHTS[1].cohortData!} />);
    expect(screen.getByText('Self-serve')).toBeInTheDocument();
  });

  it('renders the stage wait chart and flags the bottleneck', () => {
    render(<StateFlowFunnelGraph stages={AI_PROPOSED_INSIGHTS[2].stateFlowData!} />);
    expect(screen.getByText('Bottleneck')).toBeInTheDocument();
  });

  it('renders the anomaly chart legend', () => {
    render(<AnomalyRibbonGraph data={AI_PROPOSED_INSIGHTS[3].anomalyData!} />);
    expect(screen.getByText('Expected range')).toBeInTheDocument();
  });
});
