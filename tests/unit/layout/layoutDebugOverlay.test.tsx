import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LayoutDebugOverlay } from '../../../src/web/diagram/layout/debug/layoutDebugOverlay';
import type { LayoutRunDiagnostics } from '../../../src/web/diagram/layout/layoutPipeline';

const baseDiagnostics: LayoutRunDiagnostics = {
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
    edgeBendCount: 0,
    flowDirectionConsistency: 1,
  },
};

describe('LayoutDebugOverlay', () => {
  it('renders diagnostics summary with fallback and quality details', () => {
    render(<LayoutDebugOverlay diagnostics={baseDiagnostics} />);

    expect(screen.getByTestId('layout-debug-overlay')).toBeInTheDocument();
    expect(screen.getByText('architecture')).toBeInTheDocument();
    expect(screen.getByText('layered')).toBeInTheDocument();
    expect(screen.getByText('scope_changed')).toBeInTheDocument();
    expect(screen.getByText('graphviz fallback')).toBeInTheDocument();
    expect(screen.getByText(/edgeCrossings: 1/)).toBeInTheDocument();
    expect(screen.getByText('Q 0.82')).toBeInTheDocument();
  });

  it('renders node roles when provided', () => {
    render(
      <LayoutDebugOverlay
        diagnostics={{
          ...baseDiagnostics,
          nodeRoles: new Map([
            ['a', 'entry'],
            ['b', 'processor'],
            ['c', 'processor'],
            ['d', 'store'],
          ]),
        }}
      />
    );

    expect(screen.getByTestId('debug-node-roles')).toBeInTheDocument();
    expect(screen.getByText('processor (2)')).toBeInTheDocument();
    expect(screen.getByText('entry (1)')).toBeInTheDocument();
    expect(screen.getByText('store (1)')).toBeInTheDocument();
  });

  it('renders container overrides when provided', () => {
    render(
      <LayoutDebugOverlay
        diagnostics={{
          ...baseDiagnostics,
          containerOverrides: new Map([
            ['pipeline', { strategy: 'layered' as const, direction: 'TB' as const }],
          ]),
        }}
      />
    );

    expect(screen.getByTestId('debug-container-overrides')).toBeInTheDocument();
    expect(screen.getByText('pipeline: layered TB')).toBeInTheDocument();
  });
});
