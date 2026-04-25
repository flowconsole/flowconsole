import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/** Person: rectangular card with a user icon (no SVG silhouette background). */
export function PersonNode({ data, selected }: NodeProps<ElementNodeType>) {
  return <BaseElementNode data={data} selected={selected} shapeClassName="person" />;
}
