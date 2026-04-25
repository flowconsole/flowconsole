import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/** Horizontal pipe: rounded rectangle with ellipse caps on both sides. */
export function QueueNode({ data, selected }: NodeProps<ElementNodeType>) {
  return (
    <BaseElementNode
      data={data}
      selected={selected}
      shapeClassName="queue"
      renderShapeBackground={({ borderColor, backgroundColor }) => (
        <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="diagram-shape-svg">
          <path
            d="M 20,0 L 180,0 Q 200,0 200,50 Q 200,100 180,100 L 20,100 Q 0,100 0,50 Q 0,0 20,0 Z"
            fill={backgroundColor ?? 'var(--diagram-panel)'}
            stroke={borderColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M 180,0 Q 160,0 160,50 Q 160,100 180,100"
            fill="none"
            stroke={borderColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    />
  );
}
