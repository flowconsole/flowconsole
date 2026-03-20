import { describe, it, expect } from 'vitest';
import { bezierPathFromGraphviz, normalizeGraphvizPoints } from '../../src/web/diagram/edgePathUtils';

describe('edgePathUtils', () => {
  describe('bezierPathFromGraphviz', () => {
    it('returns undefined for undefined input', () => {
      expect(bezierPathFromGraphviz(undefined)).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      expect(bezierPathFromGraphviz([])).toBeUndefined();
    });

    it('builds M command for single point', () => {
      const result = bezierPathFromGraphviz([{ x: 10, y: 20 }]);
      expect(result).toBe('M 10,20');
    });

    it('builds M + C commands for 4 points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 20, y: 5 },
        { x: 30, y: 0 },
      ];
      const result = bezierPathFromGraphviz(points);
      expect(result).toBe('M 0,0 C 10,5 20,5 30,0');
    });

    it('builds M + 2 C commands for 7 points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 5 }, { x: 20, y: 5 }, { x: 30, y: 0 },
        { x: 40, y: -5 }, { x: 50, y: -5 }, { x: 60, y: 0 },
      ];
      const result = bezierPathFromGraphviz(points);
      expect(result).toContain('M 0,0');
      expect(result).toContain('C 10,5 20,5 30,0');
      expect(result).toContain('C 40,-5 50,-5 60,0');
    });
  });

  describe('normalizeGraphvizPoints', () => {
    it('returns undefined for undefined input', () => {
      expect(normalizeGraphvizPoints(undefined, { x: 0, y: 0 }, { x: 100, y: 100 })).toBeUndefined();
    });

    it('returns undefined for fewer than 4 points', () => {
      const points = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }];
      expect(normalizeGraphvizPoints(points, { x: 0, y: 0 }, { x: 100, y: 100 })).toBeUndefined();
    });

    it('returns undefined for invalid bezier length (5 points: (5-1)%3 !== 0)', () => {
      const points = Array.from({ length: 5 }, (_, i) => ({ x: i * 25, y: 0 }));
      expect(normalizeGraphvizPoints(points, { x: 0, y: 0 }, { x: 100, y: 0 })).toBeUndefined();
    });

    it('accepts 4 points (single cubic segment)', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 20, y: 5 },
        { x: 30, y: 0 },
      ];
      const result = normalizeGraphvizPoints(points, { x: 0, y: 0 }, { x: 30, y: 0 });
      expect(result).toBeDefined();
      expect(result!.length).toBe(4);
    });

    it('returns exact input when source and target match endpoints', () => {
      const points = [
        { x: 100, y: 200 },
        { x: 130, y: 210 },
        { x: 160, y: 210 },
        { x: 190, y: 200 },
      ];
      const result = normalizeGraphvizPoints(points, { x: 100, y: 200 }, { x: 190, y: 200 });
      expect(result).toBeDefined();
      for (let i = 0; i < points.length; i++) {
        expect(result![i].x).toBeCloseTo(points[i].x, 5);
        expect(result![i].y).toBeCloseTo(points[i].y, 5);
      }
    });

    it('first point equals source after normalization', () => {
      const points = [
        { x: 100, y: 200 },
        { x: 130, y: 210 },
        { x: 160, y: 210 },
        { x: 190, y: 200 },
      ];
      const source = { x: 105, y: 205 };
      const target = { x: 190, y: 200 };
      const result = normalizeGraphvizPoints(points, source, target)!;
      expect(result[0].x).toBeCloseTo(source.x, 5);
      expect(result[0].y).toBeCloseTo(source.y, 5);
    });

    it('last point equals target after normalization', () => {
      const points = [
        { x: 100, y: 200 },
        { x: 130, y: 210 },
        { x: 160, y: 210 },
        { x: 190, y: 200 },
      ];
      const source = { x: 100, y: 200 };
      const target = { x: 195, y: 205 };
      const result = normalizeGraphvizPoints(points, source, target)!;
      expect(result[3].x).toBeCloseTo(target.x, 5);
      expect(result[3].y).toBeCloseTo(target.y, 5);
    });

    it('uses smooth interpolation — no discontinuous kink in control points', () => {
      // Long edge with 7 points (two cubic segments)
      // Source shift: +50px X, Target shift: -30px X
      const points = [
        { x: 100, y: 100 },
        { x: 200, y: 80 },
        { x: 300, y: 80 },
        { x: 400, y: 100 },
        { x: 500, y: 120 },
        { x: 600, y: 120 },
        { x: 700, y: 100 },
      ];
      const source = { x: 150, y: 100 }; // +50 from original start
      const target = { x: 670, y: 100 }; // -30 from original end

      const result = normalizeGraphvizPoints(points, source, target)!;
      expect(result.length).toBe(7);

      // Check first and last points
      expect(result[0].x).toBeCloseTo(150, 5);
      expect(result[6].x).toBeCloseTo(670, 5);

      // The shift should be smoothly interpolated
      // At index 3 (middle), the shift should be approximately average of source and target shifts
      // source shift = +50, target shift = -30
      // t = 3/6 = 0.5, shift = 50 * 0.5 + (-30) * 0.5 = 10
      const middleShift = result[3].x - points[3].x;
      expect(middleShift).toBeCloseTo(10, 0);

      // Verify no sudden jumps between consecutive points
      for (let i = 1; i < result.length; i++) {
        const prevShiftX = result[i - 1].x - points[i - 1].x;
        const currShiftX = result[i].x - points[i].x;
        const jumpX = Math.abs(currShiftX - prevShiftX);
        // Maximum jump should be gradual (shift range / segments)
        const maxExpectedJump = (Math.abs(50) + Math.abs(-30)) / (points.length - 1) + 1;
        expect(
          jumpX,
          `shift jump between points ${i - 1} and ${i} should be gradual (got ${jumpX.toFixed(1)})`
        ).toBeLessThanOrEqual(maxExpectedJump);
      }
    });

    it('handles large shift without distorting middle control points', () => {
      // Simulate a case where React Flow positions differ significantly from Graphviz
      // (e.g., person node at right edge connecting to deeply nested node)
      const points = [
        { x: 1000, y: 700 }, // Source: person node at far right
        { x: 900, y: 650 },
        { x: 700, y: 500 },
        { x: 500, y: 350 },  // Route around cluster boundary
        { x: 400, y: 300 },
        { x: 300, y: 280 },
        { x: 200, y: 260 },  // Target: deeply nested node
      ];

      // Source anchor resolved 40px off, target anchor resolved 25px off
      const source = { x: 1040, y: 710 };
      const target = { x: 175, y: 255 };

      const result = normalizeGraphvizPoints(points, source, target)!;

      // Verify the critical "route around cluster" point (index 3) is NOT
      // aggressively shifted toward source. It should get partial shift.
      const t3 = 3 / 6; // interpolation factor at index 3
      const expectedShiftX = (source.x - points[0].x) * (1 - t3) + (target.x - points[6].x) * t3;
      const actualShiftX = result[3].x - points[3].x;
      expect(actualShiftX).toBeCloseTo(expectedShiftX, 0);

      // The path should still generally flow from right to left
      expect(result[0].x).toBeGreaterThan(result[3].x);
      expect(result[3].x).toBeGreaterThan(result[6].x);
    });

    it('preserves relative shape of path when shifts are zero', () => {
      const points = [
        { x: 100, y: 100 },
        { x: 150, y: 80 },
        { x: 200, y: 80 },
        { x: 250, y: 100 },
      ];
      const result = normalizeGraphvizPoints(points, { x: 100, y: 100 }, { x: 250, y: 100 })!;
      // Should be identical to input when shifts are zero
      for (let i = 0; i < points.length; i++) {
        expect(result[i].x).toBeCloseTo(points[i].x, 10);
        expect(result[i].y).toBeCloseTo(points[i].y, 10);
      }
    });
  });
});
