import { describe, it, expect } from 'vitest';
import { computePortPosition } from '../../src/web/diagram/layout/portSelector';

describe('portSelector', () => {
  const rect = { x: 0, y: 0, width: 200, height: 200 };

  describe('circle ports', () => {
    it('places port on circle perimeter to the right', () => {
      const port = computePortPosition(rect, { x: 300, y: 100 }, 'circle');
      // Should be at (200, 100) — right edge of circle
      expect(port.x).toBeCloseTo(200, 0);
      expect(port.y).toBeCloseTo(100, 0);
    });

    it('places port on circle perimeter at the top', () => {
      const port = computePortPosition(rect, { x: 100, y: -100 }, 'circle');
      // Should be at (100, 0) — top of circle
      expect(port.x).toBeCloseTo(100, 0);
      expect(port.y).toBeCloseTo(0, 0);
    });

    it('places port on circle perimeter at diagonal', () => {
      const port = computePortPosition(rect, { x: 300, y: 300 }, 'circle');
      const cx = 100, cy = 100, r = 100;
      const dist = Math.hypot(200, 200);
      const expectedX = cx + (200 / dist) * r;
      const expectedY = cy + (200 / dist) * r;
      expect(port.x).toBeCloseTo(expectedX, 0);
      expect(port.y).toBeCloseTo(expectedY, 0);
    });
  });

  describe('hexagon ports', () => {
    it('places port on hexagon edge to the right', () => {
      const port = computePortPosition(rect, { x: 300, y: 100 }, 'hexagon');
      // Right side of hexagon should be at x=200 (or close)
      expect(port.x).toBeCloseTo(200, 0);
      expect(port.y).toBeCloseTo(100, 0);
    });

    it('places port on hexagon edge at the top', () => {
      const port = computePortPosition(rect, { x: 100, y: -100 }, 'hexagon');
      // Top of hexagon
      expect(port.x).toBeCloseTo(100, 0);
      expect(port.y).toBeCloseTo(0, 0);
    });
  });

  describe('rectangle (bbox) ports', () => {
    it('places port on right edge of bounding box', () => {
      const port = computePortPosition(rect, { x: 300, y: 100 }, 'element');
      expect(port.x).toBeCloseTo(200, 0);
      expect(port.y).toBeCloseTo(100, 0);
    });

    it('places port on bottom edge of bounding box', () => {
      const port = computePortPosition(rect, { x: 100, y: 300 }, 'element');
      expect(port.x).toBeCloseTo(100, 0);
      expect(port.y).toBeCloseTo(200, 0);
    });

    it('places port on left edge of bounding box', () => {
      const port = computePortPosition(rect, { x: -100, y: 100 }, 'element');
      expect(port.x).toBeCloseTo(0, 0);
      expect(port.y).toBeCloseTo(100, 0);
    });
  });

  describe('cloud ports (ellipse approximation)', () => {
    it('places port approximately on the right side', () => {
      const port = computePortPosition(rect, { x: 300, y: 100 }, 'cloud');
      // Cloud uses ~90% of bbox as ellipse, so port should be near right edge
      expect(port.x).toBeGreaterThan(150);
      expect(port.x).toBeLessThanOrEqual(200);
      expect(port.y).toBeCloseTo(100, 0);
    });
  });

  describe('unknown shape', () => {
    it('falls back to bbox intersection for unknown shapes', () => {
      const port = computePortPosition(rect, { x: 300, y: 100 }, 'unknown');
      expect(port.x).toBeCloseTo(200, 0);
      expect(port.y).toBeCloseTo(100, 0);
    });
  });
});
