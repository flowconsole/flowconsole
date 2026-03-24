import { describe, expect, it } from 'vitest';
import { createMentalMapCache } from '../../../src/web/diagram/layout/mentalMapCache';
import type { CacheEntry } from '../../../src/web/diagram/layout/mentalMapCache';

function makeEntry(label: string): CacheEntry {
  return {
    model: {
      nodes: [{ id: label, type: 'element', position: { x: 0, y: 0 }, data: { title: label } }],
      edges: [],
    },
    diagnostics: {
      cacheKey: label,
      cacheHit: false,
      reason: 'graph_changed',
      strategy: 'layered',
      direction: 'LR',
      notation: 'architecture',
      preset: 'c4-like',
      engine: 'elk',
      fallbackEngineUsed: false,
      qualityScore: {
        edgeCrossings: 0,
        nodeOverlaps: 0,
        containerViolations: 0,
        labelOverlaps: 0,
        edgeLengthVariance: 0,
        edgeBendCount: 0,
        siblingAlignmentScore: 1,
        laneViolations: 0,
        gatewayPlacementViolations: 0,
        disconnectedPackingScore: 1,
        flowDirectionConsistency: 1,
      },
      qualityValue: 1,
    },
  };
}

describe('mentalMapCache', () => {
  it('returns undefined for cache miss', () => {
    const cache = createMentalMapCache();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('stores and retrieves entries', () => {
    const cache = createMentalMapCache();
    const entry = makeEntry('a');
    cache.set('key-a', entry);
    expect(cache.get('key-a')).toEqual(entry);
  });

  it('evicts oldest entries when exceeding max size', () => {
    const cache = createMentalMapCache(3);
    cache.set('a', makeEntry('a'));
    cache.set('b', makeEntry('b'));
    cache.set('c', makeEntry('c'));
    cache.set('d', makeEntry('d')); // evicts 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeDefined();
    expect(cache.get('d')).toBeDefined();
    expect(cache.size()).toBe(3);
  });

  it('LRU: accessing an entry prevents eviction', () => {
    const cache = createMentalMapCache(3);
    cache.set('a', makeEntry('a'));
    cache.set('b', makeEntry('b'));
    cache.set('c', makeEntry('c'));
    cache.get('a'); // touch 'a' — moves to end
    cache.set('d', makeEntry('d')); // evicts 'b' (oldest untouched)

    expect(cache.get('a')).toBeDefined();
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('d')).toBeDefined();
  });

  it('invalidateAll clears all entries', () => {
    const cache = createMentalMapCache();
    cache.set('a', makeEntry('a'));
    cache.set('b', makeEntry('b'));
    cache.invalidateAll();

    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('drilldown → back: set parent, set child, get parent returns cached', () => {
    const cache = createMentalMapCache();
    const parentEntry = makeEntry('parent');
    const childEntry = makeEntry('child');

    cache.set('scope:root', parentEntry);
    cache.set('scope:child', childEntry);

    // Back to parent — cache hit
    const restored = cache.get('scope:root');
    expect(restored).toEqual(parentEntry);
  });
});
