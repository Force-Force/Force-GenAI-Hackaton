import { useCallback } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { layoutGraph } from '../layout/dagreLayout';

/** Returns a callback that auto-layouts the current graph (dagre, left-to-right). */
export function useAutoLayout() {
  return useCallback(() => {
    const { nodes, edges } = usePipelineStore.getState();
    const laidOut = layoutGraph(nodes, edges);
    usePipelineStore.setState({ nodes: laidOut });
  }, []);
}
