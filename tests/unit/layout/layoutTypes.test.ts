import { describe, expect, it } from 'vitest';
import {
  LAYOUT_DIRECTIONS,
  LAYOUT_STRATEGY_TYPES,
  NODE_ROLES,
  RELAYOUT_REASONS,
} from '../../../src/web/diagram/layout';
import type { AutoLayoutConfig, LayoutDirection } from '../../../src/web/diagram/types';

describe('layout type contracts', () => {
  it('exports the supported node roles', () => {
    expect(NODE_ROLES).toEqual([
      'entry',
      'frontend',
      'gateway',
      'processor',
      'worker',
      'store',
      'queue',
      'external',
    ]);
  });

  it('exports the supported layout directions and strategies', () => {
    expect(LAYOUT_DIRECTIONS).toEqual(['LR', 'TB', 'RL', 'BT']);
    expect(LAYOUT_STRATEGY_TYPES).toEqual(['layered']);
  });

  it('exports the supported relayout reasons', () => {
    expect(RELAYOUT_REASONS).toContain('cache_miss');
    expect(RELAYOUT_REASONS).toContain('engine_fallback');
    expect(RELAYOUT_REASONS).toContain('manual_debug_force');
  });

  it('keeps AutoLayoutConfig aligned with the public direction contract', () => {
    const direction: LayoutDirection = 'TB';
    const config: AutoLayoutConfig = {
      direction,
      notation: 'architecture',
      preset: 'c4-like',
      engine: 'graphviz',
      debug: true,
    };

    expect(config).toMatchObject({
      direction: 'TB',
      notation: 'architecture',
      preset: 'c4-like',
      engine: 'graphviz',
      debug: true,
    });
  });
});
