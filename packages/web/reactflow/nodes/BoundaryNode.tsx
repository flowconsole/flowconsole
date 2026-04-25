import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/** Dashed rounded rectangle — represents a logical boundary / trust zone. */
export function BoundaryNode({ data, selected }: NodeProps<ElementNodeType>) {
  return (
    <BaseElementNode
      data={data}
      selected={selected}
      shapeClassName="boundary"
      renderShapeBackground={({ borderColor, backgroundColor }) => (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="diagram-shape-svg">
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            rx="8"
            fill={backgroundColor ?? 'var(--diagram-panel)'}
            stroke={borderColor}
            strokeWidth="1"
            strokeDasharray="10 5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    />
  );
}
