import type { ResourceNodeData, WarehouseRole } from '../../../types/pipeline';

export interface NodeColor {
  header: string;
  selectedBorder: string;
  ring: string;
}

const roleColors: Record<WarehouseRole, NodeColor> = {
  fact: { header: 'bg-[#4F46E5]', selectedBorder: 'border-[#4F46E5]', ring: 'ring-[#4F46E5]/40' },
  dimension: { header: 'bg-sky-600', selectedBorder: 'border-[#06B6D4]', ring: 'ring-[#06B6D4]/40' },
  source: { header: 'bg-emerald-600', selectedBorder: 'border-[#10B981]', ring: 'ring-[#10B981]/40' },
  generated: { header: 'bg-[#A855F7]', selectedBorder: 'border-[#A855F7]', ring: 'ring-[#A855F7]/40' },
};

const defaultColor: NodeColor = {
  header: 'bg-slate-600',
  selectedBorder: 'border-slate-400',
  ring: 'ring-slate-400/40',
};

export function resourceColor(data: ResourceNodeData): NodeColor {
  return data.warehouseRole ? roleColors[data.warehouseRole] : defaultColor;
}

export const processingColor: NodeColor = {
  header: 'bg-[#A855F7]',
  selectedBorder: 'border-[#A855F7]',
  ring: 'ring-[#A855F7]/40',
};

export const datamartColor: NodeColor = {
  header: 'bg-amber-500',
  selectedBorder: 'border-amber-500',
  ring: 'ring-amber-500/40',
};
