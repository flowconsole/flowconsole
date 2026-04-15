import { describe, it, expect } from 'vitest';
import { getShapeDefinition, getShapeDefinitionOrDefault, DEFAULT_SHAPE } from '../../src/web/diagram/layout/shapes/shapeRegistry';
// Ensure builtins are registered
import '../../src/web/diagram/layout/shapes/builtins';

describe('shapeRegistry', () => {
  describe('getShapeDefinition', () => {
    it('returns definition for registered element shape', () => {
      const def = getShapeDefinition('element');
      expect(def).toBeDefined();
      expect(def!.geometryKind).toBe('rectangle');
      expect(def!.portModel).toBe('bbox');
    });

    it('returns definition for circle shape', () => {
      const def = getShapeDefinition('circle');
      expect(def).toBeDefined();
      expect(def!.geometryKind).toBe('circle');
      expect(def!.squareAspect).toBe(true);
      expect(def!.portModel).toBe('perimeter');
      expect(def!.minWidth).toBeGreaterThanOrEqual(140);
      expect(def!.minHeight).toBeGreaterThanOrEqual(140);
    });

    it('returns definition for hexagon shape', () => {
      const def = getShapeDefinition('hexagon');
      expect(def).toBeDefined();
      expect(def!.geometryKind).toBe('hexagon');
      expect(def!.squareAspect).toBe(false);
      expect(def!.portModel).toBe('perimeter');
    });

    it('returns definition for cloud shape', () => {
      const def = getShapeDefinition('cloud');
      expect(def).toBeDefined();
      expect(def!.geometryKind).toBe('cloud');
      expect(def!.portModel).toBe('perimeter');
    });

    it('returns undefined for unregistered shape', () => {
      const def = getShapeDefinition('nonexistent' as any);
      expect(def).toBeUndefined();
    });
  });

  describe('getShapeDefinitionOrDefault', () => {
    it('returns registered shape when it exists', () => {
      const def = getShapeDefinitionOrDefault('circle');
      expect(def.geometryKind).toBe('circle');
    });

    it('returns DEFAULT_SHAPE for unknown type', () => {
      const def = getShapeDefinitionOrDefault('unknown');
      expect(def).toEqual(DEFAULT_SHAPE);
    });
  });

  describe('built-in shapes', () => {
    const expectedShapes = ['element', 'person', 'database', 'queue', 'storage', 'boundary', 'circle', 'hexagon', 'cloud'];

    it.each(expectedShapes)('has registered shape: %s', (shapeName) => {
      const def = getShapeDefinition(shapeName as any);
      expect(def).toBeDefined();
      expect(def!.minWidth).toBeGreaterThan(0);
      expect(def!.minHeight).toBeGreaterThan(0);
    });

    it('rectangle-based shapes use bbox port model', () => {
      for (const name of ['element', 'person', 'database', 'queue', 'storage', 'boundary']) {
        const def = getShapeDefinition(name as any);
        expect(def!.portModel).toBe('bbox');
        expect(def!.squareAspect).toBe(false);
      }
    });

    it('SVG-based shapes use perimeter port model', () => {
      for (const name of ['circle', 'hexagon', 'cloud']) {
        const def = getShapeDefinition(name as any);
        expect(def!.portModel).toBe('perimeter');
      }
    });
  });
});
