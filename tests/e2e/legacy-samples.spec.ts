/**
 * E2E tests: render each legacy codeSamplesOld in the browser,
 * verify the diagram renders correctly, then open each container
 * and verify children are visible and edges are rendered.
 */
import { expect, test, type Page } from '@playwright/test';

import legacySamples from './fixtures/layout/legacy-samples.json';

const VIEWPORT = { width: 1600, height: 1000 };

type LegacySample = (typeof legacySamples)[number];

declare global {
  interface Window {
    __FLOWCONSOLE_E2E__?: {
      loadLayoutFixture: (payload: { model: LegacySample['model']; direction?: string; debug?: boolean }) => void;
      loadCode: (source: string) => void;
    };
  }
}

async function openWorkbench(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('FlowConsole-theme', 'light');
    Math.random = () => 0.123456789;
  });
  await page.goto('/');
  await page.setViewportSize(VIEWPORT);
  await expect(page.getByTestId('progress-overlay')).toBeHidden({ timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__FLOWCONSOLE_E2E__?.loadLayoutFixture));
  await page.addStyleTag({
    content: `*, *::before, *::after {
      transition: none !important;
      animation: none !important;
      caret-color: transparent !important;
    }`,
  });
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
}

async function loadModel(page: Page, sample: LegacySample) {
  await page.evaluate(
    ({ model }) => {
      window.__FLOWCONSOLE_E2E__?.loadLayoutFixture({ model });
    },
    { model: sample.model }
  );
  await waitForDiagramReady(page);
}

async function waitForDiagramReady(page: Page) {
  await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => {
    const ready = document.querySelector('[data-testid="diagram-ready"]');
    return Boolean(ready?.getAttribute('data-layout-engine'));
  });
  await page.evaluate(
    () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    })
  );
}

async function waitForScopeChange(page: Page, expectedContainerTitle: string) {
  // Wait until the "View: ..." scope trail indicator includes the expected container title
  await page.waitForFunction(
    (title) => {
      const panels = Array.from(document.querySelectorAll('.react-flow__panel'));
      return panels.some((panel) => {
        const text = panel.textContent ?? '';
        return text.startsWith('View:') && text.includes(title);
      });
    },
    expectedContainerTitle,
    { timeout: 20000 }
  );
  await waitForDiagramReady(page);
}

function scopePath(sample: LegacySample, targetId: string): string[] {
  const byId = new Map(sample.model.nodes.map((n) => [n.id, n]));
  const path: string[] = [];
  let current = byId.get(targetId);
  while (current) {
    path.unshift(current.id);
    if (!current.parentId) break;
    current = byId.get(current.parentId);
  }
  return path;
}

async function openContainer(page: Page, sample: LegacySample, containerId: string) {
  const byId = new Map(sample.model.nodes.map((n) => [n.id, n]));
  const path = scopePath(sample, containerId);
  // Open each ancestor by dispatching the container:open event directly
  for (const stepId of path) {
    const nodeData = byId.get(stepId);
    if (!nodeData || nodeData.type !== 'container') continue;
    const title = nodeData.data.title;
    await page.evaluate(
      (id) => window.dispatchEvent(new CustomEvent('container:open', { detail: { id } })),
      stepId
    );
    await waitForScopeChange(page, title);
  }
}

async function getDiagramMetrics(page: Page) {
  return page.evaluate(() => {
    const nodeElements = Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'));
    const nodes = nodeElements.map((el) => ({
      id: el.dataset.id ?? '',
      rect: el.getBoundingClientRect(),
    }));
    const edgeCount = document.querySelectorAll('.react-flow__edge').length;
    return { nodeCount: nodes.length, edgeCount, nodes };
  });
}

async function assertNodesRendered(page: Page, expectedMinNodes: number) {
  const metrics = await getDiagramMetrics(page);
  expect(metrics.nodeCount).toBeGreaterThanOrEqual(expectedMinNodes);
  expect(metrics.edgeCount).toBeGreaterThan(0);
}

async function assertNodesHaveSize(page: Page) {
  const zeroSized = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'));
    return nodes
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width === 0 || rect.height === 0;
      })
      .map((el) => el.dataset.id);
  });
  expect(zeroSized).toEqual([]);
}

/**
 * Assert that the given sibling node IDs don't overlap each other in the rendered diagram.
 * Uses model-based sibling groups since ReactFlow renders all nodes as flat DOM siblings.
 */
async function assertNoSiblingOverlaps(page: Page, siblingIds: string[]) {
  const overlaps = await page.evaluate((ids) => {
    const rects = ids
      .map((id) => {
        const el = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`);
        return el ? { id, rect: el.getBoundingClientRect() } : null;
      })
      .filter((n): n is NonNullable<typeof n> => Boolean(n));

    const found: string[] = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].rect;
        const b = rects[j].rect;
        if (a.width === 0 || a.height === 0 || b.width === 0 || b.height === 0) continue;
        // Check if one contains the other (parent-child rendered overlap, not sibling overlap)
        const aContainsB = a.left <= b.left && a.top <= b.top && a.right >= b.right && a.bottom >= b.bottom;
        const bContainsA = b.left <= a.left && b.top <= a.top && b.right >= a.right && b.bottom >= a.bottom;
        if (aContainsB || bContainsA) continue;
        // Check overlap with tolerance (4px for subpixel rendering)
        const tolerance = 4;
        const overlapX = a.right - tolerance > b.left && b.right - tolerance > a.left;
        const overlapY = a.bottom - tolerance > b.top && b.bottom - tolerance > a.top;
        if (overlapX && overlapY) {
          found.push(`${rects[i].id} overlaps ${rects[j].id}`);
        }
      }
    }
    return found;
  }, siblingIds);
  expect(overlaps, 'Sibling nodes should not overlap').toEqual([]);
}

/**
 * Assert that rendered edge paths don't cross each other.
 * Samples edge path segments and checks for intersections.
 */
/**
 * Verifies that edges don't pass through intermediate node bounding boxes.
 * Samples each edge path and checks that interior points don't fall inside
 * any node rect (except the edge's own source/target).
 */
async function assertEdgesDontCrossNodes(page: Page) {
  const violations = await page.evaluate(() => {
    const edges = Array.from(document.querySelectorAll<SVGPathElement>('.react-flow__edge path[d]'));
    const nodeEls = Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'));

    const nodeRects = nodeEls.map((el) => {
      const id = el.getAttribute('data-id') ?? '';
      const rect = el.getBoundingClientRect();
      return { id, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    });

    function samplePath(path: SVGPathElement, steps: number) {
      const length = path.getTotalLength();
      if (length === 0) return [];
      const points: Array<{ x: number; y: number }> = [];
      // Skip first and last 15% to avoid false positives at connection points
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        if (t < 0.15 || t > 0.85) continue;
        const pt = path.getPointAtLength(t * length);
        // Convert SVG coordinates to screen coordinates
        const svg = path.ownerSVGElement;
        if (!svg) continue;
        const ctm = svg.getScreenCTM();
        if (!ctm) continue;
        points.push({
          x: pt.x * ctm.a + pt.y * ctm.c + ctm.e,
          y: pt.x * ctm.b + pt.y * ctm.d + ctm.f,
        });
      }
      return points;
    }

    const found: string[] = [];
    for (const edge of edges) {
      const edgeGroup = edge.closest('.react-flow__edge');
      const edgeId = edgeGroup?.getAttribute('data-id') ?? '';
      const ariaLabel = edgeGroup?.getAttribute('aria-label') ?? '';
      // Extract source/target from aria-label "Edge from {source} to {target}"
      const match = ariaLabel.match(/Edge from (.+) to (.+)/);
      const sourceId = match?.[1] ?? '';
      const targetId = match?.[2] ?? '';

      const points = samplePath(edge, 30);
      const margin = 4;
      for (const pt of points) {
        for (const node of nodeRects) {
          if (node.id === sourceId || node.id === targetId) continue;
          if (node.right - node.left < 5 || node.bottom - node.top < 5) continue;
          if (
            pt.x > node.left + margin &&
            pt.x < node.right - margin &&
            pt.y > node.top + margin &&
            pt.y < node.bottom - margin
          ) {
            const key = `edge ${edgeId} crosses node ${node.id}`;
            if (!found.includes(key)) found.push(key);
          }
        }
      }
    }
    return found;
  });
  expect(violations, 'Edges should not cross through nodes').toEqual([]);
}

/**
 * Assert that edge endpoints are connected to their source/target nodes.
 * An edge's start point should be within `tolerance` px of its source node rect,
 * and its end point should be within `tolerance` of its target node rect.
 */
async function assertEdgesConnected(page: Page) {
  const disconnected = await page.evaluate(() => {
    const tolerance = 15;
    const edges = Array.from(document.querySelectorAll<SVGGElement>('.react-flow__edge'));
    const found: string[] = [];

    for (const edgeEl of edges) {
      const edgeId = edgeEl.getAttribute('data-id') ?? '';
      const path = edgeEl.querySelector<SVGPathElement>('path[d]');
      if (!path) continue;
      const length = path.getTotalLength();
      if (length === 0) continue;

      const startPt = path.getPointAtLength(0);
      const endPt = path.getPointAtLength(length);

      // Find source and target from aria-label "Edge from X to Y"
      const ariaLabel = edgeEl.getAttribute('aria-label') ?? '';
      const match = ariaLabel.match(/Edge from (.+) to (.+)/);
      if (!match) continue;

      // Get all node rects
      const nodeEls = Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'));
      const nodeRects = new Map<string, DOMRect>();
      for (const n of nodeEls) {
        nodeRects.set(n.dataset.id ?? '', n.getBoundingClientRect());
      }

      // Convert SVG point to screen coordinates
      const svgEl = path.ownerSVGElement;
      if (!svgEl) continue;
      const ctm = svgEl.getScreenCTM();
      if (!ctm) continue;

      const toScreen = (pt: DOMPoint) => ({
        x: pt.x * ctm.a + ctm.e,
        y: pt.y * ctm.d + ctm.f,
      });

      const startScreen = toScreen(startPt);
      const endScreen = toScreen(endPt);

      // Check if point is near any edge of a rect (expanded by tolerance)
      const isNearRect = (pt: { x: number; y: number }, rect: DOMRect) => {
        const expanded = {
          left: rect.left - tolerance,
          right: rect.right + tolerance,
          top: rect.top - tolerance,
          bottom: rect.bottom + tolerance,
        };
        return pt.x >= expanded.left && pt.x <= expanded.right &&
               pt.y >= expanded.top && pt.y <= expanded.bottom;
      };

      // Check source
      const sourceId = edgeEl.getAttribute('data-source') ??
        edgeEl.querySelector('.react-flow__edge-interaction')?.getAttribute('data-source') ?? '';
      const targetId = edgeEl.getAttribute('data-target') ??
        edgeEl.querySelector('.react-flow__edge-interaction')?.getAttribute('data-target') ?? '';

      // Try to match against actual source/target nodes by checking edge data attributes
      const sourceRect = nodeRects.get(sourceId);
      const targetRect = nodeRects.get(targetId);

      if (sourceRect && !isNearRect(startScreen, sourceRect)) {
        found.push(`${edgeId}: start not near source ${sourceId}`);
      }
      if (targetRect && !isNearRect(endScreen, targetRect)) {
        found.push(`${edgeId}: end not near target ${targetId}`);
      }
    }
    return found;
  });
  expect(disconnected, 'All edges should connect to their nodes').toEqual([]);
}

test.describe('Legacy samples: render and container drilldown', () => {
  for (const sample of legacySamples) {
    test.describe(sample.title, () => {
      test('renders diagram with all nodes and edges', async ({ page }) => {
        await openWorkbench(page);
        await loadModel(page, sample);
        await assertNodesRendered(page, sample.model.nodes.filter((n) => !n.parentId).length);
        await assertNodesHaveSize(page);
        const rootNodeIds = sample.model.nodes.filter((n) => !n.parentId).map((n) => n.id);
        await assertNoSiblingOverlaps(page, rootNodeIds);
        await assertEdgesDontCrossNodes(page);

        // Verify root-level node titles are visible
        const topLevelNodes = sample.model.nodes.filter((n) => !n.parentId);
        for (const node of topLevelNodes.slice(0, 5)) {
          await expect(
            page.getByText(node.data.title, { exact: true }).first()
          ).toBeVisible();
        }
      });

      test('screenshot at root level', async ({ page }) => {
        await openWorkbench(page);
        await loadModel(page, sample);
        await expect(page.locator('.diagram-pane')).toHaveScreenshot(
          `legacy-${sample.id}-root.png`,
          { animations: 'disabled', caret: 'hide' }
        );
      });

      // Test each container: open it and verify children render
      for (const container of sample.containers) {
        test(`open container "${container.title}" (${container.id})`, async ({ page }) => {
          await openWorkbench(page);
          await loadModel(page, sample);

          // Open the container (walks ancestor path)
          await openContainer(page, sample, container.id);

          // Nodes should be rendered in the scoped view
          const metrics = await getDiagramMetrics(page);
          expect(metrics.nodeCount).toBeGreaterThan(0);
          expect(metrics.edgeCount).toBeGreaterThan(0);

          // Container's children should be present as ReactFlow nodes
          const childNodes = sample.model.nodes.filter((n) => n.parentId === container.id);
          for (const child of childNodes) {
            const node = page.locator(`.react-flow__node[data-id="${child.id}"]`);
            await expect(node).toBeVisible({ timeout: 5000 });
          }

          // Children within this container must not overlap each other
          const siblingIds = sample.model.nodes.filter((n) => n.parentId === container.id).map((n) => n.id);
          await assertNoSiblingOverlaps(page, siblingIds);

          // Edges must not cross each other
          await assertEdgesDontCrossNodes(page);

          // Screenshot of the drilled-down view
          await expect(page.locator('.diagram-pane')).toHaveScreenshot(
            `legacy-${sample.id}-scope-${container.id}.png`,
            { animations: 'disabled', caret: 'hide' }
          );
        });
      }

      // Test flows if present
      if (sample.model.flows && sample.model.flows.length > 0) {
        test('flow panel renders and steps navigate', async ({ page }) => {
          await openWorkbench(page);
          await loadModel(page, sample);

          // Open flows panel
          const flowsButton = page.getByLabel('Flows');
          if ((await flowsButton.count()) > 0) {
            await flowsButton.click();
            const panel = page.locator('.flow-panel');
            await expect(panel).toBeVisible({ timeout: 5000 });

            // Select first flow
            const firstFlow = sample.model.flows![0];
            await panel.locator('select').selectOption(firstFlow.id);

            // Navigate first step
            const nextButton = panel.getByRole('button', { name: 'Next' });
            if ((await nextButton.count()) > 0) {
              await nextButton.click();
              await page.waitForTimeout(100);

              // Verify some highlighting is present
              const highlighted = await page.locator(
                '.react-flow__edge--flow-active, .relationship-path--flow'
              ).count();
              expect(highlighted).toBeGreaterThan(0);
            }
          }
        });
      }
    });
  }
});
