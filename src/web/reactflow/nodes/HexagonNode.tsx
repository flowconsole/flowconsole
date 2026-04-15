import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/**
 * Flat-top hexagon with 6 vertices.
 * Points are calculated for a viewBox of 100x100 with 2px stroke inset.
 */
const HEXAGON_POINTS = [
  '50,2',   // top center
  '97,27',  // top right
  '97,73',  // bottom right
  '50,98',  // bottom center
  '3,73',   // bottom left
  '3,27',   // top left
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
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    />
  );
}
