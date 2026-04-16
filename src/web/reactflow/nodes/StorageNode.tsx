import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/** Nested dashed rectangles — represents a storage volume / folder. */
export function StorageNode({ data, selected }: NodeProps<ElementNodeType>) {
  return (
    <BaseElementNode
      data={data}
      selected={selected}
      shapeClassName="storage"
      renderShapeBackground={({ borderColor, backgroundColor }) => (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="diagram-shape-svg">
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            rx="10"
            fill={backgroundColor ?? 'var(--diagram-panel)'}
            stroke={borderColor}
            strokeWidth="1"
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x="14"
            y="14"
            width="72"
            height="72"
            rx="6"
            fill="none"
            stroke={borderColor}
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    />
  );
}
