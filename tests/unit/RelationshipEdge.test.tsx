import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getBezierPath, Position, useInternalNode, useReactFlow } from '@xyflow/react';
import { RelationshipEdge } from '../../src/web/reactflow/edges/RelationshipEdge';

vi.mock('@xyflow/react', () => {
  const reactFlowInstance = {
    setEdges: vi.fn(),
    screenToFlowPosition: vi.fn(),
  };

  const getBezierPath = vi.fn(() => ['bezier-path', 10, 20]);
  const useInternalNode = vi.fn();
  const useReactFlow = vi.fn(() => reactFlowInstance);

  const Position = {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  } as const;

  const BaseEdge = ({
    id,
    path,
    markerEnd,
    markerStart,
    style,
    className,
    onContextMenu,
  }: any) => (
    <path
      data-testid="base-edge"
      data-id={id}
      data-style={JSON.stringify(style ?? {})}
      data-marker-end={markerEnd}
      data-marker-start={markerStart}
      className={className}
      d={path}
      onContextMenu={onContextMenu}
    />
  );

  const EdgeLabelRenderer = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    Position,
    useInternalNode,
    useReactFlow,
  };
});

vi.mock('d3-shape', () => {
  const line = () => {
    const api: any = () => 'smooth-path';
    api.curve = () => api;
    api.x = () => api;
    api.y = () => api;
    return api;
  };
  return {
    __esModule: true,
    curveCatmullRomOpen: { alpha: () => ({}) },
    line,
  };
});

type EdgeData = NonNullable<Parameters<typeof RelationshipEdge>[0]['data']>;

describe('RelationshipEdge', () => {
  const baseProps = {
    id: 'edge-1',
    source: 's',
    target: 't',
    sourceX: 0,
    sourceY: 0,
    targetX: 50,
    targetY: 0,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    selected: false,
  };

  let nodes: Record<string, any>;
  const useInternalNodeMock = vi.mocked(useInternalNode);
  const getBezierPathMock = vi.mocked(getBezierPath);
  const reactFlow = useReactFlow() as any;

  beforeEach(() => {
    nodes = {};
    vi.clearAllMocks();
    useInternalNodeMock.mockImplementation((id: string) => nodes[id]);
    reactFlow.setEdges.mockImplementation((updater: any) => {
      if (typeof updater === 'function') {
        reactFlow.lastEdges = updater([{ id: 'edge-ctx', data: {} }]);
      }
    });
    reactFlow.screenToFlowPosition.mockImplementation(({ x, y }: { x: number; y: number }) => ({ x, y }));
    getBezierPathMock.mockReturnValue(['bezier-path', 10, 20]);
  });

  const renderEdge = (data: EdgeData = {}, extra: Partial<typeof baseProps> = {}) =>
    render(<RelationshipEdge {...baseProps} data={data} {...extra} />);

  const parseStyle = (el: HTMLElement) => JSON.parse(el.getAttribute('data-style') ?? '{}');

  it('renders directional edge with label and icon', () => {
    renderEdge({ label: 'Main', detail: 'Detail', icon: '★', kind: 'sync' });
    const baseEdge = screen.getByTestId('base-edge');
    const style = parseStyle(baseEdge);
    expect(baseEdge.getAttribute('data-marker-end')).toBe('url(#edge-1-end)');
    expect(baseEdge.getAttribute('data-marker-start')).toBeNull();
    expect(baseEdge.getAttribute('class')).toContain('relationship-path--directional');
    expect(style.strokeWidth).toBe(2.4);
    expect(style.stroke).toBe('var(--diagram-primary)');
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Detail')).toBeInTheDocument();
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  it('applies bidirectional markers and animation when hovered', () => {
    renderEdge({ direction: 'both', hovered: true, kind: 'async' });
    const baseEdge = screen.getByTestId('base-edge');
    const style = parseStyle(baseEdge);
    expect(baseEdge.getAttribute('data-marker-start')).toBe('url(#edge-1-start)');
    expect(baseEdge.getAttribute('data-marker-end')).toBe('url(#edge-1-end)');
    expect(style.strokeDasharray).toBe('8 10');
    expect(style.animationDirection).toBe('alternate');
    expect(baseEdge.getAttribute('class')).toContain('relationship-path--animated');
    expect(style.stroke).toBe('var(--diagram-success)');
  });

  it('omits markers and animation when direction is none', () => {
    renderEdge({ direction: 'none', hovered: true });
    const baseEdge = screen.getByTestId('base-edge');
    const style = parseStyle(baseEdge);
    expect(baseEdge.getAttribute('data-marker-start')).toBeNull();
    expect(baseEdge.getAttribute('data-marker-end')).toBeNull();
    expect(style.strokeDasharray).toBeUndefined();
    expect(baseEdge.getAttribute('class')).not.toContain('relationship-path--animated');
    expect(baseEdge.getAttribute('class')).not.toContain('relationship-path--directional');
  });

  it('uses anchor points from nodes when provided', () => {
    nodes = {
      [baseProps.source]: {
        measured: { width: 100, height: 50 },
        internals: { positionAbsolute: { x: 10, y: 20 } },
      },
      [baseProps.target]: {
        measured: { width: 60, height: 40 },
        internals: { positionAbsolute: { x: 200, y: 100 } },
      },
    };
    renderEdge({
      sourceAnchor: { position: Position.Right, offset: 1 },
      targetAnchor: { position: Position.Left, offset: 0.25 },
    });
    expect(getBezierPathMock).toHaveBeenCalled();
    const call = getBezierPathMock.mock.calls[0][0];
    expect(call.sourceX).toBe(110); // 10 + 100
    expect(call.sourceY).toBe(70); // 20 + 1 * 50
    expect(call.targetX).toBe(200); // left anchor at x
    expect(call.targetY).toBe(110); // 100 + 0.25 * 40
  });

  it('prefers graphviz layout path when provided', () => {
    renderEdge({
      label: 'Graphviz',
      layoutPoints: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      labelPos: { x: 5, y: 5 },
    });
    const baseEdge = screen.getByTestId('base-edge');
    const path = baseEdge.getAttribute('d')!;
    // Should be a cubic Bezier path rendered directly from layoutPoints
    // (no normalization — layoutPoints are already in correct absolute coords)
    expect(path).not.toBe('bezier-path');
    expect(path).toContain('M 0,0');
    expect(path).toContain('C ');
    // Last point should be the last layoutPoint (20,20)
    expect(path).toMatch(/20,20$/);
    const label = screen.getByText('Graphviz').parentElement as HTMLElement;
    expect(label.style.transform).toBeDefined();
  });

  it('prefers manual control points over graphviz path', () => {
    renderEdge({
      controlPoints: [{ x: 10, y: 10 }, { x: 30, y: 10 }],
      layoutPoints: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    });
    const baseEdge = screen.getByTestId('base-edge');
    const path = baseEdge.getAttribute('d')!;
    // Manual control points produce a d3 catmullRom path (mocked as 'smooth-path'),
    // not the graphviz bezier or the fallback getBezierPath
    expect(path).not.toBe('bezier-path');
    expect(path).toBe('smooth-path');
  });

  it('shows control points on hover when data has controlPoints', () => {
    const { container } = renderEdge({ controlPoints: [{ x: 10, y: 10 }] });
    expect(container.querySelector('.relationship-control-point')).toBeNull();
    fireEvent.mouseEnter(container.querySelector('.relationship-path-interaction') as Element);
    expect(container.querySelector('.relationship-control-point')).not.toBeNull();
  });

  it('adds control point via context menu', () => {
    const props = { ...baseProps, id: 'edge-ctx' };
    render(
      <RelationshipEdge
        {...props}
        data={{
          controlPoints: [],
        }}
      />
    );
    fireEvent.contextMenu(screen.getByTestId('base-edge'));
    expect(reactFlow.setEdges).toHaveBeenCalled();
    const updated = reactFlow.lastEdges?.[0]?.data?.controlPoints;
    expect(updated).toBeDefined();
    expect(updated).toHaveLength(1);
  });

  /**
   * Regression: when React Flow hasn't computed positionAbsolute yet for
   * deeply-nested nodes, resolveAnchorPoint resolves to (0+offset, 0)
   * instead of the real position. The old code fed that into
   * normalizeGraphvizPoints, which shifted the ENTIRE Graphviz spline
   * by hundreds of pixels — producing huge arcs disconnected from nodes.
   *
   * The fix: use the Graphviz layoutPoints endpoints directly as sx/sy/tx/ty.
   * The path must always match the layoutPoints, regardless of what
   * positionAbsolute returns.
   */
  it('graphviz path is stable when positionAbsolute is not yet computed (regression)', () => {
    // Simulate a deeply-nested target node whose positionAbsolute is
    // still at (0,0) — React Flow hasn't resolved it yet.
    nodes = {
      [baseProps.source]: {
        measured: { width: 180, height: 200 },
        internals: { positionAbsolute: { x: 900, y: 50 } },
      },
      [baseProps.target]: {
        // positionAbsolute NOT computed yet → defaults to (0,0)
        measured: { width: 260, height: 120 },
        internals: { positionAbsolute: { x: 0, y: 0 } },
      },
    };

    // Graphviz placed the spline correctly: source near (1080, 150),
    // target near (200, 400) — a long cross-container edge.
    const layoutPoints = [
      { x: 1080, y: 150 },
      { x: 900, y: 200 },
      { x: 400, y: 350 },
      { x: 200, y: 400 },
    ];

    renderEdge(
      {
        layoutPoints,
        sourceAnchor: { position: Position.Right, offset: 0.5 },
        targetAnchor: { position: Position.Left, offset: 0.5 },
      },
      { sourceX: 1080, sourceY: 150, targetX: 200, targetY: 400 }
    );

    const baseEdge = screen.getByTestId('base-edge');
    const path = baseEdge.getAttribute('d')!;

    // Path must use the Graphviz layoutPoints, NOT the broken
    // resolveAnchorPoint result that would put the target at (0, 60).
    expect(path).toContain('M 1080,150');
    expect(path).toMatch(/200,400$/);

    // The old code would have produced a path ending near (0, 60)
    // because normalizeGraphvizPoints shifted everything toward the
    // broken positionAbsolute. Verify this doesn't happen:
    expect(path).not.toContain('M 0,');
    expect(path).not.toMatch(/0,60/);
  });

  it('graphviz path is stable when positionAbsolute lags behind for BOTH endpoints (regression)', () => {
    // Both source and target have positionAbsolute at (0,0).
    // Without the fix, the edge path degenerates to a tiny spline near the origin.
    nodes = {
      [baseProps.source]: {
        measured: { width: 180, height: 200 },
        internals: { positionAbsolute: { x: 0, y: 0 } },
      },
      [baseProps.target]: {
        measured: { width: 260, height: 120 },
        internals: { positionAbsolute: { x: 0, y: 0 } },
      },
    };

    const layoutPoints = [
      { x: 500, y: 100 },
      { x: 450, y: 150 },
      { x: 300, y: 250 },
      { x: 200, y: 300 },
    ];

    renderEdge(
      {
        layoutPoints,
        sourceAnchor: { position: Position.Bottom, offset: 0.5 },
        targetAnchor: { position: Position.Top, offset: 0.5 },
      },
      { sourceX: 500, sourceY: 100, targetX: 200, targetY: 300 }
    );

    const baseEdge = screen.getByTestId('base-edge');
    const path = baseEdge.getAttribute('d')!;

    // Path must still use the correct Graphviz coordinates
    expect(path).toContain('M 500,100');
    expect(path).toMatch(/200,300$/);
  });

  it('removes control point on right-click of handler', () => {
    const props = { ...baseProps, id: 'edge-ctx' };
    const { container } = render(
      <RelationshipEdge
        {...props}
        selected
        data={{
          controlPoints: [{ x: 5, y: 5 }],
        }}
      />
    );
    const controlPoint = container.querySelector('.relationship-control-point') as HTMLElement;
    fireEvent.pointerDown(controlPoint, { button: 2 });
    const updated = reactFlow.lastEdges?.[0]?.data?.controlPoints;
    expect(updated).toEqual([]);
  });
});
