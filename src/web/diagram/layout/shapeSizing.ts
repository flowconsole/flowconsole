import type { NotationAdapter } from './notation/types';
import type { RankedGraph, RankedNode } from './types';
import type { ShapeDefinition } from './shapes/shapeRegistry';
import type { ShapeRegistry } from './shapes/shapeRegistry';
import { defaultShapeRegistry } from './shapes/builtins';

const CONTENT_PADDING = 20;

export type SizedNode = RankedNode & {
  size: {
    width: number;
    height: number;
    shape: ShapeDefinition;
  };
};

export type SizedGraph = Omit<RankedGraph, 'nodes'> & {
  nodes: SizedNode[];
};

export function computeSize(
  node: RankedNode,
  registry: ShapeRegistry,
  notation: NotationAdapter
) {
  const shapeId =
    node.data.shape ??
    node.data.notationShape ??
    notation.defaultShape(node);
  const shape = registry.resolveForNode(node, 'generic', shapeId);

  if (!shape) {
    throw new Error(`Unknown shape: ${shapeId}`);
  }

  const title = node.data.title ?? '';
  const subtitle = node.data.subtitle ?? '';
  const description = node.data.description ?? '';
  const tags = Array.isArray(node.data.tags) ? node.data.tags : [];
  const badge = node.data.badge ?? '';
  const footer = 'footer' in node.data ? node.data.footer ?? '' : '';

  const styledWidth = typeof node.style?.width === 'number' ? node.style.width : undefined;
  const styledHeight = typeof node.style?.height === 'number' ? node.style.height : undefined;
  const baseWidth = styledWidth ?? node.width ?? shape.defaultDimensions.width;
  const baseHeight = styledHeight ?? node.height ?? shape.defaultDimensions.height;

  const textWidth = Math.max(title.length * 7, subtitle.length * 6, 120);
  const tagsWidth = tags.length ? Math.max(tags.join(',').length * 5, tags.length * 60) : 0;
  const badgeWidth = badge ? Math.max(String(badge).length * 7 + 32, 80) : 0;
  const width = Math.max(
    shape.minDimensions.width,
    baseWidth,
    textWidth + CONTENT_PADDING,
    tagsWidth + CONTENT_PADDING,
    badgeWidth + CONTENT_PADDING
  );

  const lineHeight = 18;
  const descLines = description ? Math.ceil(description.length / 40) : 0;
  const tagsLines = tags.length ? Math.ceil(tags.length / 3) : 0;
  const footerLines = footer && shape.labelZones.includes('footer') ? Math.ceil(footer.length / 36) : 0;
  const headerExtra = shape.labelZones.includes('outside-top') ? 18 : 0;
  const footerExtra = shape.labelZones.includes('outside-bottom') ? 18 : 0;

  const height = Math.max(
    shape.minDimensions.height,
    baseHeight + descLines * lineHeight + tagsLines * lineHeight + footerLines * lineHeight + headerExtra + footerExtra + CONTENT_PADDING / 2
  );

  return {
    width,
    height,
    shape,
  };
}

export function sizeRankedGraph(
  graph: RankedGraph,
  notation: NotationAdapter,
  registry: ShapeRegistry = defaultShapeRegistry
): SizedGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      size: computeSize(node, registry, notation),
    })),
  };
}
