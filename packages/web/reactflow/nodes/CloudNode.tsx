import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/**
 * Cloud shape rendered via smooth Bezier curves.
 * The path forms a recognizable cloud silhouette within a 200x120 viewBox.
 */
const CLOUD_PATH = [
  'M 30,90',
  'C 10,90 2,75 8,60',
  'C 2,45 15,30 35,32',
  'C 38,15 55,5 75,10',
  'C 90,2 110,10 115,28',
  'C 135,20 160,30 160,50',
  'C 175,50 195,65 185,82',
  'C 190,95 175,105 158,95',
  'C 150,108 120,108 110,95',
  'C 95,108 65,108 55,95',
  'C 45,105 30,100 30,90',
  'Z',
].join(' ');

export function CloudNode({ data, selected }: NodeProps<ElementNodeType>) {
  return (
    <BaseElementNode
      data={data}
      selected={selected}
      shapeClassName="cloud"
      renderShapeBackground={({ borderColor, backgroundColor }) => (
        <svg
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          className="diagram-shape-svg"
        >
          <path
            d={CLOUD_PATH}
            fill={backgroundColor ?? 'var(--diagram-panel)'}
            stroke={borderColor}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      )}
    />
  );
}
