import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContainerNodeType, ElementNodeType } from '../../diagram/types';
import { ContainerNode } from '../../reactflow/nodes/ContainerNode';
import { ElementNode } from '../../reactflow/nodes/ElementNode';
import { CircleNode } from '../../reactflow/nodes/CircleNode';
import { HexagonNode } from '../../reactflow/nodes/HexagonNode';
import { CloudNode } from '../../reactflow/nodes/CloudNode';
import { DatabaseNode } from '../../reactflow/nodes/DatabaseNode';
import { QueueNode } from '../../reactflow/nodes/QueueNode';
import { PersonNode } from '../../reactflow/nodes/PersonNode';
import { StorageNode } from '../../reactflow/nodes/StorageNode';
import { BoundaryNode } from '../../reactflow/nodes/BoundaryNode';
import { BaseElementNode } from '../../reactflow/nodes/BaseElementNode';
import { resolvePresetStyle, presetStyles, resolveNodeStyles } from '../../diagram/theme';
import { fireEvent } from '@testing-library/react';

vi.mock('../../reactflow/nodes/HiddenHandles', () => ({
  HiddenHandles: () => <div data-testid="handles" />,
}));

describe('Diagram nodes', () => {
  describe('ContainerNode', () => {
    const renderContainer = (data: Partial<ContainerNodeType['data']> = {}, selected = false) =>
      render(<ContainerNode id="container-1" data={{ title: 'Module', ...data }} selected={selected} type={'container'} dragging={false} zIndex={0} selectable={false} deletable={false} draggable={false} isConnectable={false} positionAbsoluteX={0} positionAbsoluteY={0} />);

    it('dispatches container:open when clicking collapsed container', () => {
      const listener = vi.fn();
      window.addEventListener('container:open', listener as EventListener);
      const { container } = renderContainer({ description: 'desc', childCount: 2, expanded: false });
      const containerEl = container.querySelector('.diagram-container') as HTMLElement;
      fireEvent.click(containerEl);
      expect(listener).toHaveBeenCalled();
      expect((listener.mock.calls[0][0] as CustomEvent).detail.id).toBe('container-1');
      expect(screen.getByTestId('handles')).toBeInTheDocument();
      window.removeEventListener('container:open', listener as EventListener);
    });

    it('dispatches container:open when clicking expanded container', () => {
      const listener = vi.fn();
      window.addEventListener('container:open', listener as EventListener);
      const { container } = renderContainer({ expanded: true });
      const containerEl = container.querySelector('.diagram-container') as HTMLElement;
      fireEvent.click(containerEl);
      expect(listener).toHaveBeenCalled();
      expect((listener.mock.calls[0][0] as CustomEvent).detail.id).toBe('container-1');
      window.removeEventListener('container:open', listener as EventListener);
    });

    it('renders collapsed layout with centered content and cursor pointer', () => {
      const { container } = renderContainer({ description: 'Short desc', expanded: false, childCount: 2 });
      expect(screen.getByText('Module')).toBeInTheDocument();
      expect(screen.getByText('Short desc')).toBeInTheDocument();
      const containerEl = container.querySelector('.diagram-container') as HTMLElement;
      expect(containerEl.style.cursor).toBe('pointer');
      expect(screen.getByTestId('handles')).toBeInTheDocument();
    });

    it('renders default cursor on container with no children', () => {
      const { container } = renderContainer({ expanded: false, childCount: 0 });
      const containerEl = container.querySelector('.diagram-container') as HTMLElement;
      expect(containerEl.style.cursor).toBe('default');
    });

    it('does not dispatch container:open when clicking container with no children', () => {
      const listener = vi.fn();
      window.addEventListener('container:open', listener as EventListener);
      const { container } = renderContainer({ expanded: false, childCount: 0 });
      const containerEl = container.querySelector('.diagram-container') as HTMLElement;
      fireEvent.click(containerEl);
      expect(listener).not.toHaveBeenCalled();
      window.removeEventListener('container:open', listener as EventListener);
    });

    it('renders title in collapsed state regardless of childCount', () => {
      renderContainer({ expanded: false, childCount: 3 });
      expect(screen.getByText('Module')).toBeInTheDocument();
    });

    it('does not dispatch container:open when mouse is dragged (pan/zoom)', () => {
      const listener = vi.fn();
      window.addEventListener('container:open', listener as EventListener);
      const { container } = renderContainer({ expanded: false });
      const containerEl = container.querySelector('.diagram-container') as HTMLElement;
      // Simulate a drag: mousedown at (100,100), then click at (200, 200)
      fireEvent.mouseDown(containerEl, { clientX: 100, clientY: 100 });
      fireEvent.click(containerEl, { clientX: 200, clientY: 200 });
      expect(listener).not.toHaveBeenCalled();
      window.removeEventListener('container:open', listener as EventListener);
    });

    it('applies muted tone by default and no selection shadow when not selected', () => {
      const { container } = renderContainer();
      const card = container.querySelector('.diagram-container') as HTMLElement;
      expect(card.style.borderColor).toBe('var(--diagram-muted)');
      expect(card.style.boxShadow).toBe('');
    });

    it('applies custom tone and selection box shadow when selected', () => {
      const { container } = renderContainer({ tone: 'warning' }, true);
      const card = container.querySelector('.diagram-container') as HTMLElement;
      expect(card.style.borderColor).toBe('var(--diagram-warning)');
      expect(card.style.boxShadow).toContain('var(--diagram-warning)22');
      expect(card.style.boxShadow).toContain('var(--diagram-card-shadow)');
    });

    it('renders subtitle, description, and badge in expanded layout', () => {
      renderContainer({ subtitle: 'Sub', description: 'desc', badge: 'beta', expanded: true });
      expect(screen.getByText('Sub')).toBeInTheDocument();
      expect(screen.getByText('desc')).toBeInTheDocument();
      expect(screen.getByText('beta')).toBeInTheDocument();
    });

    it('omits subtitle and description when not provided in expanded layout', () => {
      const { container } = renderContainer({ expanded: true });
      expect(container.querySelector('.diagram-card__subtitle')).toBeNull();
      expect(container.querySelector('.diagram-container__body')).toBeNull();
    });

  });

  describe('ElementNode', () => {
    const renderElement = (data: Partial<ElementNodeType['data']> = {}, selected = false, type = 'element') =>
      render(<ElementNode id="element-1" data={{ title: 'Service', ...data }} selected={selected} type={type} dragging={false} zIndex={0} selectable={false} deletable={false} draggable={false} isConnectable={false} positionAbsoluteX={0} positionAbsoluteY={0} />);

    it.each<ElementNodeType['data']['status'][]>(['operational', 'degraded', 'down'])(
      'applies status color for %s',
      (status) => {
        const { container } = renderElement({ status });
        const statusDot = container.querySelector('.diagram-status') as HTMLElement;
        const expected =
          status === 'operational'
            ? 'var(--diagram-success)'
            : status === 'degraded'
              ? 'var(--diagram-warning)'
              : 'var(--diagram-danger)';
        expect(statusDot).toHaveStyle({ background: expected });
      }
    );

    it('hides status dot when status is missing', () => {
      const { container } = renderElement();
      expect(container.querySelector('.diagram-status')).toBeNull();
    });

    it('uses default tone without selection highlight when not selected', () => {
      const { container } = renderElement();
      const card = container.querySelector('.diagram-card') as HTMLElement;
      const icon = container.querySelector('.diagram-icon') as HTMLElement;
      expect(card.style.borderColor).toBe('var(--diagram-primary)');
      expect(icon.style.borderColor).toBe('var(--diagram-primary)');
      expect(card.style.boxShadow).toBe('');
    });

    it('applies custom tone and selection box shadow when selected', () => {
      const { container } = renderElement({ tone: 'danger' }, true);
      const card = container.querySelector('.diagram-card') as HTMLElement;
      expect(card.style.borderColor).toBe('var(--diagram-danger)');
      expect(card.style.boxShadow).toContain('var(--diagram-danger)33');
      expect(card.style.boxShadow).toContain('var(--diagram-card-shadow)');
    });

    it('renders service icon by default', () => {
      const { container } = renderElement();
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--service');
      expect(container.querySelector('.diagram-icon svg')).not.toBeNull();
    });

    it('renders service shape styling by default (shape determined by nodeType, not data)', () => {
      const { container } = renderElement();
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--service');
      expect(container.querySelector('.diagram-icon')).toHaveClass('diagram-icon--service');
    });

    it('prefers custom icon over default svg icon', () => {
      const { container } = renderElement({ icon: '✨' });
      expect((container.querySelector('.diagram-icon') as HTMLElement).textContent).toBe('✨');
      expect(container.querySelector('.diagram-icon svg')).toBeNull();
    });

    it('renders badge and description when provided', () => {
      renderElement({ badge: 'beta', description: 'Detailed description' }, true);
      expect(screen.getByText('beta')).toBeInTheDocument();
      expect(screen.getByText('Detailed description')).toBeInTheDocument();
      expect(screen.getByTestId('handles')).toBeInTheDocument();
    });

    it('renders all provided tags', () => {
      renderElement({ tags: ['api', 'core', 'public'] });
      expect(screen.getByText('api')).toBeInTheDocument();
      expect(screen.getByText('core')).toBeInTheDocument();
      expect(screen.getByText('public')).toBeInTheDocument();
    });

    it('omits tag block when tags array is empty', () => {
      const { container } = renderElement({ tags: [] });
      expect(container.querySelector('.diagram-card__tags')).toBeNull();
    });

    it('hides description when not provided', () => {
      const { container } = renderElement({ description: undefined });
      expect(container.querySelector('.diagram-card__description')).toBeNull();
    });

    it('does not add interactive handlers even when clickable is set', () => {
      const { container } = renderElement({ clickable: true });
      const card = container.querySelector('.diagram-card') as HTMLElement;
      expect(card.getAttribute('role')).toBeNull();
      expect(card.getAttribute('tabindex')).toBeNull();
      expect(card.getAttribute('onclick')).toBeNull();
    });

    it('renders service CSS class (rectangle is the only shape handled by ElementNode)', () => {
      const { container } = renderElement();
      const card = container.querySelector('.diagram-card') as HTMLElement;
      expect(card).toHaveClass('diagram-card--service');
      const icon = container.querySelector('.diagram-icon') as HTMLElement;
      expect(icon).toHaveClass('diagram-icon--service');
    });
  });

  describe('BaseElementNode', () => {
    it('renders with minimal data', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Test' }} shapeClassName="service" />
      );
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--service');
    });

    it('renders SVG shape-bg layer when renderShapeBackground is provided', () => {
      const { container } = render(
        <BaseElementNode
          data={{ title: 'Circle Test' }}
          shapeClassName="circle"
          renderShapeBackground={({ borderColor }) => (
            <svg data-testid="shape-svg">
              <circle cx="50" cy="50" r="48" stroke={borderColor} />
            </svg>
          )}
        />
      );
      expect(container.querySelector('.diagram-card__shape-bg')).toBeInTheDocument();
      expect(screen.getByTestId('shape-svg')).toBeInTheDocument();
    });

    it('renders without shape-bg layer when no renderer is provided', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Rect Test' }} shapeClassName="service" />
      );
      expect(container.querySelector('.diagram-card__shape-bg')).toBeNull();
    });

    it('applies ghost styling when ghost flag is set', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Ghost', ghost: true }} shapeClassName="service" />
      );
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--ghost');
    });
  });

  describe('CircleNode', () => {
    const renderCircle = (data: Partial<ElementNodeType['data']> = {}, selected = false) =>
      render(<CircleNode id="circle-1" data={{ title: 'Circle', ...data }} selected={selected} />);

    it('renders without errors with minimal data', () => {
      const { container } = renderCircle();
      expect(screen.getByText('Circle')).toBeInTheDocument();
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--circle');
      expect(screen.getByTestId('handles')).toBeInTheDocument();
    });

    it('contains an SVG circle element in the DOM', () => {
      const { container } = renderCircle();
      const circleEl = container.querySelector('circle');
      expect(circleEl).not.toBeNull();
      expect(circleEl?.getAttribute('cx')).toBe('50');
      expect(circleEl?.getAttribute('cy')).toBe('50');
    });

    it('renders the shape background layer', () => {
      const { container } = renderCircle();
      expect(container.querySelector('.diagram-card__shape-bg')).toBeInTheDocument();
      expect(container.querySelector('.diagram-shape-svg')).toBeInTheDocument();
    });
  });

  describe('HexagonNode', () => {
    const renderHexagon = (data: Partial<ElementNodeType['data']> = {}, selected = false) =>
      render(<HexagonNode id="hex-1" data={{ title: 'Hexagon', ...data }} selected={selected} />);

    it('renders without errors with minimal data', () => {
      const { container } = renderHexagon();
      expect(screen.getByText('Hexagon')).toBeInTheDocument();
      expect(screen.getByTestId('handles')).toBeInTheDocument();
    });

    it('contains an SVG polygon element with 6 points in the DOM', () => {
      const { container } = renderHexagon();
      const polygon = container.querySelector('polygon');
      expect(polygon).not.toBeNull();
      const points = polygon?.getAttribute('points') ?? '';
      // 6 vertices means 6 comma-separated pairs
      expect(points.split(' ').length).toBe(6);
    });

    it('renders the shape background layer', () => {
      const { container } = renderHexagon();
      expect(container.querySelector('.diagram-card__shape-bg')).toBeInTheDocument();
      expect(container.querySelector('.diagram-shape-svg')).toBeInTheDocument();
    });
  });

  describe('CloudNode', () => {
    const renderCloud = (data: Partial<ElementNodeType['data']> = {}, selected = false) =>
      render(<CloudNode id="cloud-1" data={{ title: 'Cloud', ...data }} selected={selected} />);

    it('renders without errors with minimal data', () => {
      const { container } = renderCloud();
      expect(screen.getByText('Cloud')).toBeInTheDocument();
      expect(screen.getByTestId('handles')).toBeInTheDocument();
    });

    it('contains an SVG path element with smooth Bezier curves (d attribute > 20 chars)', () => {
      const { container } = renderCloud();
      const path = container.querySelector('path');
      expect(path).not.toBeNull();
      const d = path?.getAttribute('d') ?? '';
      expect(d.length).toBeGreaterThan(20);
      // Should contain C (cubic Bezier) commands for smooth curves
      expect(d).toContain('C');
    });

    it('renders the shape background layer', () => {
      const { container } = renderCloud();
      expect(container.querySelector('.diagram-card__shape-bg')).toBeInTheDocument();
      expect(container.querySelector('.diagram-shape-svg')).toBeInTheDocument();
    });
  });

  describe('DatabaseNode', () => {
    it('renders cylinder SVG with rim path and applies custom colors', () => {
      const { container } = render(
        <DatabaseNode
          id="db-1"
          data={{ title: 'DB', customBorderColor: '#ff0000', customBackgroundColor: '#00ff00' }}
          selected={false}
        />
      );
      expect(screen.getByText('DB')).toBeInTheDocument();
      const paths = container.querySelectorAll('.diagram-shape-svg path');
      expect(paths.length).toBeGreaterThanOrEqual(2);
      expect(paths[0].getAttribute('fill')).toBe('#00ff00');
      expect(paths[0].getAttribute('stroke')).toBe('#ff0000');
    });
  });

  describe('QueueNode', () => {
    it('renders pipe SVG with right-side end-cap and applies custom colors', () => {
      const { container } = render(
        <QueueNode
          id="q-1"
          data={{ title: 'Q', customBorderColor: '#ff0000', customBackgroundColor: '#00ff00' }}
          selected={false}
        />
      );
      expect(screen.getByText('Q')).toBeInTheDocument();
      const paths = container.querySelectorAll('.diagram-shape-svg path');
      expect(paths.length).toBe(2);
      expect(paths[0].getAttribute('fill')).toBe('#00ff00');
      expect(paths[0].getAttribute('stroke')).toBe('#ff0000');
    });
  });

  describe('PersonNode', () => {
    it('renders as rectangular card without SVG silhouette background', () => {
      const { container } = render(
        <PersonNode id="p-1" data={{ title: 'User' }} selected={false} />
      );
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--person');
      expect(container.querySelector('.diagram-card__shape-bg')).toBeNull();
      // Default icon for person shape class is IconUser (Tabler SVG).
      expect(container.querySelector('.diagram-icon svg')).not.toBeNull();
    });
  });

  describe('StorageNode', () => {
    it('renders nested dashed rectangles', () => {
      const { container } = render(
        <StorageNode id="s-1" data={{ title: 'Vol' }} selected={false} />
      );
      expect(screen.getByText('Vol')).toBeInTheDocument();
      const rects = container.querySelectorAll('.diagram-shape-svg rect');
      expect(rects.length).toBe(2);
      expect(rects[0].getAttribute('stroke-dasharray')).toBe('6 4');
    });
  });

  describe('BoundaryNode', () => {
    it('renders dashed rectangle boundary', () => {
      const { container } = render(
        <BoundaryNode id="b-1" data={{ title: 'Zone' }} selected={false} />
      );
      expect(screen.getByText('Zone')).toBeInTheDocument();
      const rect = container.querySelector('.diagram-shape-svg rect');
      expect(rect).not.toBeNull();
      expect(rect?.getAttribute('stroke-dasharray')).toBe('10 5');
    });
  });

  describe('resolvePresetStyle', () => {
    it('returns empty object for undefined preset', () => {
      expect(resolvePresetStyle(undefined)).toEqual({});
    });

    it('returns empty object for default preset', () => {
      expect(resolvePresetStyle('default')).toEqual({});
    });

    it.each(['highlighted', 'critical', 'deprecated', 'new', 'external'] as const)(
      'returns non-empty overrides for %s preset',
      (preset) => {
        const result = resolvePresetStyle(preset);
        expect(result.borderColor).toBeDefined();
        expect(result.backgroundColor).toBeDefined();
      }
    );

    it('deprecated preset includes opacity', () => {
      const result = resolvePresetStyle('deprecated');
      expect(result.opacity).toBe(0.6);
    });

    it('highlighted preset does not include opacity', () => {
      const result = resolvePresetStyle('highlighted');
      expect(result.opacity).toBeUndefined();
    });
  });

  describe('resolveNodeStyles', () => {
    it('returns tone accent as borderColor by default', () => {
      const result = resolveNodeStyles({ tone: 'danger' });
      expect(result.borderColor).toBe('var(--diagram-danger)');
      expect(result.backgroundColor).toBeUndefined();
      expect(result.color).toBeUndefined();
    });

    it('preset overrides tone borderColor', () => {
      const result = resolveNodeStyles({ tone: 'primary', preset: 'critical' });
      expect(result.borderColor).toBe(presetStyles.critical.borderColor);
    });

    it('explicit customBorderColor overrides preset', () => {
      const result = resolveNodeStyles({ preset: 'critical', customBorderColor: '#00ff00' });
      expect(result.borderColor).toBe('#00ff00');
    });

    it('explicit customBackgroundColor overrides preset', () => {
      const result = resolveNodeStyles({ preset: 'highlighted', customBackgroundColor: '#e74c3c' });
      expect(result.backgroundColor).toBe('#e74c3c');
    });

    it('explicit customColor is returned', () => {
      const result = resolveNodeStyles({ customColor: '#ff0000' });
      expect(result.color).toBe('#ff0000');
    });

    it('full priority chain: explicit > preset > tone', () => {
      const result = resolveNodeStyles({
        tone: 'success',
        preset: 'deprecated',
        customBorderColor: '#00ff00',
      });
      // explicit wins
      expect(result.borderColor).toBe('#00ff00');
      // opacity from preset still applies
      expect(result.opacity).toBe(0.6);
    });
  });

  describe('BaseElementNode with presets and custom colors', () => {
    it('applies preset CSS class when preset is set', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Test', preset: 'highlighted' }} shapeClassName="service" />
      );
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--highlighted');
    });

    it('does not apply preset CSS class for default preset', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Test', preset: 'default' }} shapeClassName="service" />
      );
      expect(container.querySelector('.diagram-card')?.className).not.toContain('diagram-card--default');
    });

    it('applies custom border color to card style', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Test', customBorderColor: '#c0392b' }} shapeClassName="service" />
      );
      const card = container.querySelector('.diagram-card') as HTMLElement;
      expect(card).toHaveStyle({ borderColor: '#c0392b' });
    });

    it('applies custom background color to card style', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Test', customBackgroundColor: '#e74c3c' }} shapeClassName="service" />
      );
      const card = container.querySelector('.diagram-card') as HTMLElement;
      expect(card).toHaveStyle({ backgroundColor: '#e74c3c' });
    });

    it('explicit custom colors override preset on the card', () => {
      const { container } = render(
        <BaseElementNode
          data={{ title: 'Test', preset: 'deprecated', customBorderColor: '#00ff00' }}
          shapeClassName="service"
        />
      );
      const card = container.querySelector('.diagram-card') as HTMLElement;
      expect(card).toHaveStyle({ borderColor: '#00ff00' });
      // preset class still applied for CSS effects (dashed border, etc.)
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--deprecated');
    });

    it('applies opacity from deprecated preset', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Test', preset: 'deprecated' }} shapeClassName="service" />
      );
      const card = container.querySelector('.diagram-card') as HTMLElement;
      expect(card.style.opacity).toBe('0.6');
    });
  });

  describe('SVG shape nodes apply fill/stroke from resolved styles', () => {
    it('CircleNode applies custom backgroundColor as fill and borderColor as stroke', () => {
      const { container } = render(
        <CircleNode
          id="c1"
          data={{ title: 'C', customBackgroundColor: '#e74c3c', customBorderColor: '#c0392b' }}
          selected={false}
        />
      );
      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#e74c3c');
      expect(circle?.getAttribute('stroke')).toBe('#c0392b');
    });

    it('HexagonNode applies preset colors as fill/stroke on polygon', () => {
      const { container } = render(
        <HexagonNode
          id="h1"
          data={{ title: 'H', preset: 'critical' }}
          selected={false}
        />
      );
      const polygon = container.querySelector('polygon');
      expect(polygon?.getAttribute('stroke')).toBe(presetStyles.critical.borderColor);
      expect(polygon?.getAttribute('fill')).toBe(presetStyles.critical.backgroundColor);
    });

    it('CloudNode applies explicit colors overriding preset on path', () => {
      const { container } = render(
        <CloudNode
          id="cl1"
          data={{ title: 'Cl', preset: 'highlighted', customBorderColor: '#00ff00' }}
          selected={false}
        />
      );
      const path = container.querySelector('path');
      // explicit borderColor overrides preset
      expect(path?.getAttribute('stroke')).toBe('#00ff00');
      // backgroundColor from preset (no explicit override)
      expect(path?.getAttribute('fill')).toBe(presetStyles.highlighted.backgroundColor);
    });

    it('SVG shapes use default panel fill when no custom colors or preset', () => {
      const { container } = render(
        <CircleNode id="c2" data={{ title: 'Default' }} selected={false} />
      );
      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('var(--diagram-panel)');
    });
  });

  describe('ContainerNode with presets and custom colors', () => {
    const renderContainer = (data: Partial<ContainerNodeType['data']> = {}, selected = false) =>
      render(<ContainerNode id="cnt-1" data={{ title: 'Module', ...data }} selected={selected} type={'container'} dragging={false} zIndex={0} selectable={false} deletable={false} draggable={false} isConnectable={false} positionAbsoluteX={0} positionAbsoluteY={0} />);

    it('applies preset CSS class', () => {
      const { container } = renderContainer({ preset: 'critical' });
      expect(container.querySelector('.diagram-container')).toHaveClass('diagram-container--critical');
    });

    it('applies custom border color', () => {
      const { container } = renderContainer({ customBorderColor: '#ff0000' });
      const el = container.querySelector('.diagram-container') as HTMLElement;
      expect(el).toHaveStyle({ borderColor: '#ff0000' });
    });

    it('applies preset border color when no explicit override', () => {
      const { container } = renderContainer({ preset: 'new' });
      const el = container.querySelector('.diagram-container') as HTMLElement;
      expect(el).toHaveStyle({ borderColor: presetStyles.new.borderColor });
    });

    it('explicit custom borderColor overrides preset on container', () => {
      const { container } = renderContainer({ preset: 'deprecated', customBorderColor: '#00ff00' });
      const el = container.querySelector('.diagram-container') as HTMLElement;
      expect(el).toHaveStyle({ borderColor: '#00ff00' });
    });
  });
});
