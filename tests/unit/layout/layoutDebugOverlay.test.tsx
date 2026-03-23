import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LayoutDebugOverlay } from '../../../src/web/diagram/layout/debug/layoutDebugOverlay';

describe('LayoutDebugOverlay', () => {
  it('renders diagnostics summary with fallback and quality details', () => {
    render(
      <LayoutDebugOverlay
        diagnostics={{
          cacheKey: 'cache-key',
          cacheHit: false,
          reason: 'scope_changed',
          strategy: 'layered',
          direction: 'LR',
          notation: 'architecture',
          preset: 'c4-like',
          engine: 'graphviz',
          fallbackEngineUsed: true,
          qualityValue: 0.82,
          qualityScore: {
            edgeCrossings: 1,
            nodeOverlaps: 0,
            containerViolations: 0,
            labelOverlaps: 0,
            edgeLengthVariance: 2,
            siblingAlignmentScore: 0.95,
            laneViolations: 0,
            gatewayPlacementViolations: 0,
            disconnectedPackingScore: 1,
          },
        }}
      />
    );

    expect(screen.getByTestId('layout-debug-overlay')).toBeInTheDocument();
    expect(screen.getByText('architecture')).toBeInTheDocument();
    expect(screen.getByText('layered')).toBeInTheDocument();
    expect(screen.getByText('scope_changed')).toBeInTheDocument();
    expect(screen.getByText('graphviz fallback')).toBeInTheDocument();
    expect(screen.getByText(/edgeCrossings: 1/)).toBeInTheDocument();
    expect(screen.getByText('Q 0.82')).toBeInTheDocument();
  });
});
