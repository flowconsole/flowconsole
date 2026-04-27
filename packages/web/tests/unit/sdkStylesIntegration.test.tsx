import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { evaluateDiagramCode } from '../../languages/typescript/evaluateDiagramCode';
import { CircleNode } from '../../reactflow/nodes/CircleNode';
import { HexagonNode } from '../../reactflow/nodes/HexagonNode';
import { CloudNode } from '../../reactflow/nodes/CloudNode';
import { ElementNode } from '../../reactflow/nodes/ElementNode';
import { presetStyles } from '../../diagram/theme';
import type { ElementNodeType } from '../../diagram/types';

vi.mock('../../reactflow/nodes/HiddenHandles', () => ({
  HiddenHandles: () => <div data-testid="handles" />,
}));

describe('SDK styles integration: shape → nodeType pipeline', () => {
  it('circle shape produces type=circle node', async () => {
    const result = await evaluateDiagramCode(
      `const gw: Gateway = { name: "API GW", style: { shape: "circle" } };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'API GW');
    expect(node).toBeDefined();
    expect(node!.type).toBe('circle');
  }, 15000);

  it('hexagon shape produces type=hexagon node', async () => {
    const result = await evaluateDiagramCode(
      `const gw: Gateway = { name: "Edge GW" };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Edge GW');
    expect(node).toBeDefined();
    // Gateway defaults to hexagon shape
    expect(node!.type).toBe('hexagon');
  }, 15000);

  it('cloud shape produces type=cloud node', async () => {
    const result = await evaluateDiagramCode(
      `const ext: External = { name: "Stripe" };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Stripe');
    expect(node).toBeDefined();
    // External defaults to cloud shape
    expect(node!.type).toBe('cloud');
  }, 15000);

  it('rectangle (default) produces type=element node', async () => {
    const result = await evaluateDiagramCode(
      `const svc: Container = { name: "Orders" };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Container is a container type, check a non-container element
    const result2 = await evaluateDiagramCode(
      `const api: RestApi = { name: "API" };`
    );
    expect(result2.ok).toBe(true);
    if (!result2.ok) return;
    const node = result2.model.nodes.find((n) => n.data.title === 'API');
    expect(node).toBeDefined();
    expect(node!.type).toBe('element');
  }, 15000);

  it('cylinder shape produces type=database node', async () => {
    const result = await evaluateDiagramCode(
      `const db: Database = { name: "Ledger" };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Ledger');
    expect(node).toBeDefined();
    expect(node!.type).toBe('database');
  }, 15000);

  it('pipe shape produces type=queue node', async () => {
    const result = await evaluateDiagramCode(
      `const q: Queue = { name: "Tasks" };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Tasks');
    expect(node).toBeDefined();
    expect(node!.type).toBe('queue');
  }, 15000);

  it('person shape produces type=person node', async () => {
    const result = await evaluateDiagramCode(
      `const u: User = { name: "Alice" };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'Alice');
    expect(node).toBeDefined();
    expect(node!.type).toBe('person');
  }, 15000);

  it('explicit shape override changes nodeType', async () => {
    const result = await evaluateDiagramCode(
      `const db: Database = { name: "DB", style: { shape: "circle" } };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'DB');
    expect(node).toBeDefined();
    expect(node!.type).toBe('circle');
  }, 15000);
});

describe('SDK styles integration: preset/colors → node data pipeline', () => {
  it('preset is passed through to node data', async () => {
    const result = await evaluateDiagramCode(
      `const svc: RestApi = { name: "API", style: { preset: "critical" } };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'API');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('preset', 'critical');
  }, 15000);

  it('custom colors are passed through to node data', async () => {
    const result = await evaluateDiagramCode(
      `const svc: RestApi = { name: "API", style: { backgroundColor: "#e74c3c", borderColor: "#c0392b", color: "#ffffff" } };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'API');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('customBackgroundColor', '#e74c3c');
    expect(node!.data).toHaveProperty('customBorderColor', '#c0392b');
    expect(node!.data).toHaveProperty('customColor', '#ffffff');
  }, 15000);

  it('default preset is not included in node data', async () => {
    const result = await evaluateDiagramCode(
      `const svc: RestApi = { name: "API", style: { preset: "default" } };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'API');
    expect(node).toBeDefined();
    expect(node!.data).not.toHaveProperty('preset');
  }, 15000);

  it('explicit colors override preset defaults in rendered node', async () => {
    const result = await evaluateDiagramCode(
      `const svc: RestApi = { name: "API", style: { preset: "deprecated", borderColor: "#00ff00" } };`
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const node = result.model.nodes.find((n) => n.data.title === 'API');
    expect(node).toBeDefined();
    expect(node!.data).toHaveProperty('preset', 'deprecated');
    expect(node!.data).toHaveProperty('customBorderColor', '#00ff00');
  }, 15000);
});

describe('Visual tests: SVG shapes fill/stroke and rectangular absence', () => {
  const renderCircle = (data: Partial<ElementNodeType['data']> = {}) =>
    render(<CircleNode id="c1" data={{ title: 'C', ...data }} selected={false} />);
  const renderHexagon = (data: Partial<ElementNodeType['data']> = {}) =>
    render(<HexagonNode id="h1" data={{ title: 'H', ...data }} selected={false} />);
  const renderCloud = (data: Partial<ElementNodeType['data']> = {}) =>
    render(<CloudNode id="cl1" data={{ title: 'Cl', ...data }} selected={false} />);
  const renderElement = (data: Partial<ElementNodeType['data']> = {}) =>
    render(<ElementNode id="e1" data={{ title: 'E', ...data }} selected={false} />);

  describe('CircleNode SVG', () => {
    it('has <circle> SVG element in DOM', () => {
      const { container } = renderCircle();
      expect(container.querySelector('circle')).not.toBeNull();
    });

    it('fill matches customBackgroundColor', () => {
      const { container } = renderCircle({ customBackgroundColor: '#e74c3c' });
      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#e74c3c');
    });

    it('stroke matches customBorderColor', () => {
      const { container } = renderCircle({ customBorderColor: '#c0392b' });
      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('stroke')).toBe('#c0392b');
    });

    it('preset backgroundColor applied as fill', () => {
      const { container } = renderCircle({ preset: 'critical' });
      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe(presetStyles.critical.backgroundColor);
    });

    it('preset borderColor applied as stroke', () => {
      const { container } = renderCircle({ preset: 'critical' });
      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('stroke')).toBe(presetStyles.critical.borderColor);
    });
  });

  describe('HexagonNode SVG', () => {
    it('has <polygon> SVG element in DOM', () => {
      const { container } = renderHexagon();
      expect(container.querySelector('polygon')).not.toBeNull();
    });

    it('fill matches customBackgroundColor', () => {
      const { container } = renderHexagon({ customBackgroundColor: '#3498db' });
      const polygon = container.querySelector('polygon');
      expect(polygon?.getAttribute('fill')).toBe('#3498db');
    });

    it('stroke matches customBorderColor', () => {
      const { container } = renderHexagon({ customBorderColor: '#2980b9' });
      const polygon = container.querySelector('polygon');
      expect(polygon?.getAttribute('stroke')).toBe('#2980b9');
    });
  });

  describe('CloudNode SVG', () => {
    it('has <path> SVG element with smooth Bezier curves', () => {
      const { container } = renderCloud();
      const path = container.querySelector('path');
      expect(path).not.toBeNull();
      const d = path?.getAttribute('d') ?? '';
      expect(d.length).toBeGreaterThan(20);
      expect(d).toContain('C');
    });

    it('fill matches customBackgroundColor', () => {
      const { container } = renderCloud({ customBackgroundColor: '#9b59b6' });
      const path = container.querySelector('path');
      expect(path?.getAttribute('fill')).toBe('#9b59b6');
    });

    it('stroke matches customBorderColor', () => {
      const { container } = renderCloud({ customBorderColor: '#8e44ad' });
      const path = container.querySelector('path');
      expect(path?.getAttribute('stroke')).toBe('#8e44ad');
    });
  });

  describe('Rectangular shapes do NOT contain SVG shape elements', () => {
    it('ElementNode (service/rectangle) has no <circle>, <polygon>, or cloud <path>', () => {
      const { container } = renderElement();
      expect(container.querySelector('circle')).toBeNull();
      expect(container.querySelector('polygon')).toBeNull();
      // path can exist in icon SVGs, but the shape-bg layer should not exist
      expect(container.querySelector('.diagram-card__shape-bg')).toBeNull();
      expect(container.querySelector('.diagram-shape-svg')).toBeNull();
    });

    it('ElementNode renders no SVG background layer (CSS only)', () => {
      const { container } = renderElement();
      expect(container.querySelector('.diagram-card__shape-bg')).toBeNull();
    });
  });

  describe('Explicit colors override preset on SVG shapes', () => {
    it('CircleNode: explicit borderColor overrides preset stroke', () => {
      const { container } = renderCircle({ preset: 'deprecated', customBorderColor: '#00ff00' });
      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('stroke')).toBe('#00ff00');
    });

    it('HexagonNode: explicit backgroundColor overrides preset fill', () => {
      const { container } = renderHexagon({ preset: 'highlighted', customBackgroundColor: '#ff0000' });
      const polygon = container.querySelector('polygon');
      expect(polygon?.getAttribute('fill')).toBe('#ff0000');
    });

    it('CloudNode: explicit colors fully override preset', () => {
      const { container } = renderCloud({
        preset: 'critical',
        customBackgroundColor: '#00ff00',
        customBorderColor: '#0000ff',
      });
      const path = container.querySelector('path');
      expect(path?.getAttribute('fill')).toBe('#00ff00');
      expect(path?.getAttribute('stroke')).toBe('#0000ff');
    });
  });
});
