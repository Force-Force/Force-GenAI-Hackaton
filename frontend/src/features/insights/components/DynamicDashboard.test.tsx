import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicDashboardView } from './DynamicDashboardView';
import { WaterfallGraph } from './WaterfallGraph';
import { CohortDecayGraph } from './CohortDecayGraph';
import { StateFlowFunnelGraph } from './StateFlowFunnelGraph';
import { AnomalyRibbonGraph } from './AnomalyRibbonGraph';
import { AI_PROPOSED_INSIGHTS } from '../data/mockInsightData';

describe('AI Dynamic Insights Dashboard', () => {
  it('renders dynamic insights proposed by the AI', () => {
    render(<DynamicDashboardView />);

    expect(screen.getByText('Revenue Decomposition & Leakage Waterfall')).toBeInTheDocument();
    expect(screen.getByText('Vintage Cohort Decay & Expansion Trajectory')).toBeInTheDocument();
    expect(screen.getByText('Order State-Flow Conservation & Bottleneck Funnel')).toBeInTheDocument();
    expect(screen.getByText('Dynamic Confidence Band Ribbon (±2σ)')).toBeInTheDocument();
  });

  it('filters insights by domain pill selection', () => {
    render(<DynamicDashboardView />);

    // Click on 'Cohorts & LTV'
    const cohortBtn = screen.getByRole('button', { name: /^Cohorts & LTV/i });
    fireEvent.click(cohortBtn);

    expect(screen.getByText('Vintage Cohort Decay & Expansion Trajectory')).toBeInTheDocument();
    expect(screen.queryByText('Revenue Decomposition & Leakage Waterfall')).not.toBeInTheDocument();

    // Click 'All'
    const allBtn = screen.getByRole('button', { name: /^All \(/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('Revenue Decomposition & Leakage Waterfall')).toBeInTheDocument();
  });

  it('switches to Table Ledger view mode and back to AI Dashboard', () => {
    render(<DynamicDashboardView />);

    const ledgerBtn = screen.getByRole('button', { name: /Table Ledger/i });
    fireEvent.click(ledgerBtn);

    expect(screen.getByText('Underlying Financial Reconciliation Ledger')).toBeInTheDocument();
    expect(screen.getByText('Operations Conservation & State Transitions')).toBeInTheDocument();

    const aiBtn = screen.getByRole('button', { name: /AI Dashboard/i });
    fireEvent.click(aiBtn);

    expect(screen.getByText('Revenue Decomposition & Leakage Waterfall')).toBeInTheDocument();
  });

  it('renders WaterfallGraph with gross base and deductions', () => {
    const salesInsight = AI_PROPOSED_INSIGHTS[0];
    render(<WaterfallGraph data={salesInsight.waterfallData!} />);

    expect(screen.getByText('Gross Base')).toBeInTheDocument();
    expect(screen.getByText('Deductions & Fees')).toBeInTheDocument();
    expect(screen.getByText('Final Net Realized')).toBeInTheDocument();
    expect(screen.getByText('Gross Billings')).toBeInTheDocument();
    expect(screen.getByText('Gateway Fees')).toBeInTheDocument();
    expect(screen.getByText('Net Recognized Mart')).toBeInTheDocument();
  });

  it('renders CohortDecayGraph with vintage periods', () => {
    const cohortInsight = AI_PROPOSED_INSIGHTS[1];
    render(<CohortDecayGraph data={cohortInsight.cohortData!} />);

    expect(screen.getByText(/Enterprise Tier \(Expansion\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Self-Serve Tier \(Decay\)/i)).toBeInTheDocument();
    expect(screen.getByText('Day 0')).toBeInTheDocument();
    expect(screen.getByText('Day 120')).toBeInTheDocument();
  });

  it('renders StateFlowFunnelGraph with stage metrics', () => {
    const opsInsight = AI_PROPOSED_INSIGHTS[2];
    render(<StateFlowFunnelGraph stages={opsInsight.stateFlowData!} />);

    expect(screen.getByText('STAGE 01')).toBeInTheDocument();
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('STAGE 03')).toBeInTheDocument();
    expect(screen.getByText('Warehouse Allocated')).toBeInTheDocument();
    expect(screen.getByText('Bottleneck')).toBeInTheDocument();
  });

  it('renders AnomalyRibbonGraph with confidence band notes', () => {
    const anomalyInsight = AI_PROPOSED_INSIGHTS[3];
    render(<AnomalyRibbonGraph data={anomalyInsight.anomalyData!} />);

    expect(screen.getByText(/Actual Sales Volume/i)).toBeInTheDocument();
    expect(screen.getByText(/Expected Confidence Band/i)).toBeInTheDocument();
    expect(screen.getByText(/Detected Anomaly/i)).toBeInTheDocument();
    expect(screen.getByText('Oct 18')).toBeInTheDocument();
  });
});

