import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

export function CircleNode({ data, selected }: NodeProps<ElementNodeType>) {
  return (
    <BaseElementNode
      data={data}
      selected={selected}
      shapeClassName="circle"
      renderShapeBackground={({ borderColor, backgroundColor }) => (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="diagram-shape-svg"
        >
          <circle
            cx="50"
            cy="50"
            r="50"
            fill={backgroundColor ?? 'var(--diagram-panel)'}
            stroke={borderColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    />
  );
}
