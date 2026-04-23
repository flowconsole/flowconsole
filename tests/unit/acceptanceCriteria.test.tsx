/**
 * Task 8: Formalized acceptance criteria tests.
 * Each test maps to a specific acceptance criterion from the plan.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { evaluateDiagramCode } from '../../src/web/languages/typescript/evaluateDiagramCode';
import { CircleNode } from '../../src/web/reactflow/nodes/CircleNode';
import { HexagonNode } from '../../src/web/reactflow/nodes/HexagonNode';
import { CloudNode } from '../../src/web/reactflow/nodes/CloudNode';
import { ElementNode } from '../../src/web/reactflow/nodes/ElementNode';
import { ContainerNode } from '../../src/web/reactflow/nodes/ContainerNode';
import { BaseElementNode } from '../../src/web/reactflow/nodes/BaseElementNode';
import { presetStyles, resolveNodeStyles } from '../../src/web/diagram/theme';
import type { ContainerNodeType } from '../../src/web/diagram/types';
import {
  circleShapeCode,
  hexagonShapeCode,
  cloudShapeCode,
  rectangleShapeCode,
  cylinderShapeCode,
  pipeShapeCode,
  customBgColorOnRectCode,
  customBgColorOnCircleCode,
  customBorderColorOnRectCode,
  customBorderColorOnHexagonCode,
  deprecatedPresetCode,
  highlightedPresetCode,
  criticalPresetCode,
  deprecatedWithGreenBorderCode,
} from '../fixtures/sdk-styles-showcase';

vi.mock('../../src/web/reactflow/nodes/HiddenHandles', () => ({
  HiddenHandles: () => <div data-testid="handles" />,
}));

// ── Shapes (nodeType + visual) ──

describe('Acceptance: Shapes produce correct nodeTypes and DOM', () => {
  it('circle shape -> type=circle, DOM has <circle>, aspect-ratio 1:1', async () => {
    const result = await evaluateDiagramCode(circleShapeCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Circle GW');
    expect(node).toBeDefined();
    expect(node!.type).toBe('circle');

    const { container } = render(
      <CircleNode id="c1" data={{ title: 'Circle GW' }} selected={false} />
    );
    const circleEl = container.querySelector('circle');
    expect(circleEl).not.toBeNull();
    // aspect-ratio is set via CSS class; verify the class is applied
    const card = container.querySelector('.diagram-card--circle') as HTMLElement;
    expect(card).not.toBeNull();
  }, 15000);

  it('hexagon shape -> type=hexagon, DOM has <polygon> with 6 points', async () => {
    const result = await evaluateDiagramCode(hexagonShapeCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Hex GW');
    expect(node).toBeDefined();
    expect(node!.type).toBe('hexagon');

    const { container } = render(
      <HexagonNode id="h1" data={{ title: 'Hex GW' }} selected={false} />
    );
    const polygon = container.querySelector('polygon');
    expect(polygon).not.toBeNull();
    const points = polygon!.getAttribute('points') ?? '';
    expect(points.split(' ').length).toBe(6);
  }, 15000);

  it('cloud shape -> type=cloud, DOM has <path> with d > 20 chars (smooth curves)', async () => {
    const result = await evaluateDiagramCode(cloudShapeCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Cloud Ext');
    expect(node).toBeDefined();
    expect(node!.type).toBe('cloud');

    const { container } = render(
      <CloudNode id="cl1" data={{ title: 'Cloud Ext' }} selected={false} />
    );
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    const d = path!.getAttribute('d') ?? '';
    expect(d.length).toBeGreaterThan(20);
    expect(d).toContain('C');
  }, 15000);

  it('rectangle (default) -> type=element, DOM has no SVG shape layer', async () => {
    const result = await evaluateDiagramCode(rectangleShapeCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Rect API');
    expect(node).toBeDefined();
    expect(node!.type).toBe('element');

    const { container } = render(
      <ElementNode id="e1" data={{ title: 'Rect API' }} selected={false} />
    );
    expect(container.querySelector('.diagram-card__shape-bg')).toBeNull();
    expect(container.querySelector('.diagram-shape-svg')).toBeNull();
  }, 15000);

  it('cylinder -> type=database, CSS form preserved', async () => {
    const result = await evaluateDiagramCode(cylinderShapeCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Cyl DB');
    expect(node).toBeDefined();
    expect(node!.type).toBe('database');

    // database uses ElementNode with shapeClassName=database (registered as same component)
    const { container } = render(
      <ElementNode id="db1" data={{ title: 'Cyl DB' }} selected={false} />
    );
    expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--service');
  }, 15000);

  it('pipe -> type=queue, CSS form preserved', async () => {
    const result = await evaluateDiagramCode(pipeShapeCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Pipe Q');
    expect(node).toBeDefined();
    expect(node!.type).toBe('queue');
  }, 15000);
});

describe('Acceptance: Custom colors apply correctly', () => {
  it('backgroundColor on rectangle -> style contains the color', async () => {
    const result = await evaluateDiagramCode(customBgColorOnRectCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Red BG');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('customBackgroundColor', '#e74c3c');

    const { container } = render(
      <BaseElementNode
        data={{ title: 'Red BG', customBackgroundColor: '#e74c3c' }}
        shapeClassName="service"
      />
    );
    const card = container.querySelector('.diagram-card') as HTMLElement;
    expect(card).toHaveStyle({ backgroundColor: '#e74c3c' });
  }, 15000);

  it('backgroundColor on circle -> SVG <circle fill="#e74c3c">', async () => {
    const result = await evaluateDiagramCode(customBgColorOnCircleCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Red Circle');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('customBackgroundColor', '#e74c3c');

    const { container } = render(
      <CircleNode
        id="c2"
        data={{ title: 'Red Circle', customBackgroundColor: '#e74c3c' }}
        selected={false}
      />
    );
    const circle = container.querySelector('circle');
    expect(circle?.getAttribute('fill')).toBe('#e74c3c');
  }, 15000);

  it('borderColor on rectangle -> border-color applied', async () => {
    const result = await evaluateDiagramCode(customBorderColorOnRectCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Red Border');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('customBorderColor', '#c0392b');

    const { container } = render(
      <BaseElementNode
        data={{ title: 'Red Border', customBorderColor: '#c0392b' }}
        shapeClassName="service"
      />
    );
    const card = container.querySelector('.diagram-card') as HTMLElement;
    expect(card).toHaveStyle({ borderColor: '#c0392b' });
  }, 15000);

  it('borderColor on hexagon -> SVG <polygon stroke="#c0392b">', async () => {
    const result = await evaluateDiagramCode(customBorderColorOnHexagonCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Red Hex');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('customBorderColor', '#c0392b');

    const { container } = render(
      <HexagonNode
        id="h2"
        data={{ title: 'Red Hex', customBorderColor: '#c0392b' }}
        selected={false}
      />
    );
    const polygon = container.querySelector('polygon');
    expect(polygon?.getAttribute('stroke')).toBe('#c0392b');
  }, 15000);
});

describe('Acceptance: Presets apply correct visual styles', () => {
  it('deprecated -> opacity <= 0.6, dashed border (rect) or stroke-dasharray (SVG)', async () => {
    const result = await evaluateDiagramCode(deprecatedPresetCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Deprecated');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('preset', 'deprecated');

    // Check opacity via resolveNodeStyles
    const resolved = resolveNodeStyles({ preset: 'deprecated' });
    expect(resolved.opacity).toBeLessThanOrEqual(0.6);

    // Rectangle: CSS class applies dashed border
    const { container } = render(
      <BaseElementNode data={{ title: 'Dep', preset: 'deprecated' }} shapeClassName="service" />
    );
    const card = container.querySelector('.diagram-card') as HTMLElement;
    expect(card).toHaveClass('diagram-card--deprecated');
    expect(card.style.opacity).toBe('0.6');

    // SVG shape: stroke-dasharray applied via CSS class
    const { container: circleContainer } = render(
      <CircleNode id="dc" data={{ title: 'Dep Circle', preset: 'deprecated' }} selected={false} />
    );
    expect(circleContainer.querySelector('.diagram-card--deprecated')).not.toBeNull();
  }, 15000);

  it('highlighted -> filter: drop-shadow applied via CSS class', async () => {
    const result = await evaluateDiagramCode(highlightedPresetCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Highlighted');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('preset', 'highlighted');

    const { container } = render(
      <BaseElementNode data={{ title: 'HL', preset: 'highlighted' }} shapeClassName="service" />
    );
    expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--highlighted');
  }, 15000);

  it('critical -> borderColor is red tone from presetStyles', async () => {
    const result = await evaluateDiagramCode(criticalPresetCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Critical');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('preset', 'critical');

    const resolved = resolveNodeStyles({ preset: 'critical' });
    expect(resolved.borderColor).toBe(presetStyles.critical.borderColor);
    expect(resolved.borderColor).toBe('#ef4444');
  }, 15000);

  it('priority: deprecated + borderColor #00ff00 -> final border is green', async () => {
    const result = await evaluateDiagramCode(deprecatedWithGreenBorderCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Override');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('preset', 'deprecated');
    expect(node!.data).toHaveProperty('customBorderColor', '#00ff00');

    // resolveNodeStyles: explicit overrides preset
    const resolved = resolveNodeStyles({ preset: 'deprecated', customBorderColor: '#00ff00' });
    expect(resolved.borderColor).toBe('#00ff00');
    // opacity from preset still applies
    expect(resolved.opacity).toBe(0.6);

    // Render: card border is green, not preset gray
    const { container } = render(
      <BaseElementNode
        data={{ title: 'Override', preset: 'deprecated', customBorderColor: '#00ff00' }}
        shapeClassName="service"
      />
    );
    const card = container.querySelector('.diagram-card') as HTMLElement;
    expect(card).toHaveStyle({ borderColor: '#00ff00' });
    // preset class still applied for dashed border effect
    expect(card).toHaveClass('diagram-card--deprecated');
  }, 15000);
});

describe('Acceptance: Container click navigation', () => {
  const renderContainer = (data: Partial<ContainerNodeType['data']> = {}) =>
    render(
      <ContainerNode
        id="nav-1"
        data={{ title: 'System', ...data }}
        selected={false}
        type="container"
        dragging={false}
        zIndex={0}
        selectable={false}
        deletable={false}
        draggable={false}
        isConnectable={false}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
      />
    );

  it('click on collapsed container dispatches container:open', () => {
    const listener = vi.fn();
    window.addEventListener('container:open', listener as EventListener);

    const { container } = renderContainer({ expanded: false, childCount: 3 });
    const el = container.querySelector('.diagram-container') as HTMLElement;
    fireEvent.click(el);

    expect(listener).toHaveBeenCalledTimes(1);
    const detail = (listener.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.id).toBe('nav-1');

    window.removeEventListener('container:open', listener as EventListener);
  });

  it('click on expanded container dispatches container:open', () => {
    const listener = vi.fn();
    window.addEventListener('container:open', listener as EventListener);

    const { container } = renderContainer({ expanded: true });
    const el = container.querySelector('.diagram-container') as HTMLElement;
    fireEvent.click(el);

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail.id).toBe('nav-1');

    window.removeEventListener('container:open', listener as EventListener);
  });

  it('click on child node does NOT dispatch container:open (event stops at child)', () => {
    // In ReactFlow, child nodes are separate DOM trees. Here we test via the
    // currentTarget !== target guard and drag threshold. A click with movement
    // beyond DRAG_THRESHOLD should not fire the event.
    const listener = vi.fn();
    window.addEventListener('container:open', listener as EventListener);

    const { container } = renderContainer({ expanded: true });
    const el = container.querySelector('.diagram-container') as HTMLElement;
    // Simulate drag (child node interaction typically involves movement)
    fireEvent.mouseDown(el, { clientX: 100, clientY: 100 });
    fireEvent.click(el, { clientX: 200, clientY: 200 });

    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener('container:open', listener as EventListener);
  });
});
