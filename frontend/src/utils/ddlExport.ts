import {
  isResourceNode,
  type PipelineEdge,
  type PipelineNode,
} from '../types/pipeline';

/**
 * Compile the resource tables in the pipeline graph into ANSI SQL DDL.
 * Pure function extracted from App.handleExportSchema for unit testing.
 */
export function exportSchemaToSql(
  projectName: string,
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): string {
  const resources = nodes.filter(isResourceNode);

  let ddl = '';
  ddl += '-- ==========================================================\n';
  ddl += '-- AuraBI Warehouse DDL Compiler Output\n';
  ddl += `-- Project: ${projectName}\n`;
  ddl += `-- Generated at: ${new Date().toISOString().slice(0, 10)}\n`;
  ddl += '-- ==========================================================\n\n';

  resources.forEach((node) => {
    ddl += `DROP TABLE IF EXISTS ${node.data.label} CASCADE;\n`;
  });
  ddl += '\n';

  resources.forEach((node) => {
    ddl += `-- Definition: ${node.data.description}\n`;
    ddl += `CREATE TABLE ${node.data.label} (\n`;
    const cols = node.data.columns.map((c) => {
      let line = `  ${c.name.padEnd(22)} ${c.type}`;
      if (c.isPrimaryKey) line += ' PRIMARY KEY';
      return line;
    });
    ddl += cols.join(',\n');
    ddl += '\n);\n\n';
  });

  const resourceIds = new Set(resources.map((n) => n.id));
  edges
    .filter((e) => resourceIds.has(e.source) && resourceIds.has(e.target))
    .forEach((edge) => {
      const fromName = nodeName(resources, edge.source);
      const toName = nodeName(resources, edge.target);
      const fromCol = edge.data?.fromColumn ?? 'id';
      const toCol = edge.data?.toColumn ?? 'id';
      ddl += `-- Foreign key binding: ${fromName} -> ${toName}\n`;
      ddl += `ALTER TABLE ${fromName} ADD CONSTRAINT fk_${fromName}_${fromCol}\n`;
      ddl += `  FOREIGN KEY (${fromCol}) REFERENCES ${toName}(${toCol});\n\n`;
    });

  return ddl;
}

function nodeName(nodes: PipelineNode[], id: string): string {
  return nodes.find((n) => n.id === id)?.data.label ?? id;
}
