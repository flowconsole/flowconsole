import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/**
 * Flat-top hexagon with 6 vertices.
 * Points are calculated for a viewBox of 100x100 with 2px stroke inset.
 */
const HEXAGON_POINTS = [
  '50,0',   // top center
  '100,25', // top right
  '100,75', // bottom right
  '50,100', // bottom center
  '0,75',   // bottom left
  '0,25',   // top left
].join(' ');

export function HexagonNode({ data, selected }: NodeProps<ElementNodeType>) {
  return (
    <BaseElementNode
      data={data}
      selected={selected}
      shapeClassName="hexagon"
      renderShapeBackground={({ borderColor, backgroundColor }) => (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="diagram-shape-svg"
        >
          <polygon
            points={HEXAGON_POINTS}
            fill={backgroundColor ?? 'var(--diagram-panel)'}
            stroke={borderColor}
            strokeWidth="1"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    />
  );
}
