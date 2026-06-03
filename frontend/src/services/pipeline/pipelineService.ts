import { ApiError, del, getJson, health, patchJson, postJson } from '../http/client';
import { validateWith } from '../../contracts/api';
import {
  backendChatResponseSchema,
  chatHistorySchema,
  edgeReadSchema,
  nodeReadSchema,
  pipelineListSchema,
  pipelineReadSchema,
  type ArchitectureDesign,
  type BackendChatResponse,
  type ChatMessageRead,
  type EdgeRead,
  type NodeRead,
  type PipelineListItem,
  type PipelineRead,
  type PipelineStatus,
} from '../../contracts/backend';
import type { z } from 'zod';
import {
  toEdgeCreateBody,
  toNodeCreateBody,
  type NodeUpdateBody,
} from '../mapping/graphMapping';
import type { PipelineEdge, PipelineGraph, PipelineNode } from '../../types/pipeline';

/**
 * Typed client for the DataPipe pipeline/node/edge/chat REST API. Every method
 * validates the backend response against the schemas in contracts/backend.ts
 * and throws ApiError on a contract violation so the stores can react.
 */

function parse<T>(schema: z.ZodType<T>, raw: unknown, label: string): T {
  const result = validateWith(schema, raw);
  if (!result.ok) {
    throw new ApiError(`Malformed ${label} response: ${result.error}`, 0);
  }
  return result.data;
}

export { health };

export async function listPipelines(): Promise<PipelineListItem[]> {
  const raw = await getJson('/pipelines');
  return parse(pipelineListSchema, raw, 'pipeline list');
}

export async function createPipeline(name: string): Promise<PipelineRead> {
  const raw = await postJson('/pipelines', { name });
  return parse(pipelineReadSchema, raw, 'pipeline');
}

export async function getPipeline(pipelineId: string): Promise<PipelineRead> {
  const raw = await getJson(`/pipelines/${pipelineId}`);
  return parse(pipelineReadSchema, raw, 'pipeline');
}

export interface PipelinePatch {
  name?: string;
  status?: PipelineStatus;
  architecture_design?: ArchitectureDesign | null;
}

export async function patchPipeline(
  pipelineId: string,
  patch: PipelinePatch,
): Promise<PipelineRead> {
  const raw = await patchJson(`/pipelines/${pipelineId}`, patch);
  return parse(pipelineReadSchema, raw, 'pipeline');
}

export async function deletePipeline(pipelineId: string): Promise<void> {
  await del(`/pipelines/${pipelineId}`);
}

// --- Nodes ---

export async function createNode(
  pipelineId: string,
  node: PipelineNode,
): Promise<NodeRead> {
  const raw = await postJson(
    `/pipelines/${pipelineId}/nodes`,
    toNodeCreateBody(node),
  );
  return parse(nodeReadSchema, raw, 'node');
}

export async function updateNode(
  pipelineId: string,
  nodeId: string,
  body: NodeUpdateBody,
): Promise<NodeRead> {
  const raw = await patchJson(
    `/pipelines/${pipelineId}/nodes/${nodeId}`,
    body,
  );
  return parse(nodeReadSchema, raw, 'node');
}

export async function deleteNode(
  pipelineId: string,
  nodeId: string,
): Promise<void> {
  await del(`/pipelines/${pipelineId}/nodes/${nodeId}`);
}

// --- Edges ---

export async function createEdge(
  pipelineId: string,
  edge: PipelineEdge,
): Promise<EdgeRead> {
  const raw = await postJson(
    `/pipelines/${pipelineId}/edges`,
    toEdgeCreateBody(edge),
  );
  return parse(edgeReadSchema, raw, 'edge');
}

export async function deleteEdge(
  pipelineId: string,
  edgeId: string,
): Promise<void> {
  await del(`/pipelines/${pipelineId}/edges/${edgeId}`);
}

// --- Chat ---

export async function getChatHistory(
  pipelineId: string,
): Promise<ChatMessageRead[]> {
  const raw = await getJson(`/pipelines/${pipelineId}/chat`);
  return parse(chatHistorySchema, raw, 'chat history');
}

export async function postChat(
  pipelineId: string,
  content: string,
  signal?: AbortSignal,
): Promise<BackendChatResponse> {
  const raw = await postJson(
    `/pipelines/${pipelineId}/chat`,
    { content },
    { signal },
  );
  return parse(backendChatResponseSchema, raw, 'chat');
}

/**
 * Seed a freshly created (empty) pipeline with a local graph. Nodes are created
 * first so the backend can assign UUIDs; edges are then remapped from the
 * original client ids to the new backend ids before creation.
 */
export async function seedPipeline(
  pipelineId: string,
  graph: PipelineGraph,
): Promise<void> {
  const idMap = new Map<string, string>();

  for (const node of graph.nodes) {
    const created = await createNode(pipelineId, node);
    idMap.set(node.id, created.id);
  }

  for (const edge of graph.edges) {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) continue;
    await createEdge(pipelineId, { ...edge, source, target });
  }
}
