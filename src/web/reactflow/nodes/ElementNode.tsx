import { type NodeProps } from '@xyflow/react';
import type { ElementNodeData } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

/** Maps ReactFlow node type to the CSS shape class name used by BaseElementNode. */
const typeToShape: Record<string, string> = {
  element: 'service',
  person: 'person',
  database: 'database',
  queue: 'queue',
  storage: 'storage',
  boundary: 'boundary',
};

export function ElementNode({ data, selected, type }: NodeProps) {
  return <BaseElementNode data={data as ElementNodeData} selected={selected} shapeClassName={typeToShape[type ?? 'element'] ?? 'service'} />;
}
