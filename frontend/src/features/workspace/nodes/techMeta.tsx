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
  /** Tailwind classes for the icon tile (light + dark). */
  tile: string;
  /** Tailwind classes for the small text badge (light + dark). */
  badge: string;
}

const SOURCE_META: Record<SourceFormat, TechBadge> = {
  csv: {
    label: 'CSV',
    Icon: FileText,
    tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  xlsx: {
    label: 'XLSX',
    Icon: FileSpreadsheet,
    tile: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
    badge: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300',
  },
  json: {
    label: 'JSON',
    Icon: FileJson,
    tile: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  parquet: {
    label: 'Parquet',
    Icon: Boxes,
    tile: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  },
  api: {
    label: 'REST API',
    Icon: Globe,
    tile: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  },
  postgresql: {
    label: 'PostgreSQL',
    Icon: Database,
    tile: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  },
  mysql: {
    label: 'MySQL',
    Icon: Database,
    tile: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  },
  snowflake: {
    label: 'Snowflake',
    Icon: Cloud,
    tile: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300',
  },
  salesforce: {
    label: 'Salesforce',
    Icon: Users,
    tile: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  },
  stripe: {
    label: 'Stripe',
    Icon: CreditCard,
    tile: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  },
  mongodb: {
    label: 'MongoDB',
    Icon: Leaf,
    tile: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
    badge: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300',
  },
  generic: {
    label: 'Source',
    Icon: Database,
    tile: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    badge: 'bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
};

const ENGINE_META: Record<TransformEngine, TechBadge> = {
  sql: {
    label: 'SQL',
    Icon: Database,
    tile: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  },
  python: {
    label: 'Python',
    Icon: FileCode,
    tile: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300',
    badge: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300',
  },
  spark: {
    label: 'Spark',
    Icon: Boxes,
    tile: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  },
  pandas: {
    label: 'Pandas',
    Icon: Code2,
    tile: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  },
  dbt: {
    label: 'dbt',
    Icon: Boxes,
    tile: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
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
