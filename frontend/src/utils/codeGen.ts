import {
  containerKindOf,
  isDatamartNode,
  isProcessingNode,
  isResourceNode,
  type Column,
  type DatamartNode,
  type PipelineNode,
  type ResourceNodeData,
} from '../types/pipeline';

export interface GeneratedCode {
  /** Editor language hint for the primary snippet. */
  language: 'sql' | 'python';
  /** Generated SQL implementation (DDL / queries). Empty when not applicable. */
  sql: string;
  /** Generated Python implementation (ETL / processing). */
  python: string;
}

function columnLine(col: Column): string {
  let line = `  ${col.name.padEnd(22)} ${col.type}`;
  if (col.isPrimaryKey) line += ' PRIMARY KEY';
  return line;
}

/** CREATE TABLE statement for a single resource table. */
export function tableDDL(data: ResourceNodeData): string {
  const cols = data.columns.map(columnLine).join(',\n');
  const fks = data.columns
    .filter((c) => c.isForeignKey && c.fkRefTable)
    .map(
      (c) =>
        `ALTER TABLE ${data.label} ADD CONSTRAINT fk_${data.label}_${c.name}\n` +
        `  FOREIGN KEY (${c.name}) REFERENCES ${c.fkRefTable}(${c.fkRefColumn ?? c.name});`,
    )
    .join('\n');
  let out = `-- ${data.description || data.label}\n`;
  out += `CREATE TABLE ${data.label} (\n${cols}\n);`;
  if (fks) out += `\n\n${fks}`;
  return out;
}

/** Python ingestion snippet for a source table. */
function sourceIngestPython(data: ResourceNodeData): string {
  const cols = data.columns.map((c) => `        "${c.name}",`).join('\n');
  return `import pandas as pd
from sqlalchemy import create_engine

# Extract & load "${data.label}" (${data.format ?? data.kind})
def load_${data.label}(connection_uri: str) -> pd.DataFrame:
    engine = create_engine(connection_uri)
    df = pd.read_sql(
        """
        SELECT
${cols}
        FROM ${data.label}
        """,
        engine,
    )
    return df`;
}

/** Full DDL for every table inside a container, in dependency-friendly order. */
function containerDDL(node: DatamartNode): string {
  const kind = containerKindOf(node.data);
  const tables = node.data.children.nodes.filter(isResourceNode);
  const header =
    `-- ============================================================\n` +
    `-- ${kind === 'warehouse' ? 'Data Warehouse' : kind === 'database' ? 'Database' : 'Data Mart'}: ${node.data.label}\n` +
    `-- ============================================================\n\n`;
  const drops = tables.map((t) => `DROP TABLE IF EXISTS ${t.data.label} CASCADE;`).join('\n');
  const creates = tables.map((t) => tableDDL(t.data)).join('\n\n');
  return `${header}${drops}\n\n${creates}\n`;
}

/** Python ETL skeleton that materialises a container's tables. */
function containerPython(node: DatamartNode): string {
  const tables = node.data.children.nodes.filter(isResourceNode);
  const loaders = tables
    .map(
      (t) =>
        `    load_table(\n` +
        `        engine,\n` +
        `        "${t.data.label}",\n` +
        `        columns=[${t.data.columns.map((c) => `"${c.name}"`).join(', ')}],\n` +
        `    )`,
    )
    .join('\n');
  return `import pandas as pd
from sqlalchemy import create_engine

# ETL loader for "${node.data.label}"
def load_table(engine, name: str, columns: list[str]) -> None:
    df = pd.read_sql(f"SELECT {', '.join(columns)} FROM staging.{name}", engine)
    df.to_sql(name, engine, if_exists="replace", index=False)


def run(connection_uri: str) -> None:
    engine = create_engine(connection_uri)
${loaders || '    pass'}


if __name__ == "__main__":
    run("postgresql://localhost:5432/warehouse")`;
}

/**
 * Produce SQL + Python implementation code for the currently selected node.
 * - Source/table nodes -> CREATE TABLE DDL + a pandas ingestion loader.
 * - Transformation nodes -> the node's own source (SQL or Python).
 * - Warehouse/Database/Mart containers -> full DDL + an ETL loader skeleton.
 */
export function generateCodeForNode(node: PipelineNode): GeneratedCode {
  if (isProcessingNode(node)) {
    const isPy = node.data.language === 'python';
    return {
      language: node.data.language,
      sql: isPy ? '' : node.data.code,
      python: isPy ? node.data.code : '',
    };
  }

  if (isResourceNode(node)) {
    return {
      language: 'sql',
      sql: tableDDL(node.data),
      python: sourceIngestPython(node.data),
    };
  }

  if (isDatamartNode(node)) {
    return {
      language: 'sql',
      sql: containerDDL(node),
      python: containerPython(node),
    };
  }

  return { language: 'sql', sql: '', python: '' };
}
