import { type NodeProps } from '@xyflow/react';
import type { ElementNodeData } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/** Default rectangular ("service") node — no SVG overlay, CSS border only. */
export function ElementNode({ data, selected }: NodeProps) {
  return <BaseElementNode data={data as ElementNodeData} selected={selected} shapeClassName="service" />;
}
