import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import { isDatamartNode } from '../../../types/pipeline';

const NUDGE = 10;

/**
 * Keyboard alternatives for graph operations (accessibility). Attach the
 * returned handler to a focusable canvas wrapper (tabIndex=0):
 *  - Arrow Up/Down: cycle node selection
 *  - Enter: open a datamart (drill-in)
 *  - Delete/Backspace: remove the selected node
 *  - Shift + Arrows: nudge the selected node by 10px
 */
export function useGraphKeyboardNav() {
  return useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const store = usePipelineStore.getState();
    const { nodes, selectedNodeId } = store;
    if (nodes.length === 0) return;

    const index = nodes.findIndex((n) => n.id === selectedNodeId);

    // Shift + arrows nudge the selected node.
    if (event.shiftKey && selectedNodeId && index >= 0) {
      const node = nodes[index];
      const deltas: Record<string, [number, number]> = {
        ArrowUp: [0, -NUDGE],
        ArrowDown: [0, NUDGE],
        ArrowLeft: [-NUDGE, 0],
        ArrowRight: [NUDGE, 0],
      };
      const delta = deltas[event.key];
      if (delta) {
        event.preventDefault();
        usePipelineStore.setState({
          nodes: nodes.map((n) =>
            n.id === selectedNodeId
              ? { ...n, position: { x: node.position.x + delta[0], y: node.position.y + delta[1] } }
              : n,
          ),
        });
        return;
      }
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        event.preventDefault();
        const next = nodes[(index + 1 + nodes.length) % nodes.length];
        store.selectNode(next.id);
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        event.preventDefault();
        const prev = nodes[(index - 1 + nodes.length) % nodes.length];
        store.selectNode(prev.id);
        break;
      }
      case 'Enter': {
        if (selectedNodeId && index >= 0) {
          const node = nodes[index];
          if (isDatamartNode(node)) {
            event.preventDefault();
            store.enterDatamart(node.id);
          }
        }
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (selectedNodeId) {
          event.preventDefault();
          store.deleteNode(selectedNodeId);
        }
        break;
      }
      default:
        break;
    }
  }, []);
}
