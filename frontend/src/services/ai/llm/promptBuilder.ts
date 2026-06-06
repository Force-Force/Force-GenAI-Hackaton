import type { PipelineGraph } from '../../../types/pipeline';
import { isDatamartNode } from '../../../types/pipeline';

export const SYSTEM_PROMPT = `You are the canvas-editing agent for "Aura BI", a visual data-pipeline builder.

Your job: read a message produced by the backend data-architect AI and translate any
concrete data-model changes it describes into structured canvas actions. The backend
only writes prose — it cannot touch the canvas. You are the hands that apply its advice.

You return a JSON plan with a short "reasoning" and an "actions" array. Only emit actions
for changes that are clearly described or strongly implied. If the message is purely
conversational, explanatory, or asks a question, return an empty actions array.

Action types:
- "create_resource": a data table/source node. Fields: id (stable snake_case identifier),
  label, kind (one of database|warehouse|table|source|external), optional warehouseRole
  (fact|dimension|source|generated), description, columns [{name, type, isPrimaryKey,
  isForeignKey, fkRefTable, fkRefColumn}].
- "create_processing": a transformation step. Fields: id, label, language (sql|python),
  description, code, inputColumns, outputColumns.
- "connect_nodes": a directed link. Fields: fromNode, toNode (must reference ids/labels
  that EXIST in the current graph or that you create earlier in this same plan),
  optional fromColumn/toColumn.

Rules:
- Never recreate a node that already exists in the current graph (match by id or label).
- Prefer reusing existing node ids when connecting.
- Use realistic SQL column types (INT, BIGINT, VARCHAR(n), NUMERIC(p,s), DATE, TIMESTAMP, BOOLEAN).
- Mark primary keys with isPrimaryKey and foreign keys with isForeignKey + fkRefTable/fkRefColumn.
- Keep ids snake_case and unique.
- Do NOT invent changes the message does not support.`;

interface NodeSummary {
  id: string;
  category: string;
  label: string;
  kind?: string;
  role?: string;
  engine?: string;
  language?: string;
  columns?: string[];
  children?: { id: string; label: string; columns: string[] }[];
}

function columnsOf(data: { columns?: { name: string; type: string }[] }): string[] {
  return (data.columns ?? []).map((c) => `${c.name}:${c.type}`);
}

/** Build a compact, token-friendly description of the current graph. */
export function summarizeGraph(graph: PipelineGraph): string {
  const nodes: NodeSummary[] = graph.nodes.map((node) => {
    const base: NodeSummary = {
      id: node.id,
      category: node.data.category,
      label: node.data.label,
    };
    if (node.data.category === 'resource') {
      base.kind = node.data.kind;
      base.role = node.data.warehouseRole;
      base.columns = columnsOf(node.data);
    } else if (node.data.category === 'processing') {
      base.language = node.data.language;
      base.engine = node.data.engine;
    } else if (isDatamartNode(node)) {
      base.kind = node.data.containerKind;
      base.children = node.data.children.nodes.map((child) => ({
        id: child.id,
        label: child.data.label,
        columns: child.data.category === 'resource' ? columnsOf(child.data) : [],
      }));
    }
    return base;
  });

  const edges = graph.edges.map((e) => `${e.source} -> ${e.target}`);

  return JSON.stringify({ nodes, edges }, null, 2);
}

/** Build the user prompt: the backend message + current graph context. */
export function buildUserPrompt(message: string, graph: PipelineGraph): string {
  return [
    'BACKEND AI MESSAGE:',
    '"""',
    message.trim(),
    '"""',
    '',
    'CURRENT CANVAS GRAPH (JSON):',
    summarizeGraph(graph),
    '',
    'Produce the plan of canvas actions that applies the changes described above.',
  ].join('\n');
}
