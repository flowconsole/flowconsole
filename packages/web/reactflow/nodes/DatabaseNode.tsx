import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/** Cylinder silhouette with visible top ellipse (rim). */
export function DatabaseNode({ data, selected }: NodeProps<ElementNodeType>) {
  return (
    <BaseElementNode
      data={data}
      selected={selected}
      shapeClassName="database"
      renderShapeBackground={({ borderColor, backgroundColor }) => (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="diagram-shape-svg">
          <path
            d="M 0,12 Q 0,0 50,0 Q 100,0 100,12 L 100,88 Q 100,100 50,100 Q 0,100 0,88 Z"
            fill={backgroundColor ?? 'var(--diagram-panel)'}
            stroke={borderColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M 0,12 Q 0,24 50,24 Q 100,24 100,12"
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
