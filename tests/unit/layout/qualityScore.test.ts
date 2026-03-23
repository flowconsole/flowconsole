import { describe, expect, it } from 'vitest';
import {
  QUALITY_THRESHOLDS,
  computeQualityScore,
  isQualityAcceptable,
  qualityScoreValue,
} from '../../../src/web/diagram/layout/qualityScore';
import type { RoutedGraph } from '../../../src/web/diagram/layout/edgeRouter';
import type { PositionedNode } from '../../../src/web/diagram/layout/positioningEngine';

function makeNode(id: string, x: number, y: number, overrides: Partial<PositionedNode> = {}): PositionedNode {
  const overrideData = overrides.data ?? {};
  const overrideLayout = overrides.layout ?? {};
  return {
    id,
    type: 'element',
    position: { x, y },
    absolutePosition: { x, y },
    size: {
      width: 100,
      height: 60,
      shape: {
        shapeId: 'service',
        geometryKind: 'card',
        defaultDimensions: { width: 100, height: 60 },
        minDimensions: { width: 100, height: 60 },
        portModel: 'card',
        labelZones: ['header', 'body'],
        renderClassName: 'diagram-card--service',
      },
    },
    ...overrides,
    data: {
      title: id,
      shape: 'service',
      ...overrideData,
    },
    layout: {
      role: 'processor',
      lane: 'central',
      laneIndex: 2,
      semanticRank: 2,
      axis: 'x',
      direction: 'LR',
      inDegree: 1,
      outDegree: 1,
      order: 0,
      ...overrideLayout,
    },
  } as PositionedNode;
}

function makeGraph(overrides: Partial<RoutedGraph> = {}): RoutedGraph {
  return {
    nodes: [makeNode('a', 0, 0, { layout: { role: 'entry', lane: 'leading', laneIndex: 0, semanticRank: 0 } }), makeNode('b', 200, 0)],
    edges: [
      {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        type: 'relationship',
        data: {
          layoutPoints: [
            { x: 100, y: 30 },
            { x: 150, y: 30 },
            { x: 150, y: 30 },
            { x: 200, y: 30 },
          ],
          labelPos: { x: 140, y: 20 },
        },
        routing: { priority: 100, style: 'orthogonal' },
      },
    ],
    profile: {
      nodeCount: 2,
      edgeCount: 1,
      containerCount: 0,
      maxNestingDepth: 0,
      edgeDensity: 0.5,
      hasFlows: false,
      disconnectedComponents: [new Set(['a']), new Set(['b'])],
      nodeRoles: new Map(),
      clusters: new Map(),
      sourceSinks: { sources: [], sinks: [] },
      containerChildCounts: new Map(),
      inDegree: new Map(),
      outDegree: new Map(),
    },
    strategy: { type: 'layered', direction: 'LR', spacing: { node: 80, layer: 120, container: 140 } },
    notation: 'architecture',
    preset: 'c4-like',
    direction: 'LR',
    laneAxis: 'x',
    laneOrder: ['leading', 'central-early', 'central', 'central-late', 'supporting', 'trailing'],
    engine: 'elk',
    usedFallback: false,
    qualityScore: 0.8,
    ...overrides,
  };
}

describe('quality scoring', () => {
  it('computes all quality score dimensions', () => {
    const score = computeQualityScore(makeGraph());

    expect(score).toEqual({
      edgeCrossings: 0,
      nodeOverlaps: 0,
      containerViolations: 0,
      labelOverlaps: 0,
      edgeLengthVariance: 0,
      siblingAlignmentScore: 1,
      laneViolations: 0,
      gatewayPlacementViolations: 0,
      disconnectedPackingScore: 1,
    });
  });

  it('detects overlap and label problems', () => {
    const score = computeQualityScore(
      makeGraph({
        nodes: [makeNode('a', 0, 0), makeNode('b', 20, 10)],
        edges: [
          {
            id: 'edge-1',
            source: 'a',
            target: 'b',
            type: 'relationship',
            data: { labelPos: { x: 30, y: 20 }, layoutPoints: [{ x: 0, y: 0 }, { x: 30, y: 20 }] },
            routing: { priority: 100, style: 'polyline' },
          },
        ],
      })
    );

    expect(score.nodeOverlaps).toBeGreaterThan(0);
    expect(score.labelOverlaps).toBeGreaterThan(0);
  });

  it('applies thresholds and normalized value', () => {
    const score = computeQualityScore(makeGraph());

    expect(QUALITY_THRESHOLDS.nodeOverlaps).toBe(0);
    expect(isQualityAcceptable(score, 2)).toBe(true);
    expect(qualityScoreValue(score, 2)).toBeGreaterThan(0.9);
  });
});
