import Papa from 'papaparse';
import type { Column } from '../../types/pipeline';

export interface CsvParseResult {
  ok: boolean;
  tableName: string;
  columns: Column[];
  rowCount: number;
  errors: string[];
}

/** Normalize a header into a safe snake_case column identifier. */
function sanitize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'column';
}

function inferType(values: string[]): string {
  const sample = values.filter((v) => v !== undefined && v !== null && v !== '').slice(0, 50);
  if (sample.length === 0) return 'VARCHAR(255)';

  const allInt = sample.every((v) => /^-?\d+$/.test(v));
  if (allInt) return 'INT';

  const allNum = sample.every((v) => /^-?\d*\.?\d+$/.test(v));
  if (allNum) return 'DECIMAL(12,2)';

  const allBool = sample.every((v) => /^(true|false|0|1)$/i.test(v));
  if (allBool) return 'BOOLEAN';

  const allDate = sample.every((v) => !Number.isNaN(Date.parse(v)) && /\d{4}/.test(v));
  if (allDate) return 'TIMESTAMP';

  const maxLen = Math.max(...sample.map((v) => v.length), 1);
  return `VARCHAR(${Math.min(Math.max(maxLen * 2, 50), 1000)})`;
}

/**
 * Parse CSV text into a structured table schema with inferred column types.
 * The first column is treated as the surrogate primary key by convention.
 */
export function parseCsv(
  text: string,
  options: { tableName?: string } = {},
): CsvParseResult {
  const tableName = sanitize(options.tableName ?? 'imported_csv');
  const trimmed = text.trim();

  if (!trimmed) {
    return { ok: false, tableName, columns: [], rowCount: 0, errors: ['CSV is empty.'] };
  }

  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = result.meta.fields ?? [];
  const errors = result.errors.map(
    (e) => `Row ${e.row ?? '?'}: ${e.message}`,
  );

  if (fields.length === 0) {
    errors.push('No header row detected.');
    return { ok: false, tableName, columns: [], rowCount: 0, errors };
  }

  const seen = new Set<string>();
  const columns: Column[] = fields.map((field, index) => {
    let name = sanitize(field);
    while (seen.has(name)) name = `${name}_${index}`;
    seen.add(name);
    const values = result.data.map((row) => row[field]).filter((v): v is string => typeof v === 'string');
    return {
      name,
      type: inferType(values),
      isPrimaryKey: index === 0,
      isForeignKey: false,
    };
  });

  return {
    ok: errors.length === 0,
    tableName,
    columns,
    rowCount: result.data.length,
    errors,
  };
}
