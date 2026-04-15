import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { toneToColor } from '../../diagram/theme';
import { BaseElementNode } from './BaseElementNode';

export function CircleNode({ data, selected }: NodeProps<ElementNodeType>) {
  const accent = toneToColor(data.tone);

  const svgBackground = (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="diagram-shape-svg"
    >
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="var(--diagram-panel)"
        stroke={accent}
        strokeWidth="2"
      />
    </svg>
  );

  return (
    <BaseElementNode
      data={data}
      selected={selected}
      shapeClassName="circle"
      shapeBackground={svgBackground}
    />
  );
}
