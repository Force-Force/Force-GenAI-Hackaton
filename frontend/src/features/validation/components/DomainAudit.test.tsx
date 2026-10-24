import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentTaskList } from '../../chat/components/AgentTaskList';
import { ReconciliationTable } from './ReconciliationTable';
import { OperationsAuditView } from './OperationsAuditView';
import { DomainAuditRenderer } from './DomainAuditRenderer';
import {
  INITIAL_FINANCIAL_RECONCILIATION,
  INITIAL_ROW_CONSERVATION,
  INITIAL_STATE_TRANSITIONS,
} from '../data/mockAuditData';

describe('Independent Audit Center (UC-10)', () => {
  describe('AgentTaskList: Visual Separation of Builder vs. Auditor', () => {
    it('filters out AUDITOR tasks from the delegated builder agent list', () => {
      const mockTasks = [
        { id: '1', agent_role: 'ENGINEER', instruction: 'Build bronze tables', status: 'COMPLETED' as const },
        { id: '2', agent_role: 'AUDITOR', instruction: 'Audit revenue variances', status: 'RUNNING' as const },
        { id: '3', agent_role: 'ANALYST', instruction: 'Profile dimension cardinality', status: 'PENDING' as const },
      ];

      render(<AgentTaskList tasks={mockTasks} />);

      // Builders should be rendered
      expect(screen.getByText('ENGINEER')).toBeInTheDocument();
      expect(screen.getByText('ANALYST')).toBeInTheDocument();
      expect(screen.getByText('Delegated Builder Agents (2)')).toBeInTheDocument();

      // AUDITOR should NOT be in the builder list
      expect(screen.queryByText('Audit revenue variances')).not.toBeInTheDocument();

      // Independent Audit isolation note should be present
      expect(screen.getByText(/Independent Audit Agent task segregated/i)).toBeInTheDocument();
    });
  });

  describe('ReconciliationTable: Financial & Accounting Audit', () => {
    it('renders Source Ledger, Warehouse, and Mart KPI Totals with variance styling', () => {
      render(<ReconciliationTable items={INITIAL_FINANCIAL_RECONCILIATION} />);

      expect(screen.getByText('Net Recognized Revenue')).toBeInTheDocument();
      expect(screen.getByText('Stripe Settlement Ledger')).toBeInTheDocument();
      expect(screen.getByText('fact_daily_revenue (Gold)')).toBeInTheDocument();

      // Reconciled rows show Zero Variance
      expect(screen.getAllByText('Zero Variance').length).toBeGreaterThan(0);
      expect(screen.getAllByText('PASS').length).toBeGreaterThan(0);

      // Discrepancy row should show variance and FLAGGED badge
      expect(screen.getByText('Disputed Chargeback Reserve')).toBeInTheDocument();
      expect(screen.getByText('FLAGGED')).toBeInTheDocument();
    });

    it('filters items by Reconciled and Variances pills', () => {
      render(<ReconciliationTable items={INITIAL_FINANCIAL_RECONCILIATION} />);

      const variancePill = screen.getByRole('button', { name: /Variances \(/i });
      fireEvent.click(variancePill);

      expect(screen.getByText('Disputed Chargeback Reserve')).toBeInTheDocument();
      expect(screen.queryByText('Net Recognized Revenue')).not.toBeInTheDocument();
    });
  });

  describe('OperationsAuditView: Row Conservation & State Transitions', () => {
    it('renders row conservation matrices with delta calculations', () => {
      render(
        <OperationsAuditView
          conservationStages={INITIAL_ROW_CONSERVATION}
          stateTransitions={INITIAL_STATE_TRANSITIONS}
        />,
      );

      expect(screen.getByText(/1\. Stage-to-Stage Row Conservation Matrix/i)).toBeInTheDocument();
      expect(screen.getByText(/100% ROWS CONSERVED/i)).toBeInTheDocument();
      expect(screen.getByText('Stage 01: Bronze Raw Ingestion → Silver Cleansing')).toBeInTheDocument();
      expect(screen.getAllByText('Δ = 0 (Conserved)').length).toBeGreaterThan(0);
    });

    it('renders state transition completeness table with FSM checks', () => {
      render(
        <OperationsAuditView
          conservationStages={INITIAL_ROW_CONSERVATION}
          stateTransitions={INITIAL_STATE_TRANSITIONS}
        />,
      );

      expect(screen.getByText(/2\. State-Transition Completeness Table/i)).toBeInTheDocument();
      expect(screen.getAllByText('ORDER_PLACED').length).toBeGreaterThan(0);
      expect(screen.getAllByText('PAYMENT_CONFIRMED').length).toBeGreaterThan(0);
      expect(screen.getByText('Customer Order')).toBeInTheDocument();
    });
  });

  describe('DomainAuditRenderer: Adaptive Selection', () => {
    it('switches between Finance and Operations domain views', () => {
      render(<DomainAuditRenderer />);

      // Default detected is Finance
      expect(screen.getByText('Net Recognized Revenue')).toBeInTheDocument();

      // Switch to Operations
      const opsButton = screen.getByRole('button', { name: /Operations \/ Inventory/i });
      fireEvent.click(opsButton);

      expect(screen.getByText(/Row Conservation Matrix/i)).toBeInTheDocument();
      expect(screen.queryByText('Net Recognized Revenue')).not.toBeInTheDocument();
    });
  });
});
