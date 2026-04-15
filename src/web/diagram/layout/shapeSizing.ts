import type { ArchitectureDiagramModel } from '../types';
import type { LayoutConfig } from './types';
import { getShapeDefinitionOrDefault } from './shapes/shapeRegistry';
// Ensure built-in shapes are registered
import './shapes/builtins';

type NodeSize = { width: number; height: number };

const CONTENT_PADDING = 20;

/**
 * Estimate node dimensions taking shape geometry into account.
 *
 * For rectangular shapes this matches the original estimateNodeSize logic.
 * For circle shapes the result is forced to a square.
 * For hexagon/cloud shapes minimum sizes from the shape registry are enforced.
 */
export function estimateShapeAwareSize(
  node: ArchitectureDiagramModel['nodes'][number],
  config: LayoutConfig,
): NodeSize {
  const title = node.data.title ?? '';
  const subtitle = (node.data as { subtitle?: string })?.subtitle ?? '';
  const desc = (node.data as { description?: string })?.description ?? '';
  const tags = Array.isArray((node.data as { tags?: string[] })?.tags)
    ? ((node.data as { tags?: string[] }).tags as string[])
    : [];
  const badge = (node.data as { badge?: string })?.badge ?? '';

  const textWidth = Math.max(title.length * 7, subtitle.length * 6, 120);
  const tagsWidth = tags.length ? Math.max(tags.join(',').length * 5, tags.length * 60) : 0;
  const badgeWidth = badge ? Math.max(String(badge).length * 7 + 32, 80) : 0;

  const shapeDef = getShapeDefinitionOrDefault(node.type ?? 'element');

  const contentWidth = Math.max(config.nodeWidth, textWidth, tagsWidth, badgeWidth) + CONTENT_PADDING;
  const baseWidth = Math.max(contentWidth, shapeDef.minWidth);

  const lineHeight = 18;
  const descLines = desc ? Math.ceil(desc.length / 40) : 0;
  const tagsLines = tags.length ? Math.ceil(tags.length / 3) : 0;
  const contentHeight = config.nodeHeight + descLines * lineHeight + tagsLines * lineHeight;
  const baseHeight = Math.max(contentHeight, shapeDef.minHeight);

  if (shapeDef.squareAspect) {
    const side = Math.max(baseWidth, baseHeight);
    return { width: side, height: side };
  }

  return { width: baseWidth, height: baseHeight };
}
