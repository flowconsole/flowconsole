import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  layoutWithGraphviz: vi.fn(),
}));

vi.mock('../../../src/web/diagram/graphvizLayoutService', () => ({
  layoutWithGraphviz: (...args: unknown[]) => mocks.layoutWithGraphviz(...args),
}));

describe('layoutPipeline', () => {
  beforeEach(() => {
    mocks.layoutWithGraphviz.mockReset();
  });

  it('delegates to graphviz when graphviz is explicitly requested', async () => {
    const model = {
      nodes: [{ id: 'a', type: 'element', position: { x: 0, y: 0 }, data: { title: 'A' } }],
      edges: [],
    };
    const laidOut = {
      nodes: [{ id: 'a', type: 'element', position: { x: 10, y: 20 }, data: { title: 'A' } }],
      edges: [],
    };
    mocks.layoutWithGraphviz.mockResolvedValueOnce(laidOut);

    const { layoutPipeline } = await import('../../../src/web/diagram/layout/layoutPipeline');
    const result = await layoutPipeline(model as never, {
      engine: 'graphviz',
    });

    expect(mocks.layoutWithGraphviz).toHaveBeenCalledTimes(1);
    expect(result.nodes[0]?.position).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
  });
});
