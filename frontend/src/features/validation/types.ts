export type AuditDataDomain = 'finance' | 'operations';

export interface FinancialReconciliationItem {
  id: string;
  kpiName: string;
  category: 'Revenue' | 'Tax' | 'Disputes' | 'Volume' | 'Cashflow';
  sourceLedger: {
    system: string;
    value: number;
    formatted: string;
  };
  warehouse: {
    layer: string;
    value: number;
    formatted: string;
  };
  martKpi: {
    target: string;
    value: number;
    formatted: string;
  };
  variance: number;
  varianceFormatted: string;
  tolerance: string;
  status: 'RECONCILED' | 'VARIANCE_DETECTED';
  formula: string;
  assertionSql: string;
  lastAuditedAt: string;
}

export interface RowConservationStage {
  id: string;
  stageName: string;
  sourceLayer: string;
  targetLayer: string;
  rowsIn: number;
  rowsOut: number;
  rowsFiltered: number;
  rowsQuarantined: number;
  conservationDelta: number; // rowsIn - (rowsOut + rowsFiltered + rowsQuarantined)
  isConserved: boolean;
  status: 'CONSERVED' | 'LEAKAGE_DETECTED';
  notes: string;
}

export interface StateTransitionAuditItem {
  id: string;
  entityName: string;
  fromState: string;
  toState: string;
  transitionCount: number;
  completionRate: string;
  orphanCount: number;
  illegalSkips: number;
  averageLatency: string;
  status: 'OPTIMAL' | 'ANOMALY_FLAGGED';
}

export interface AuditorVerificationSealData {
  auditorId: string;
  auditorRole: string;
  separationOfDuties: string;
  verifiedAt: string;
  cryptoSignature: string;
  domain: AuditDataDomain;
  overallStatus: 'VERIFIED_ZERO_VARIANCE' | 'VERIFIED_WITH_WARNINGS' | 'AUDIT_FAILED';
}

