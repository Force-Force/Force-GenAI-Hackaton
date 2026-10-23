import {
  Database,
  FileSpreadsheet,
  FileJson,
  FileText,
  FileCode,
  Globe,
  Cloud,
  CreditCard,
  Users,
  Leaf,
  Boxes,
  Code2,
  type LucideIcon,
} from 'lucide-react';
import type {
  ProcessingNodeData,
  ResourceNodeData,
  SourceFormat,
  TransformEngine,
} from '../../../types/pipeline';

export interface TechBadge {
  label: string;
  Icon: LucideIcon;
  /** Tailwind classes for the icon tile. */
  tile: string;
  /** Tailwind classes for the small text badge. */
  badge: string;
}

const SOURCE_META: Record<SourceFormat, TechBadge> = {
  csv: {
    label: 'CSV',
    Icon: FileText,
    tile: 'bg-emerald-100 text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700',
  },
  xlsx: {
    label: 'XLSX',
    Icon: FileSpreadsheet,
    tile: 'bg-green-100 text-green-700',
    badge: 'bg-green-50 text-green-700',
  },
  json: {
    label: 'JSON',
    Icon: FileJson,
    tile: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-50 text-amber-700',
  },
  parquet: {
    label: 'Parquet',
    Icon: Boxes,
    tile: 'bg-orange-100 text-orange-700',
    badge: 'bg-orange-50 text-orange-700',
  },
  api: {
    label: 'REST API',
    Icon: Globe,
    tile: 'bg-sky-100 text-sky-700',
    badge: 'bg-sky-50 text-sky-700',
  },
  postgresql: {
    label: 'PostgreSQL',
    Icon: Database,
    tile: 'bg-sky-100 text-sky-700',
    badge: 'bg-sky-50 text-sky-700',
  },
  mysql: {
    label: 'MySQL',
    Icon: Database,
    tile: 'bg-orange-100 text-orange-700',
    badge: 'bg-orange-50 text-orange-700',
  },
  snowflake: {
    label: 'Snowflake',
    Icon: Cloud,
    tile: 'bg-cyan-100 text-cyan-700',
    badge: 'bg-cyan-50 text-cyan-700',
  },
  salesforce: {
    label: 'Salesforce',
    Icon: Users,
    tile: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-50 text-blue-700',
  },
  stripe: {
    label: 'Stripe',
    Icon: CreditCard,
    tile: 'bg-violet-100 text-violet-700',
    badge: 'bg-violet-50 text-violet-700',
  },
  mongodb: {
    label: 'MongoDB',
    Icon: Leaf,
    tile: 'bg-green-100 text-green-700',
    badge: 'bg-green-50 text-green-700',
  },
  generic: {
    label: 'Source',
    Icon: Database,
    tile: 'bg-slate-100 text-slate-600',
    badge: 'bg-slate-50 text-slate-600',
  },
};

const ENGINE_META: Record<TransformEngine, TechBadge> = {
  sql: {
    label: 'SQL',
    Icon: Database,
    tile: 'bg-sky-100 text-sky-700',
    badge: 'bg-sky-50 text-sky-700',
  },
  python: {
    label: 'Python',
    Icon: FileCode,
    tile: 'bg-yellow-100 text-yellow-700',
    badge: 'bg-yellow-50 text-yellow-700',
  },
  spark: {
    label: 'Spark',
    Icon: Boxes,
    tile: 'bg-orange-100 text-orange-700',
    badge: 'bg-orange-50 text-orange-700',
  },
  pandas: {
    label: 'Pandas',
    Icon: Code2,
    tile: 'bg-indigo-100 text-indigo-700',
    badge: 'bg-indigo-50 text-indigo-700',
  },
  dbt: {
    label: 'dbt',
    Icon: Boxes,
    tile: 'bg-rose-100 text-rose-700',
    badge: 'bg-rose-50 text-rose-700',
  },
};

/** Best-effort source format detection from explicit field, metadata, or label. */
export function resolveSourceFormat(data: ResourceNodeData): SourceFormat {
  if (data.format) return data.format;
  const hint = `${String(data.metadata?.source ?? '')} ${data.label}`.toLowerCase();
  const match = (Object.keys(SOURCE_META) as SourceFormat[]).find(
    (key) => key !== 'generic' && hint.includes(key),
  );
  return match ?? (data.kind === 'database' ? 'postgresql' : 'generic');
}

export function sourceBadge(data: ResourceNodeData): TechBadge {
  return SOURCE_META[resolveSourceFormat(data)];
}

export function resolveEngine(data: ProcessingNodeData): TransformEngine {
  return data.engine ?? data.language;
}

export function engineBadge(data: ProcessingNodeData): TechBadge {
  return ENGINE_META[resolveEngine(data)];
}
