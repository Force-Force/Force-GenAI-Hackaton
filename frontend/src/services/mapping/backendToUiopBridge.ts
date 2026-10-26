import type {
  BackendEdge,
  BackendNode,
  BackendQuestion,
} from '../../contracts/backendApi';
import type {
  UiopEnvelope,
  UiopExecutionReport,
  UiopOperation,
} from '../../contracts/uiop';
import { executeUiop } from '../../features/uiop/runtime/uiopRuntime';
import { usePlanStore } from '../../features/uiop/store/planStore';
import { genId } from '../../utils/graph';
import { toFrontendNode } from './backendGraphMapper';
import { isDatamartNode, isProcessingNode } from '../../types/pipeline';

/**
 * Creates a valid UIOP v1.0 envelope for bridging backend events into the frontend runtime.
 */
export function createBridgeUiopEnvelope(
  operations: UiopOperation[],
  agentId = 'backend-bridge',
  baseRevisionOverride?: number,
): UiopEnvelope {
  const currentRev = usePlanStore.getState().revision;
  const workspaceId = usePlanStore.getState().workspaceId || 'workspace_01';

  return {
    protocol: 'uiop',
    version: '1.0',
    messageId: genId('msg_bridge'),
    workspaceId,
    baseRevision: baseRevisionOverride ?? currentRev,
    source: {
      agentId,
      executionId: genId('exec_bridge'),
    },
    operations,
  };
}

/**
 * Executes a bridged UIOP envelope with rebase support.
 */
export function applyBridgeOperations(
  operations: UiopOperation[],
  agentId = 'backend-bridge',
): UiopExecutionReport {
  const envelope = createBridgeUiopEnvelope(operations, agentId);
  return executeUiop(envelope, { allowRebase: true });
}

/**
 * Converts a backend node creation into a UIOP node.add operation.
 */
export function handleBackendNodeCreated(backendNode: BackendNode): UiopExecutionReport {
  const frontendNode = toFrontendNode(backendNode);
  const data = frontendNode.data;

  let opType: 'resource' | 'processing' | 'datamart' | 'dataModel' = 'resource';
  if (isProcessingNode(frontendNode)) opType = 'processing';
  else if (isDatamartNode(frontendNode)) opType = 'datamart';

  const op: UiopOperation = {
    op: 'node.add',
    params: {
      id: frontendNode.id,
      type: opType,
      position: frontendNode.position,
      data: {
        label: data.label,
        description: data.description,
        columns: Array.isArray(data.columns) ? data.columns : [],
        kind: 'kind' in data ? (data.kind as 'database' | 'warehouse' | 'table' | 'source' | 'external') : undefined,
        warehouseRole: 'warehouseRole' in data ? (data.warehouseRole as 'fact' | 'dimension' | 'source' | 'generated') : undefined,
        format: 'format' in data ? (data.format as any) : undefined,
        language: 'language' in data ? (data.language as 'sql' | 'python') : undefined,
        engine: 'engine' in data ? (data.engine as any) : undefined,
        code: 'code' in data ? (data.code as string) : undefined,
        containerKind: 'containerKind' in data ? (data.containerKind as any) : undefined,
        expanded: 'expanded' in data ? (data.expanded as boolean) : undefined,
      },
    },
  };

  return applyBridgeOperations([op], 'backend-sync-agent');
}

/**
 * Converts a backend node update into a UIOP node.update operation.
 */
export function handleBackendNodeUpdated(
  nodeId: string,
  patch: Partial<BackendNode>,
): UiopExecutionReport {
  const op: UiopOperation = {
    op: 'node.update',
    params: {
      id: nodeId,
      position: patch.position,
      data: patch.data as any,
    },
  };

  return applyBridgeOperations([op], 'backend-sync-agent');
}

/**
 * Converts a backend node deletion into a UIOP node.remove operation.
 */
export function handleBackendNodeDeleted(nodeId: string): UiopExecutionReport {
  const op: UiopOperation = {
    op: 'node.remove',
    params: {
      id: nodeId,
      cascadeEdges: true,
    },
  };

  return applyBridgeOperations([op], 'backend-sync-agent');
}

/**
 * Converts a backend edge creation into a UIOP edge.add operation.
 */
export function handleBackendEdgeCreated(backendEdge: BackendEdge): UiopExecutionReport {
  const op: UiopOperation = {
    op: 'edge.add',
    params: {
      id: backendEdge.id,
      source: backendEdge.source,
      target: backendEdge.target,
      type: 'relationship',
      data: {
        relationship: 'data_flow',
      },
    },
  };

  return applyBridgeOperations([op], 'backend-sync-agent');
}

/**
 * Converts a backend edge deletion into a UIOP edge.remove operation.
 */
export function handleBackendEdgeDeleted(edgeId: string): UiopExecutionReport {
  const op: UiopOperation = {
    op: 'edge.remove',
    params: {
      id: edgeId,
    },
  };

  return applyBridgeOperations([op], 'backend-sync-agent');
}

/**
 * Bridges a backend user_input.required event into a UIOP question.propose operation.
 */
export function handleBackendQuestionPrompt(question: BackendQuestion): UiopExecutionReport {
  // The agent's own choices are the options; their label is the answer sent back.
  const choices = (question.choices ?? []).filter((c) => c.trim());
  const options =
    choices.length >= 2
      ? choices.map((c, i) => ({ id: c, label: c, description: '', isRecommended: i === 0 }))
      : [
          { id: 'approve', label: 'Approve & Continue', description: 'Proceed with the pipeline operation', isRecommended: true },
          { id: 'reject', label: 'Reject / Cancel', description: 'Abort or pause the operation' },
        ];
  const snapshot = question.context_snapshot ?? {};
  const role = question.agent_role ? `${question.agent_role} · ` : '';
  const op: UiopOperation = {
    op: 'question.propose',
    params: {
      id: question.id,
      question: question.question_text || question.question || 'Action requires user input:',
      context:
        typeof snapshot.context === 'string' && snapshot.context
          ? `${role}${snapshot.context}`
          : `${role}${question.run_id ? `Pipeline run ${question.run_id}` : 'Pipeline design'}`,
      options,
      selectedOptionId: question.answer_text || question.answer || undefined,
    },
  };

  return applyBridgeOperations([op], 'guardian-agent');
}

