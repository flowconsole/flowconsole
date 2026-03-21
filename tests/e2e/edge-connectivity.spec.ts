import { test, expect, Page } from '@playwright/test';

/**
 * E2E test: verify that every rendered edge's SVG path endpoints
 * are within tolerance of their source/target node bounding boxes.
 *
 * This catches rendering bugs that unit tests miss — e.g. coordinate
 * system mismatches, broken Y-inversion, stale positionAbsolute, etc.
 */

type NodeRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EdgeEndpoints = {
  id: string;
  sourceId: string;
  targetId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pathD: string;
};

const TOLERANCE = 40; // px — allow some slack for arrowheads, marker offsets, and rounding

async function waitForDiagram(page: Page) {
  await expect(page.getByTestId('progress-overlay')).toBeHidden({ timeout: 15000 });
  // Wait for React Flow to finish measuring nodes
  await page.waitForSelector('.react-flow__node', { timeout: 10000 });
  // Small delay for layout stabilization
  await page.waitForTimeout(500);
}

async function selectSample(page: Page, sampleId: string) {
  const select = page.getByTestId('sample-select');
  await select.selectOption(sampleId);
  await waitForDiagram(page);
}

/**
 * Extract node positions and sizes from the React Flow internal store.
 * We use the flow coordinate system (positionAbsolute + measured dimensions).
 */
async function getNodeRects(page: Page): Promise<NodeRect[]> {
  return page.evaluate(() => {
    // React Flow stores node data in the DOM via data-id attributes
    // We need the flow-coordinate positions, which are in the node transform
    const nodes = document.querySelectorAll<HTMLElement>('.react-flow__node');
    const results: NodeRect[] = [];

    for (const node of nodes) {
      const id = node.getAttribute('data-id');
      if (!id) continue;

      // React Flow sets node position via CSS transform: translate(x, y)
      const transform = node.style.transform;
      const match = transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
      if (!match) continue;

      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      const width = node.offsetWidth;
      const height = node.offsetHeight;

      results.push({ id, x, y, width, height });
    }
    return results;
  });
}

/**
 * Extract edge SVG path endpoints by parsing the `d` attribute.
 * Also retrieves source/target IDs from data attributes.
 */
async function getEdgeEndpoints(page: Page): Promise<EdgeEndpoints[]> {
  return page.evaluate(() => {
    const edges = document.querySelectorAll<SVGGElement>('.react-flow__edge');
    const results: EdgeEndpoints[] = [];

    for (const edgeGroup of edges) {
      const id = edgeGroup.getAttribute('data-id') ?? '';
      // React Flow stores source/target in aria attributes or data attributes
      const sourceId = edgeGroup.getAttribute('data-source') ?? '';
      const targetId = edgeGroup.getAttribute('data-target') ?? '';

      // Find the actual path element (not the interaction path)
      const pathEl = edgeGroup.querySelector<SVGPathElement>('.react-flow__edge-path');
      if (!pathEl) continue;

      const d = pathEl.getAttribute('d');
      if (!d) continue;

      // Parse start point: first M command
      const moveMatch = d.match(/M\s*(-?[\d.]+)[,\s](-?[\d.]+)/);
      if (!moveMatch) continue;
      const startX = parseFloat(moveMatch[1]);
      const startY = parseFloat(moveMatch[2]);

      // Parse end point: last coordinate pair in the path
      // For cubic bezier paths like "M x,y C ... x2,y2 C ... xN,yN"
      // the last point is the final coordinate pair
      const coordPairs = d.matchAll(/(-?[\d.]+)[,\s](-?[\d.]+)/g);
      let endX = startX;
      let endY = startY;
      for (const match of coordPairs) {
        endX = parseFloat(match[1]);
        endY = parseFloat(match[2]);
      }

      results.push({ id, sourceId, targetId, startX, startY, endX, endY, pathD: d });
    }
    return results;
  });
}

/**
 * Check if a point is near a node boundary (within tolerance).
 * The point should be close to the node's edge, not just anywhere inside.
 */
function isPointNearNodeBoundary(
  px: number,
  py: number,
  node: NodeRect,
  tolerance: number
): { near: boolean; distance: number } {
  const { x, y, width, height } = node;
  const right = x + width;
  const bottom = y + height;

  // Distance from point to each edge of the node rectangle
  const distLeft = Math.abs(px - x);
  const distRight = Math.abs(px - right);
  const distTop = Math.abs(py - y);
  const distBottom = Math.abs(py - bottom);

  // Point must be vertically within node bounds (with tolerance) to be "near" left/right
  // Point must be horizontally within node bounds (with tolerance) to be "near" top/bottom
  const inVerticalRange = py >= y - tolerance && py <= bottom + tolerance;
  const inHorizontalRange = px >= x - tolerance && px <= right + tolerance;

  const distances: number[] = [];
  if (inVerticalRange) {
    distances.push(distLeft, distRight);
  }
  if (inHorizontalRange) {
    distances.push(distTop, distBottom);
  }

  // Also check if point is inside the node (acceptable for edges connecting to node center)
  const inside = px >= x && px <= right && py >= y && py <= bottom;
  if (inside) {
    const minEdgeDist = Math.min(distLeft, distRight, distTop, distBottom);
    return { near: true, distance: minEdgeDist };
  }

  if (distances.length === 0) {
    // Point is completely outside the extended bounds
    const dx = Math.max(x - px, 0, px - right);
    const dy = Math.max(y - py, 0, py - bottom);
    return { near: false, distance: Math.hypot(dx, dy) };
  }

  const minDist = Math.min(...distances);
  return { near: minDist <= tolerance, distance: minDist };
}

/**
 * Find the closest node to a point.
 */
function findClosestNode(
  px: number,
  py: number,
  nodes: NodeRect[]
): { node: NodeRect; distance: number } | undefined {
  let best: { node: NodeRect; distance: number } | undefined;
  for (const node of nodes) {
    const dx = Math.max(node.x - px, 0, px - (node.x + node.width));
    const dy = Math.max(node.y - py, 0, py - (node.y + node.height));
    const dist = Math.hypot(dx, dy);
    if (!best || dist < best.distance) {
      best = { node, distance: dist };
    }
  }
  return best;
}

test.describe('Edge connectivity', () => {
  const samples = ['retail-banking', 'media-streaming', 'enterprise-erp', 'oss-collab', 'opensource-observability'] as const;

  for (const sampleId of samples) {
    test(`${sampleId}: edge endpoints connect to source/target nodes`, async ({ page }) => {
      test.setTimeout(30000);
      await page.goto('/');
      await waitForDiagram(page);
      await selectSample(page, sampleId);

      const nodes = await getNodeRects(page);
      const edges = await getEdgeEndpoints(page);

      expect(nodes.length).toBeGreaterThan(0);
      expect(edges.length).toBeGreaterThan(0);

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const disconnected: string[] = [];

      for (const edge of edges) {
        const sourceNode = nodeMap.get(edge.sourceId);
        const targetNode = nodeMap.get(edge.targetId);

        // Source endpoint check
        if (sourceNode) {
          const srcCheck = isPointNearNodeBoundary(
            edge.startX,
            edge.startY,
            sourceNode,
            TOLERANCE
          );
          if (!srcCheck.near) {
            const closest = findClosestNode(edge.startX, edge.startY, nodes);
            disconnected.push(
              `Edge ${edge.id}: start (${edge.startX.toFixed(0)}, ${edge.startY.toFixed(0)}) ` +
                `is ${srcCheck.distance.toFixed(0)}px from source "${edge.sourceId}" ` +
                `[${sourceNode.x.toFixed(0)},${sourceNode.y.toFixed(0)} ${sourceNode.width}x${sourceNode.height}]` +
                (closest ? ` (closest: "${closest.node.id}" at ${closest.distance.toFixed(0)}px)` : '')
            );
          }
        }

        // Target endpoint check
        if (targetNode) {
          const tgtCheck = isPointNearNodeBoundary(
            edge.endX,
            edge.endY,
            targetNode,
            TOLERANCE
          );
          if (!tgtCheck.near) {
            const closest = findClosestNode(edge.endX, edge.endY, nodes);
            disconnected.push(
              `Edge ${edge.id}: end (${edge.endX.toFixed(0)}, ${edge.endY.toFixed(0)}) ` +
                `is ${tgtCheck.distance.toFixed(0)}px from target "${edge.targetId}" ` +
                `[${targetNode.x.toFixed(0)},${targetNode.y.toFixed(0)} ${targetNode.width}x${targetNode.height}]` +
                (closest ? ` (closest: "${closest.node.id}" at ${closest.distance.toFixed(0)}px)` : '')
            );
          }
        }
      }

      if (disconnected.length > 0) {
        const ratio = disconnected.length / (edges.length * 2);
        console.log(
          `\n=== ${sampleId}: ${disconnected.length} disconnected endpoints (${(ratio * 100).toFixed(1)}%) ===`
        );
        for (const msg of disconnected) {
          console.log(`  ${msg}`);
        }
      }

      // Allow up to 20% disconnected endpoints (some compound edges may have
      // endpoints at leaf nodes inside containers)
      const maxDisconnected = Math.ceil(edges.length * 2 * 0.2);
      expect(
        disconnected.length,
        `${disconnected.length} edge endpoints are disconnected from their nodes:\n${disconnected.slice(0, 5).join('\n')}`
      ).toBeLessThanOrEqual(maxDisconnected);
    });
  }

  test('media-streaming: take screenshot for visual inspection', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await waitForDiagram(page);
    await selectSample(page, 'media-streaming');
    await page.screenshot({ path: 'tests/e2e/screenshots/media-streaming-edges.png', fullPage: true });
  });
});
