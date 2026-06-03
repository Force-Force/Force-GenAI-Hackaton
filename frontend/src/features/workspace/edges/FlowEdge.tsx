import { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import type { PipelineEdgeData } from '../../../types/pipeline';

/**
 * Animated pipeline connector. Three layers are stacked on the same geometry:
 *  1. a soft static base line,
 *  2. a dashed overlay that streams source -> target (`.aura-edge-flow`),
 *  3. a glowing particle that travels the path (`.aura-edge-particle`).
 *
 * Foreign-key relationships render in cyan/emerald; data-flow in indigo.
 */
function FlowEdgeImpl({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const relationship = (data as PipelineEdgeData | undefined)?.relationship;
  const isFk = relationship === 'foreign_key';
  const color = isFk ? '#06B6D4' : '#6366F1';

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.75,
          opacity: 0.35,
        }}
      />
      {/* Streaming dashed overlay */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 2.5 : 1.75}
        strokeLinecap="round"
        className="aura-edge-flow"
        style={{ pointerEvents: 'none' }}
      />
      {/* Travelling particle */}
      <circle
        r={selected ? 3.5 : 2.75}
        fill={color}
        className="aura-edge-particle"
        style={{
          offsetPath: `path("${path}")`,
          filter: `drop-shadow(0 0 4px ${color})`,
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

export const FlowEdge = memo(FlowEdgeImpl);
