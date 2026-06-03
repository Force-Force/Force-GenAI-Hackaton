import { Parser } from 'node-sql-parser';
import type { Column } from '../../types/pipeline';

export interface ParsedTable {
  name: string;
  columns: Column[];
}

export interface DdlParseResult {
  ok: boolean;
  tables: ParsedTable[];
  errors: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function buildType(definition: any): string {
  if (!definition) return 'VARCHAR(255)';
  const base = String(definition.dataType ?? 'VARCHAR').toUpperCase();
  const length = definition.length;
  const scale = definition.scale;
  if (length !== undefined && length !== null) {
    return scale !== undefined && scale !== null
      ? `${base}(${length},${scale})`
      : `${base}(${length})`;
  }
  return base;
}

function columnName(column: any): string {
  if (typeof column === 'string') return column;
  // node-sql-parser shapes vary by version: { column } or { column: { expr: { value } } }.
  if (typeof column?.column === 'string') return column.column;
  if (typeof column?.column?.expr?.value === 'string') return column.column.expr.value;
  if (typeof column?.expr?.value === 'string') return column.expr.value;
  return 'column';
}

function tableName(node: any): string {
  const t = node.table;
  if (Array.isArray(t) && t[0]) return t[0].table ?? 'table';
  if (typeof t === 'string') return t;
  return 'table';
}

function extractTable(node: any): ParsedTable {
  const defs: any[] = node.create_definitions ?? [];
  const pkNames = new Set<string>();

  // Table-level primary key constraints.
  defs
    .filter((d) => d.resource === 'constraint' && /primary/i.test(JSON.stringify(d)))
    .forEach((d) => {
      const cols = d.definition ?? d.constraint_definition ?? [];
      (Array.isArray(cols) ? cols : [cols]).forEach((c: any) => {
        const name = c?.column ?? c;
        if (typeof name === 'string') pkNames.add(name);
      });
    });

  const columns: Column[] = defs
    .filter((d) => d.resource === 'column')
    .map((d) => {
      const name = columnName(d.column);
      const inlinePk = /primary/i.test(JSON.stringify(d));
      return {
        name,
        type: buildType(d.definition),
        isPrimaryKey: inlinePk || pkNames.has(name),
        isForeignKey: false,
      };
    });

  return { name: tableName(node), columns };
}

/**
 * Parse SQL DDL (CREATE TABLE statements) into structured table schemas.
 * Uses node-sql-parser for accurate extraction across statements.
 */
export function parseSqlDdl(sql: string): DdlParseResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { ok: false, tables: [], errors: ['SQL is empty.'] };
  }

  const parser = new Parser();
  let ast: any;
  try {
    ast = parser.astify(trimmed, { database: 'postgresql' });
  } catch (err) {
    return {
      ok: false,
      tables: [],
      errors: [err instanceof Error ? err.message : 'Failed to parse SQL DDL.'],
    };
  }

  const statements = Array.isArray(ast) ? ast : [ast];
  const createStatements = statements.filter(
    (s) => s?.type === 'create' && s?.keyword === 'table',
  );

  if (createStatements.length === 0) {
    return { ok: false, tables: [], errors: ['No CREATE TABLE statements found.'] };
  }

  const tables = createStatements.map(extractTable);
  const errors = tables
    .filter((t) => t.columns.length === 0)
    .map((t) => `Table "${t.name}" has no parseable columns.`);

  return { ok: errors.length === 0, tables, errors };
}
