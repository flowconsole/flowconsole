import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContainerNodeType, ElementNodeType } from '../../src/web/diagram/types';
import { ContainerNode } from '../../src/web/reactflow/nodes/ContainerNode';
import { ElementNode } from '../../src/web/reactflow/nodes/ElementNode';
import { CircleNode } from '../../src/web/reactflow/nodes/CircleNode';
import { HexagonNode } from '../../src/web/reactflow/nodes/HexagonNode';
import { CloudNode } from '../../src/web/reactflow/nodes/CloudNode';
import { BaseElementNode } from '../../src/web/reactflow/nodes/BaseElementNode';
import { fireEvent } from '@testing-library/react';

vi.mock('../../src/web/reactflow/nodes/HiddenHandles', () => ({
  HiddenHandles: () => <div data-testid="handles" />,
}));

describe('Diagram nodes', () => {
  describe('ContainerNode', () => {
    const renderContainer = (data: Partial<ContainerNodeType['data']> = {}, selected = false) =>
      render(<ContainerNode id="container-1" data={{ title: 'Module', ...data }} selected={selected} type={'container'} dragging={false} zIndex={0} selectable={false} deletable={false} draggable={false} isConnectable={false} positionAbsoluteX={0} positionAbsoluteY={0} />);

    it('dispatches container:open when clicking the container open button (expanded layout)', () => {
      const listener = vi.fn();
      window.addEventListener('container:open', listener as EventListener);
      renderContainer({ description: 'desc', childCount: 2, expanded: false });
      fireEvent.click(screen.getByRole('button', { name: /open container/i }));
      expect(listener).toHaveBeenCalled();
      expect(screen.getByTestId('handles')).toBeInTheDocument();
      window.removeEventListener('container:open', listener as EventListener);
    });

    it('renders collapsed layout with open button and centered content', () => {
      renderContainer({ description: 'Short desc', expanded: false });
      expect(screen.getByText('Module')).toBeInTheDocument();
      expect(screen.getByText('Short desc')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open container/i })).toBeInTheDocument();
      expect(screen.getByTestId('handles')).toBeInTheDocument();
    });

    it('shows child count footer when collapsed and childCount > 0', () => {
      const { container } = renderContainer({ expanded: false, childCount: 3 });
      const footer = container.querySelector('span[style*="font-size: 10px"]');
      expect(footer).not.toBeNull();
    });

    it('hides open button when showOpenButton is false in expanded layout', () => {
      const listener = vi.fn();
      window.addEventListener('container:open', listener as EventListener);
      renderContainer({ expanded: true, showOpenButton: false });
      expect(screen.queryByRole('button', { name: /open container/i })).toBeNull();
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
    const renderElement = (data: Partial<ElementNodeType['data']> = {}, selected = false) =>
      render(<ElementNode id="element-1" data={{ title: 'Service', ...data }} selected={selected} />);

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

    it('falls back to muted status color when status is missing', () => {
      const { container } = renderElement();
      const statusDot = container.querySelector('.diagram-status') as HTMLElement;
      expect(statusDot).toHaveStyle({ background: 'var(--diagram-muted)' });
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
  });

  describe('BaseElementNode', () => {
    it('renders with minimal data', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Test' }} shapeClassName="service" />
      );
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--service');
    });

    it('renders shapeBackground SVG layer when provided', () => {
      const bg = <svg data-testid="shape-svg"><circle cx="50" cy="50" r="48" /></svg>;
      const { container } = render(
        <BaseElementNode data={{ title: 'Circle Test' }} shapeClassName="circle" shapeBackground={bg} />
      );
      expect(container.querySelector('.diagram-card__shape-bg')).toBeInTheDocument();
      expect(screen.getByTestId('shape-svg')).toBeInTheDocument();
      // Should NOT render the shell div when shapeBackground is provided
      expect(container.querySelector('.diagram-card__shell')).toBeNull();
    });

    it('renders shell div when no shapeBackground is provided', () => {
      const { container } = render(
        <BaseElementNode data={{ title: 'Rect Test' }} shapeClassName="service" />
      );
      expect(container.querySelector('.diagram-card__shell')).toBeInTheDocument();
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
      expect(container.querySelector('.diagram-card')).toHaveClass('diagram-card--generic');
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
});
