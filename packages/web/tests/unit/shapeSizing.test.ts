import { describe, it, expect } from 'vitest';
import { estimateShapeAwareSize } from '../../diagram/layout/shapeSizing';
import { DEFAULT_LAYOUT_CONFIG } from '../../diagram/layout/types';
import type { ArchitectureDiagramModel } from '../../diagram/types';

function makeNode(
  type: string,
  title = 'Test',
  extra: Record<string, unknown> = {},
): ArchitectureDiagramModel['nodes'][number] {
  return {
    id: 'n1',
    type: type as any,
    position: { x: 0, y: 0 },
    data: { title, ...extra },
  } as ArchitectureDiagramModel['nodes'][number];
}

describe('estimateShapeAwareSize', () => {
  const config = DEFAULT_LAYOUT_CONFIG;

  it('returns standard rectangle size for element type', () => {
    const size = estimateShapeAwareSize(makeNode('element'), config);
    expect(size.width).toBeGreaterThanOrEqual(200);
    expect(size.height).toBeGreaterThanOrEqual(92);
  });

  it('returns square dimensions for circle type', () => {
    const size = estimateShapeAwareSize(makeNode('circle'), config);
    expect(size.width).toBe(size.height);
    expect(size.width).toBeGreaterThanOrEqual(140);
  });

  it('enforces minimum size for hexagon type', () => {
    const size = estimateShapeAwareSize(makeNode('hexagon'), config);
    expect(size.width).toBeGreaterThanOrEqual(90);
    expect(size.height).toBeGreaterThanOrEqual(80);
  });

  it('enforces minimum size for cloud type', () => {
    const size = estimateShapeAwareSize(makeNode('cloud'), config);
    expect(size.width).toBeGreaterThanOrEqual(220);
    expect(size.height).toBeGreaterThanOrEqual(130);
  });

  it('grows circle dimension to fit long title', () => {
    const size = estimateShapeAwareSize(makeNode('circle', 'A Very Long Component Title Here'), config);
    // Circle must be square, so both dimensions grow
    expect(size.width).toBe(size.height);
    expect(size.width).toBeGreaterThan(140);
  });

  it('accounts for description in height calculation', () => {
    const withDesc = estimateShapeAwareSize(
      makeNode('element', 'Test', { description: 'A long description that spans multiple lines for testing' }),
      config,
    );
    const withoutDesc = estimateShapeAwareSize(makeNode('element', 'Test'), config);
    expect(withDesc.height).toBeGreaterThan(withoutDesc.height);
  });

  it('accounts for tags in height calculation', () => {
    const withTags = estimateShapeAwareSize(
      makeNode('element', 'Test', { tags: ['api', 'core', 'public', 'v2'] }),
      config,
    );
    const withoutTags = estimateShapeAwareSize(makeNode('element', 'Test'), config);
    expect(withTags.height).toBeGreaterThanOrEqual(withoutTags.height);
  });

  it('falls back to default shape for unknown types', () => {
    const size = estimateShapeAwareSize(makeNode('nonexistent'), config);
    expect(size.width).toBeGreaterThanOrEqual(200);
    expect(size.height).toBeGreaterThanOrEqual(92);
  });
});
