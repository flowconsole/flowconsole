import type { ArchitectureDiagramModel } from '../types';
import type { LayoutDirection } from './types';

/**
 * Lazy graphviz fallback — only loads graphviz-wasm (~1.5MB) when needed.
 * Used when ELK positioning fails (error or unavailable).
 */
export async function fallbackLayoutWithGraphviz(
  model: ArchitectureDiagramModel,
  direction: LayoutDirection
): Promise<ArchitectureDiagramModel> {
  const { layoutWithGraphviz } = await import('../graphvizLayoutService');
  return layoutWithGraphviz(model, direction);
}
