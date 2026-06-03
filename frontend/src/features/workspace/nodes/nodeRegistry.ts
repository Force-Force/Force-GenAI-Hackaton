import type { ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { NodeCategory } from '../../../types/pipeline';
import { ResourceNode } from './ResourceNode';
import { ProcessingNode } from './ProcessingNode';
import { DatamartNode } from './DatamartNode';

/**
 * Central node registry. Adding a future ETL step type = register one entry
 * here; the canvas and inspector resolve rendering from this map, so no canvas
 * changes are required for new node kinds (extensibility strategy, Section 8).
 */
export interface NodeTypeDescriptor {
  category: NodeCategory;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<NodeProps<any>>;
}

export const nodeRegistry: Record<NodeCategory, NodeTypeDescriptor> = {
  resource: { category: 'resource', label: 'Resource', component: ResourceNode },
  processing: { category: 'processing', label: 'Processing', component: ProcessingNode },
  datamart: { category: 'datamart', label: 'Datamart', component: DatamartNode },
};

/** React Flow nodeTypes map derived from the registry. */
export const nodeTypes = Object.fromEntries(
  Object.values(nodeRegistry).map((d) => [d.category, d.component]),
) as Record<NodeCategory, NodeTypeDescriptor['component']>;
