import { useState, useMemo } from 'react';
import { Landmark, Boxes, Sparkles, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import type { AuditDataDomain, FinancialReconciliationItem } from '../types';
import {
  INITIAL_FINANCIAL_RECONCILIATION,
  INITIAL_ROW_CONSERVATION,
  INITIAL_STATE_TRANSITIONS,
} from '../data/mockAuditData';
import { ReconciliationTable } from './ReconciliationTable';
import { OperationsAuditView } from './OperationsAuditView';

interface DomainAuditRendererProps {
  onStatusChange?: (hasVariance: boolean) => void;
}

export function DomainAuditRenderer({ onStatusChange }: DomainAuditRendererProps) {
  const nodes = usePipelineStore((s) => s.nodes);

  // 1. Detect domain adaptively from pipeline schema nodes
  const detectedDomain: AuditDataDomain = useMemo(() => {
    const nodeNames = nodes
      .map((n) => `${n.data?.label || ''} ${n.data?.description || ''}`)
      .join(' ')
      .toLowerCase();

    if (
      nodeNames.includes('inventory') ||
      nodeNames.includes('shipment') ||
      nodeNames.includes('wms') ||
      nodeNames.includes('sku') ||
      nodeNames.includes('logistics')
    ) {
      return 'operations';
    }
    // Default to finance / accounting for the retail lakehouse
    return 'finance';
  }, [nodes]);

  // User override for the detected domain
  const [selectedDomain, setSelectedDomain] = useState<AuditDataDomain | null>(null);
  const activeDomain = selectedDomain ?? detectedDomain;

  // Financial reconciliation state (with interactive variance toggle)
  const [financialItems, setFinancialItems] = useState<FinancialReconciliationItem[]>(
    INITIAL_FINANCIAL_RECONCILIATION,
  );
  const [isSimulating, setIsSimulating] = useState(false);

  const toggleSimulatedVariance = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setFinancialItems((prev) => {
        const hasVariance = prev.some((i) => i.status === 'VARIANCE_DETECTED');
        if (hasVariance) {
          // Resolve all variances to 0.00 (Emerald)
          const resolved = prev.map((item) => ({
            ...item,
            warehouse: { ...item.warehouse, value: item.sourceLedger.value, formatted: item.sourceLedger.formatted },
            martKpi: { ...item.martKpi, value: item.sourceLedger.value, formatted: item.sourceLedger.formatted },
            variance: 0.0,
            varianceFormatted: '$0.00 (0.00%)',
            status: 'RECONCILED' as const,
          }));
          onStatusChange?.(false);
          return resolved;
        } else {
          // Inject a discrepancy in Chargeback Reserve & Revenue to test Rose alert
          const withVariance = prev.map((item) => {
            if (item.id === 'kpi-fin-05') {
              return {
                ...item,
                martKpi: { ...item.martKpi, value: 14350.0, formatted: '$14,350.00' },
                variance: 150.0,
                varianceFormatted: '+$150.00 (+1.05%)',
                status: 'VARIANCE_DETECTED' as const,
              };
            }
            return item;
          });
          onStatusChange?.(true);
          return withVariance;
        }
      });
      setIsSimulating(false);
    }, 400);
  };

  return (
    <div className="space-y-5">
      {/* Domain Adaptive Switcher Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#064C1C]/[0.03] border border-[#064C1C]/15">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#064C1C] text-[#FDFFFC] flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1E2D24]">
                Domain-Adaptive Audit Engine
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#064C1C]/10 text-[#064C1C] font-semibold">
                Detected: {detectedDomain === 'finance' ? 'Finance / Accounting' : 'Operations / Inventory'}
              </span>
            </div>
            <p className="text-[11px] text-[#334139]/65">
              UI components dynamically specialize according to the underlying business domain.
            </p>
          </div>
        </div>

        {/* Domain Selectors */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#334139]/15 shadow-2xs">
          <button
            type="button"
            onClick={() => setSelectedDomain('finance')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activeDomain === 'finance'
                ? 'bg-[#064C1C] text-[#FDFFFC] shadow-2xs'
                : 'text-[#334139]/70 hover:text-[#334139] hover:bg-[#334139]/5',
            )}
          >
            <Landmark size={13} />
            <span>Finance / Accounting</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDomain('operations')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activeDomain === 'operations'
                ? 'bg-[#064C1C] text-[#FDFFFC] shadow-2xs'
                : 'text-[#334139]/70 hover:text-[#334139] hover:bg-[#334139]/5',
            )}
          >
            <Boxes size={13} />
            <span>Operations / Inventory</span>
          </button>
        </div>
      </div>

      {/* Render Domain-Specific Audit Component */}
      {activeDomain === 'finance' ? (
        <ReconciliationTable
          items={financialItems}
          onToggleSimulatedVariance={toggleSimulatedVariance}
          isSimulating={isSimulating}
        />
      ) : (
        <OperationsAuditView
          conservationStages={INITIAL_ROW_CONSERVATION}
          stateTransitions={INITIAL_STATE_TRANSITIONS}
        />
      )}
    </div>
  );
}

