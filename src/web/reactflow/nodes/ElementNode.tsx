import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { BaseElementNode } from './BaseElementNode';

export function ElementNode({ data, selected }: NodeProps<ElementNodeType>) {
  const shape = data.shape ?? 'service';
  return <BaseElementNode data={data} selected={selected} shapeClassName={shape} />;
}
