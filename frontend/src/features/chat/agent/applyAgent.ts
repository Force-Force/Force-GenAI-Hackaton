import type { AiAction } from '../../../contracts/aiActions';
import type { PipelineGraph } from '../../../types/pipeline';
import { isDatamartNode } from '../../../types/pipeline';
import { parseSqlDdl } from '../../../utils/parsers/sqlDdlParser';
import type { ChatMessage } from '../types';

export interface InferredActions {
  actions: AiAction[];
  /** Human-readable notes about what was detected (for transparency). */
  notes: string[];
}

/** Short human-readable label for an action, used in agent summaries. */
export function describeAction(action: AiAction): string {
  switch (action.type) {
    case 'create_resource':
      return `table \`${action.payload.label}\``;
    case 'create_processing':
      return `${action.payload.language.toUpperCase()} step \`${action.payload.label}\``;
    case 'connect_nodes':
      return `connection ${action.payload.fromNode} → ${action.payload.toNode}`;
    case 'explain':
      return 'explanation';
    default:
      return 'change';
  }
}

/** Collect every node id + label currently present (root and nested). */
function existingNames(graph: PipelineGraph): Set<string> {
  const names = new Set<string>();
  for (const node of graph.nodes) {
    names.add(node.id.toLowerCase());
    names.add(node.data.label.toLowerCase());
    if (isDatamartNode(node)) {
      for (const child of node.data.children.nodes) {
        names.add(child.id.toLowerCase());
        names.add(child.data.label.toLowerCase());
      }
    }
  }
  return names;
}

/** Resolve a free-text node reference to an existing ROOT node id. */
function resolveRootNodeId(graph: PipelineGraph, ref: string): string | undefined {
  const needle = ref.trim().toLowerCase();
  const byId = graph.nodes.find((n) => n.id.toLowerCase() === needle);
  if (byId) return byId.id;
  const byLabel = graph.nodes.find((n) => n.data.label.toLowerCase() === needle);
  return byLabel?.id;
}

/** Extract fenced code blocks, optionally filtered to a language tag. */
function codeFences(text: string, langs: string[]): string[] {
  const blocks: string[] = [];
  const fence = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(text)) !== null) {
    const lang = (match[1] ?? '').toLowerCase();
    if (langs.length === 0 || langs.includes(lang) || lang === '') {
      blocks.push(match[2]);
    }
  }
  return blocks;
}

/** Derive create_resource actions from any CREATE TABLE DDL in the message. */
function actionsFromDdl(text: string, graph: PipelineGraph): { actions: AiAction[]; notes: string[] } {
  const actions: AiAction[] = [];
  const notes: string[] = [];
  const taken = existingNames(graph);

  // Prefer SQL-tagged fences; fall back to scanning raw text for CREATE TABLE.
  const candidates = codeFences(text, ['sql', 'postgresql', 'ddl']);
  if (candidates.length === 0 && /create\s+table/i.test(text)) {
    candidates.push(text);
  }

  for (const candidate of candidates) {
    if (!/create\s+table/i.test(candidate)) continue;
    const parsed = parseSqlDdl(candidate);
    for (const table of parsed.tables) {
      const id = table.name.replace(/["'`]/g, '').trim();
      if (!id || table.columns.length === 0) continue;
      if (taken.has(id.toLowerCase())) continue;
      taken.add(id.toLowerCase());
      actions.push({
        type: 'create_resource',
        payload: {
          id,
          label: id,
          kind: 'table',
          description: 'Created by the frontend agent from AI-suggested DDL.',
          columns: table.columns,
        },
      });
      notes.push(`table \`${id}\` (${table.columns.length} columns)`);
    }
  }

  return { actions, notes };
}

/** Derive connect_nodes actions from "connect A -> B" / "A → B" phrasing. */
function actionsFromConnections(text: string, graph: PipelineGraph): { actions: AiAction[]; notes: string[] } {
  const actions: AiAction[] = [];
  const notes: string[] = [];
  const pattern = /\bconnect\s+([\w.-]+)\s*(?:->|→|to)\s*([\w.-]+)/gi;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((match = pattern.exec(text)) !== null) {
    const from = resolveRootNodeId(graph, match[1]);
    const to = resolveRootNodeId(graph, match[2]);
    if (!from || !to || from === to) continue;
    const key = `${from}->${to}`;
    if (seen.has(key)) continue;
    if (graph.edges.some((e) => e.source === from && e.target === to)) continue;
    seen.add(key);
    actions.push({ type: 'connect_nodes', payload: { fromNode: from, toNode: to } });
    notes.push(`connection ${from} → ${to}`);
  }

  return { actions, notes };
}

/**
 * The frontend "apply agent". Reads a backend assistant message and infers
 * every actionable change it can:
 *   1. the structured `action` carried by the response,
 *   2. tables defined in embedded CREATE TABLE DDL,
 *   3. connections described as "connect A -> B".
 *
 * Returns validated-shape AiActions; the graph reducer (applyAiAction) still
 * validates and dedupes each one before mutating the canvas, so this stays safe.
 */
export function inferActionsFromMessage(
  message: ChatMessage,
  graph: PipelineGraph,
): InferredActions {
  const actions: AiAction[] = [];
  const notes: string[] = [];

  if (message.action && message.action.type !== 'explain') {
    actions.push(message.action);
    notes.push(`structured action: ${message.action.type.replace('_', ' ')}`);
  }

  const ddl = actionsFromDdl(message.text, graph);
  actions.push(...ddl.actions);
  notes.push(...ddl.notes);

  const links = actionsFromConnections(message.text, graph);
  actions.push(...links.actions);
  notes.push(...links.notes);

  return { actions, notes };
}
