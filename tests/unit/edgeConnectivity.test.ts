/**
 * Integration test: verifies that after Graphviz layout, every edge's
 * spline endpoints fall within (or very near) the source/target node
 * bounding boxes. Uses real graphviz-wasm — no mocks.
 *
 * Model: Streamly media-streaming platform (the same sample shown in the playground).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Position } from '@xyflow/react';
import graphviz from 'graphviz-wasm';
import {
  buildDot,
  parseJsonLayout,
  applyLayout,
  sanitizeId,
  anchorFromPoint,
} from '../../src/web/diagram/graphvizLayoutService';
import { normalizeGraphvizPoints } from '../../src/web/diagram/edgePathUtils';
import type { ArchitectureDiagramModel } from '../../src/web/diagram/types';
import { defaultAutoLayoutConfig } from '../../src/web/diagram/types';

// ── helpers ──────────────────────────────────────────────────────────

function resolveAnchor(
  anchor: { position: Position; offset: number },
  node: { x: number; y: number; width: number; height: number }
) {
  const { x, y, width, height } = node;
  switch (anchor.position) {
    case Position.Left:   return { x, y: y + anchor.offset * height };
    case Position.Right:  return { x: x + width, y: y + anchor.offset * height };
    case Position.Top:    return { x: x + anchor.offset * width, y };
    case Position.Bottom: return { x: x + anchor.offset * width, y: y + height };
  }
}

/** True when point is within `tol` px of any side of the rectangle. */
function isNearBoundary(
  pt: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
  tol: number
) {
  const dL = Math.abs(pt.x - rect.x);
  const dR = Math.abs(pt.x - (rect.x + rect.width));
  const dT = Math.abs(pt.y - rect.y);
  const dB = Math.abs(pt.y - (rect.y + rect.height));
  const inX = pt.x >= rect.x - tol && pt.x <= rect.x + rect.width + tol;
  const inY = pt.y >= rect.y - tol && pt.y <= rect.y + rect.height + tol;
  return (dL <= tol && inY) || (dR <= tol && inY) || (dT <= tol && inX) || (dB <= tol && inX);
}

/** True when point is inside the rectangle (with tolerance). */
function isInsideOrNear(
  pt: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
  tol: number
) {
  return (
    pt.x >= rect.x - tol &&
    pt.x <= rect.x + rect.width + tol &&
    pt.y >= rect.y - tol &&
    pt.y <= rect.y + rect.height + tol
  );
}

// ── Streamly model ──────────────────────────────────────────────────

function buildStreamlyModel(): ArchitectureDiagramModel {
  return {
    nodes: [
      // Top-level person nodes
      { id: 'viewer', type: 'element' as const, data: { title: 'Subscriber', shape: 'person' as const, description: 'Streams movies' }, position: { x: 0, y: 0 } },
      { id: 'operator', type: 'element' as const, data: { title: 'Ops Engineer', shape: 'person' as const, description: 'Monitors health' }, position: { x: 0, y: 0 } },

      // System
      { id: 'streamly', type: 'container' as const, data: { title: 'Streamly' }, position: { x: 0, y: 0 } },

      // Control Plane
      { id: 'control-plane', type: 'container' as const, data: { title: 'Control Plane' }, position: { x: 0, y: 0 }, parentId: 'streamly' },
      { id: 'identity', type: 'element' as const, data: { title: 'Identity', description: 'Login, entitlements', shape: 'service' as const }, position: { x: 0, y: 0 }, parentId: 'control-plane' },
      { id: 'catalog', type: 'element' as const, data: { title: 'Catalog', description: 'Metadata, search, personalization', shape: 'service' as const }, position: { x: 0, y: 0 }, parentId: 'control-plane' },
      { id: 'playback', type: 'element' as const, data: { title: 'Playback Service', description: 'Session tokens, DRM', shape: 'service' as const }, position: { x: 0, y: 0 }, parentId: 'control-plane' },
      { id: 'recommendations', type: 'element' as const, data: { title: 'Recommendations', description: 'ML ranking service', shape: 'service' as const }, position: { x: 0, y: 0 }, parentId: 'control-plane' },
      { id: 'profiles-db', type: 'element' as const, data: { title: 'Profiles DB', description: 'Viewer profiles, settings', shape: 'database' as const }, position: { x: 0, y: 0 }, parentId: 'control-plane' },

      // Device Apps
      { id: 'device-apps', type: 'container' as const, data: { title: 'Device Apps' }, position: { x: 0, y: 0 }, parentId: 'streamly' },
      { id: 'tv-app', type: 'element' as const, data: { title: 'TV App', description: 'Smart TV + set-top box UI', shape: 'service' as const }, position: { x: 0, y: 0 }, parentId: 'device-apps' },
      { id: 'mobile-app', type: 'element' as const, data: { title: 'Mobile App', description: 'iOS/Android client', shape: 'service' as const }, position: { x: 0, y: 0 }, parentId: 'device-apps' },

      // Data Plane
      { id: 'data-plane', type: 'container' as const, data: { title: 'Data Plane' }, position: { x: 0, y: 0 }, parentId: 'streamly' },
      { id: 'ingest', type: 'element' as const, data: { title: 'Content Ingest', description: 'Transcodes uploads', shape: 'service' as const }, position: { x: 0, y: 0 }, parentId: 'data-plane' },
      { id: 'cdn', type: 'element' as const, data: { title: 'Global CDN', description: 'Edge delivery network', shape: 'service' as const }, position: { x: 0, y: 0 }, parentId: 'data-plane' },

      // Observability
      { id: 'observability', type: 'container' as const, data: { title: 'Observability' }, position: { x: 0, y: 0 }, parentId: 'streamly' },
      { id: 'watch-events', type: 'element' as const, data: { title: 'Watch Events', description: 'View, pause, seek telemetry', shape: 'queue' as const }, position: { x: 0, y: 0 }, parentId: 'observability' },
      { id: 'metrics-api', type: 'element' as const, data: { title: 'Metrics API', description: 'Real-time health', shape: 'service' as const }, position: { x: 0, y: 0 }, parentId: 'observability' },
    ],
    edges: [
      { id: 'e-open-app', source: 'viewer', target: 'tv-app', type: 'relationship' as const, data: { label: 'open app' } },
      { id: 'e-login', source: 'tv-app', target: 'identity', type: 'relationship' as const, data: { label: 'login' } },
      { id: 'e-browse', source: 'tv-app', target: 'catalog', type: 'relationship' as const, data: { label: 'browse catalog' } },
      { id: 'e-picks', source: 'catalog', target: 'recommendations', type: 'relationship' as const, data: { label: 'personal picks' } },
      { id: 'e-playback', source: 'recommendations', target: 'playback', type: 'relationship' as const, data: { label: 'start playback' } },
      { id: 'e-profiles', source: 'playback', target: 'profiles-db', type: 'relationship' as const, data: { label: 'profile rights' } },
      { id: 'e-token', source: 'playback', target: 'cdn', type: 'relationship' as const, data: { label: 'issue token', kind: 'sync' as const } },
      { id: 'e-emit', source: 'playback', target: 'watch-events', type: 'relationship' as const, data: { label: 'emit play', kind: 'event' as const } },
      { id: 'e-resume', source: 'mobile-app', target: 'playback', type: 'relationship' as const, data: { label: 'resume session' } },
      { id: 'e-push', source: 'ingest', target: 'cdn', type: 'relationship' as const, data: { label: 'push renditions', kind: 'async' as const } },
      { id: 'e-ingest-ev', source: 'ingest', target: 'watch-events', type: 'relationship' as const, data: { label: 'publish ingest status', kind: 'event' as const } },
      { id: 'e-slos', source: 'operator', target: 'metrics-api', type: 'relationship' as const, data: { label: 'check SLOs' } },
      { id: 'e-trace', source: 'metrics-api', target: 'watch-events', type: 'relationship' as const, data: { label: 'trace anomalies', kind: 'dependency' as const } },
    ],
  } as ArchitectureDiagramModel;
}

// ── tests ───────────────────────────────────────────────────────────

describe('Streamly edge connectivity (real Graphviz)', () => {
  let layoutResult: ArchitectureDiagramModel;
  let nodeLayoutMap: Map<string, { x: number; y: number; width: number; height: number }>;

  beforeAll(async () => {
    await graphviz.loadWASM();

    const model = buildStreamlyModel();
    const config = defaultAutoLayoutConfig;
    const dot = buildDot(model, config);
    const json = graphviz.layout(dot, 'json', 'dot');

    const clusterIdMap = new Map<string, string>();
    for (const node of model.nodes) {
      clusterIdMap.set(sanitizeId(node.id), node.id);
    }
    const parsed = parseJsonLayout(json, { clusterIdMap });
    layoutResult = applyLayout(model, parsed);

    // Build absolute layout map from parsed (pre-applyLayout) positions
    nodeLayoutMap = parsed.nodes;
  });

  it('every leaf node has a layout position', () => {
    const leafNodes = layoutResult.nodes.filter(
      n => !(n.type === 'container' && layoutResult.nodes.some(c => c.parentId === n.id))
    );
    for (const node of leafNodes) {
      const layout = nodeLayoutMap.get(node.id);
      expect(layout, `node ${node.id} should have layout entry`).toBeDefined();
      expect(layout!.width).toBeGreaterThan(0);
      expect(layout!.height).toBeGreaterThan(0);
    }
  });

  it('every container has a layout position', () => {
    const containers = layoutResult.nodes.filter(n => n.type === 'container');
    for (const c of containers) {
      const layout = nodeLayoutMap.get(c.id);
      expect(layout, `container ${c.id} should have layout entry`).toBeDefined();
    }
  });

  it('every edge has layoutPoints', () => {
    for (const edge of layoutResult.edges) {
      const pts = edge.data?.layoutPoints;
      expect(pts, `edge ${edge.id} should have layoutPoints`).toBeDefined();
      expect(pts!.length, `edge ${edge.id} should have >= 2 layout points`).toBeGreaterThanOrEqual(2);
    }
  });

  it('every edge has sourceAnchor and targetAnchor', () => {
    for (const edge of layoutResult.edges) {
      expect(edge.data?.sourceAnchor, `edge ${edge.id} missing sourceAnchor`).toBeDefined();
      expect(edge.data?.targetAnchor, `edge ${edge.id} missing targetAnchor`).toBeDefined();
    }
  });

  it('edge layoutPoints have valid cubic Bézier structure ((n-1) % 3 === 0)', () => {
    const failures: string[] = [];
    for (const edge of layoutResult.edges) {
      const pts = edge.data?.layoutPoints;
      if (!pts?.length) continue;
      if ((pts.length - 1) % 3 !== 0) {
        failures.push(`edge ${edge.id}: ${pts.length} points ((${pts.length}-1) % 3 = ${(pts.length - 1) % 3})`);
      }
    }
    expect(failures, `edges with non-cubic point counts:\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('edge spline first point is near source node boundary (tolerance 30px)', () => {
    const TOL = 30;
    const failures: string[] = [];
    for (const edge of layoutResult.edges) {
      const pts = edge.data?.layoutPoints;
      if (!pts?.length) continue;
      const srcLayout = nodeLayoutMap.get(edge.source);
      if (!srcLayout) continue;
      const first = pts[0];
      if (!isNearBoundary(first, srcLayout, TOL) && !isInsideOrNear(first, srcLayout, TOL)) {
        failures.push(
          `${edge.id}: first pt (${first.x.toFixed(0)},${first.y.toFixed(0)}) vs source ${edge.source} ` +
          `(${srcLayout.x.toFixed(0)},${srcLayout.y.toFixed(0)} ${srcLayout.width.toFixed(0)}×${srcLayout.height.toFixed(0)})`
        );
      }
    }
    expect(failures, `edges whose first point is far from source:\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('edge spline last point is near target node boundary (tolerance 30px)', () => {
    const TOL = 30;
    const failures: string[] = [];
    for (const edge of layoutResult.edges) {
      const pts = edge.data?.layoutPoints;
      if (!pts?.length) continue;
      const tgtLayout = nodeLayoutMap.get(edge.target);
      if (!tgtLayout) continue;
      const last = pts[pts.length - 1];
      if (!isNearBoundary(last, tgtLayout, TOL) && !isInsideOrNear(last, tgtLayout, TOL)) {
        failures.push(
          `${edge.id}: last pt (${last.x.toFixed(0)},${last.y.toFixed(0)}) vs target ${edge.target} ` +
          `(${tgtLayout.x.toFixed(0)},${tgtLayout.y.toFixed(0)} ${tgtLayout.width.toFixed(0)}×${tgtLayout.height.toFixed(0)})`
        );
      }
    }
    expect(failures, `edges whose last point is far from target:\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('resolved anchor points fall on node boundaries (tolerance 5px)', () => {
    const TOL = 5;
    const failures: string[] = [];
    for (const edge of layoutResult.edges) {
      const srcAnchor = edge.data?.sourceAnchor;
      const tgtAnchor = edge.data?.targetAnchor;
      const srcLayout = nodeLayoutMap.get(edge.source);
      const tgtLayout = nodeLayoutMap.get(edge.target);

      if (srcAnchor && srcLayout) {
        const pt = resolveAnchor(srcAnchor, srcLayout);
        if (!isNearBoundary(pt, srcLayout, TOL)) {
          failures.push(`${edge.id} sourceAnchor: (${pt.x.toFixed(0)},${pt.y.toFixed(0)}) not on ${edge.source} boundary`);
        }
      }
      if (tgtAnchor && tgtLayout) {
        const pt = resolveAnchor(tgtAnchor, tgtLayout);
        if (!isNearBoundary(pt, tgtLayout, TOL)) {
          failures.push(`${edge.id} targetAnchor: (${pt.x.toFixed(0)},${pt.y.toFixed(0)}) not on ${edge.target} boundary`);
        }
      }
    }
    expect(failures, `anchors not on boundary:\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('normalizeGraphvizPoints succeeds for all edges (no fallback to simple bezier)', () => {
    const failures: string[] = [];
    for (const edge of layoutResult.edges) {
      const pts = edge.data?.layoutPoints;
      const srcAnchor = edge.data?.sourceAnchor;
      const tgtAnchor = edge.data?.targetAnchor;
      const srcLayout = nodeLayoutMap.get(edge.source);
      const tgtLayout = nodeLayoutMap.get(edge.target);
      if (!pts?.length || !srcAnchor || !tgtAnchor || !srcLayout || !tgtLayout) continue;

      const source = resolveAnchor(srcAnchor, srcLayout);
      const target = resolveAnchor(tgtAnchor, tgtLayout);
      const normalized = normalizeGraphvizPoints(pts, source, target);
      if (!normalized) {
        failures.push(
          `${edge.id}: normalizeGraphvizPoints returned undefined ` +
          `(${pts.length} points, (${pts.length}-1)%3=${(pts.length - 1) % 3})`
        );
      }
    }
    expect(failures, `edges where normalization fails:\n${failures.join('\n')}`).toHaveLength(0);
  });

  it('normalized spline start/end match anchor positions exactly', () => {
    const TOL = 0.01;
    const failures: string[] = [];
    for (const edge of layoutResult.edges) {
      const pts = edge.data?.layoutPoints;
      const srcAnchor = edge.data?.sourceAnchor;
      const tgtAnchor = edge.data?.targetAnchor;
      const srcLayout = nodeLayoutMap.get(edge.source);
      const tgtLayout = nodeLayoutMap.get(edge.target);
      if (!pts?.length || !srcAnchor || !tgtAnchor || !srcLayout || !tgtLayout) continue;

      const source = resolveAnchor(srcAnchor, srcLayout);
      const target = resolveAnchor(tgtAnchor, tgtLayout);
      const normalized = normalizeGraphvizPoints(pts, source, target);
      if (!normalized) continue;

      const first = normalized[0];
      const last = normalized[normalized.length - 1];
      if (Math.abs(first.x - source.x) > TOL || Math.abs(first.y - source.y) > TOL) {
        failures.push(`${edge.id} start: (${first.x.toFixed(2)},${first.y.toFixed(2)}) != source (${source.x.toFixed(2)},${source.y.toFixed(2)})`);
      }
      if (Math.abs(last.x - target.x) > TOL || Math.abs(last.y - target.y) > TOL) {
        failures.push(`${edge.id} end: (${last.x.toFixed(2)},${last.y.toFixed(2)}) != target (${target.x.toFixed(2)},${target.y.toFixed(2)})`);
      }
    }
    expect(failures, `normalized endpoints don't match anchors:\n${failures.join('\n')}`).toHaveLength(0);
  });
});
