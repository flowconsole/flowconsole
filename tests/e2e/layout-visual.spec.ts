import { expect, test, type Page } from '@playwright/test';

import { layoutFixtures, type LayoutFixture } from './fixtures/layout';

const VIEWPORT = { width: 1600, height: 1000 };

async function openWorkbench(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((nextTheme) => {
    window.localStorage.setItem('FlowConsole-theme', nextTheme);
    Math.random = () => 0.123456789;
  }, theme);
  await page.goto('/');
  await page.setViewportSize(VIEWPORT);
  await expect(page.getByTestId('progress-overlay')).toBeHidden({ timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.__FLOWCONSOLE_E2E__?.loadLayoutFixture));
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
    `,
  });
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
}

async function loadFixture(
  page: Page,
  fixture: LayoutFixture,
  direction: LayoutFixture['directions'][number],
  debug = false
) {
  await page.evaluate(
    ({ nextFixture, nextDirection, nextDebug }) => {
      window.__FLOWCONSOLE_E2E__?.loadLayoutFixture({
        model: nextFixture.model,
        customShapes: nextFixture.customShapes,
        direction: nextDirection,
        debug: nextDebug,
      });
    },
    {
      nextFixture: fixture,
      nextDirection: direction,
      nextDebug: debug,
    }
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
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
}

function scopePath(fixture: LayoutFixture, scopeId: string) {
  const byId = new Map(fixture.model.nodes.map((node) => [node.id, node]));
  const path: string[] = [];
  let current = byId.get(scopeId);
  while (current) {
    path.unshift(current.id);
    if (!current.parentId) {
      break;
    }
    current = byId.get(current.parentId);
  }
  return path;
}

async function openScope(page: Page, fixture: LayoutFixture, scopeId: string) {
  for (const currentScopeId of scopePath(fixture, scopeId)) {
    const node = page.locator(`.react-flow__node[data-id="${currentScopeId}"]`);
    const button = node.getByRole('button', { name: /open container/i });
    if ((await button.count()) === 0) {
      continue;
    }
    await button.click({ force: true });
    await waitForDiagramReady(page);
  }
}

async function openFlowStep(page: Page, fixture: LayoutFixture, flowId: string, stepIndex: number) {
  const expectedFlow = fixture.model.flows?.find((flow) => flow.id === flowId);
  if (!expectedFlow) {
    throw new Error(`Flow ${flowId} is not defined in fixture ${fixture.id}`);
  }

  await page.getByLabel('Flows').click();
  const panel = page.locator('.flow-panel');
  await expect(panel).toBeVisible();
  await panel.locator('select').selectOption(flowId);
  for (let current = 0; current < stepIndex; current += 1) {
    await panel.getByRole('button', { name: 'Next' }).click();
  }
  await expect(panel.getByText(`Step ${stepIndex + 1}/${expectedFlow.steps.length}`)).toBeVisible();
  await page.waitForTimeout(50);
}

async function assertSemanticLayout(page: Page, fixture: LayoutFixture) {
  const metrics = await page.evaluate(
    ({ expectation, model }) => {
      const nodeElements = Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'));
      const nodeRects = nodeElements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.dataset.id ?? '',
          x1: rect.x,
          y1: rect.y,
          x2: rect.x + rect.width,
          y2: rect.y + rect.height,
          width: rect.width,
          height: rect.height,
        };
      });

      let maxOverlapRatio = 0;
      for (let index = 0; index < nodeRects.length; index += 1) {
        for (let inner = index + 1; inner < nodeRects.length; inner += 1) {
          const left = Math.max(nodeRects[index].x1, nodeRects[inner].x1);
          const top = Math.max(nodeRects[index].y1, nodeRects[inner].y1);
          const right = Math.min(nodeRects[index].x2, nodeRects[inner].x2);
          const bottom = Math.min(nodeRects[index].y2, nodeRects[inner].y2);
          if (right <= left || bottom <= top) {
            continue;
          }

          const firstContainsSecond =
            nodeRects[index].x1 <= nodeRects[inner].x1 &&
            nodeRects[index].y1 <= nodeRects[inner].y1 &&
            nodeRects[index].x2 >= nodeRects[inner].x2 &&
            nodeRects[index].y2 >= nodeRects[inner].y2;
          const secondContainsFirst =
            nodeRects[inner].x1 <= nodeRects[index].x1 &&
            nodeRects[inner].y1 <= nodeRects[index].y1 &&
            nodeRects[inner].x2 >= nodeRects[index].x2 &&
            nodeRects[inner].y2 >= nodeRects[index].y2;
          if (firstContainsSecond || secondContainsFirst) {
            continue;
          }

          const overlapArea = (right - left) * (bottom - top);
          const smallestArea = Math.min(
            nodeRects[index].width * nodeRects[index].height,
            nodeRects[inner].width * nodeRects[inner].height
          );
          maxOverlapRatio = Math.max(maxOverlapRatio, overlapArea / Math.max(smallestArea, 1));
        }
      }

      const edgeBoxes = Array.from(document.querySelectorAll<SVGGraphicsElement>('.relationship-path'))
        .map((element) => {
          try {
            return element.getBBox();
          } catch {
            return null;
          }
        })
        .filter(Boolean) as DOMRect[];

      let overlappedEdges = 0;
      for (let index = 0; index < edgeBoxes.length; index += 1) {
        for (let inner = index + 1; inner < edgeBoxes.length; inner += 1) {
          const first = edgeBoxes[index];
          const second = edgeBoxes[inner];
          const overlap =
            first.x < second.x + second.width &&
            first.x + first.width > second.x &&
            first.y < second.y + second.height &&
            first.y + first.height > second.y;
          if (overlap) {
            overlappedEdges += 1;
          }
        }
      }

      const nodesById = new Map(nodeRects.map((node) => [node.id, node]));
      const parentViolations = model.nodes
        .filter((node: { id: string; parentId?: string }) => node.parentId)
        .map((node: { id: string; parentId?: string }) => {
          const parent = nodesById.get(node.parentId ?? '');
          const child = nodesById.get(node.id);
          if (!parent || !child) {
            return null;
          }
          const fullyInside =
            child.x1 >= parent.x1 &&
            child.y1 >= parent.y1 &&
            child.x2 <= parent.x2 &&
            child.y2 <= parent.y2;
          return fullyInside ? null : { parentId: node.parentId, childId: node.id };
        })
        .filter(Boolean);

      return {
        nodeCount: nodeRects.length,
        edgeCount: edgeBoxes.length,
        maxOverlapRatio,
        overlappedEdges,
        parentViolations,
        maxAllowedOverlap: expectation.maxOverlapRatio,
        maxAllowedEdgeCrossings: expectation.maxEdgeCrossings,
      };
    },
    {
      expectation: fixture.expectations,
      model: fixture.model,
    }
  );

  expect(metrics.nodeCount).toBeGreaterThan(0);
  expect(metrics.edgeCount).toBeGreaterThan(0);
  expect(metrics.maxOverlapRatio).toBeLessThanOrEqual(metrics.maxAllowedOverlap);

  // Verify rendered edge count matches model edges (root view only — scoped views filter)
  const expectedEdgeCount = fixture.model.edges.length;
  expect(metrics.edgeCount).toBeGreaterThanOrEqual(expectedEdgeCount);
  if (fixture.expectations.containersMustEnclose) {
    expect(metrics.parentViolations).toEqual([]);
  }

  if (fixture.expectations.semanticOrder?.length) {
    for (const [leftId, relation, rightId] of fixture.expectations.semanticOrder) {
      const left = page.locator(`.react-flow__node[data-id="${leftId}"]`);
      const right = page.locator(`.react-flow__node[data-id="${rightId}"]`);
      if ((await left.count()) === 0 || (await right.count()) === 0) {
        continue;
      }
      const leftBox = await left.boundingBox();
      const rightBox = await right.boundingBox();
      if (!leftBox || !rightBox) {
        continue;
      }

      if (relation === 'left-of') {
        expect(leftBox.x).toBeLessThan(rightBox.x);
      } else if (relation === 'right-of') {
        expect(leftBox.x).toBeGreaterThan(rightBox.x);
      } else if (relation === 'above') {
        expect(leftBox.y).toBeLessThan(rightBox.y);
      } else if (relation === 'below') {
        expect(leftBox.y).toBeGreaterThan(rightBox.y);
      }
    }
  }
}

function expectedLabels(fixture: LayoutFixture, scopeId?: string) {
  if (scopeId) {
    const scoped = fixture.model.nodes.filter((node) => node.id === scopeId || node.parentId === scopeId);
    return scoped.slice(0, 3).map((node) => node.data.title);
  }
  return fixture.model.nodes
    .filter((node) => !node.parentId)
    .slice(0, 3)
    .map((node) => node.data.title);
}

async function assertLabelsVisible(page: Page, labels: string[]) {
  for (const label of labels) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
}

async function expectDiagramScreenshot(page: Page, name: string) {
  await expect(page.locator('.diagram-pane')).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
  });
}

test.describe('Semantically-aware layout visual regression', () => {
  for (const fixture of layoutFixtures) {
    test(`${fixture.id} root-light`, async ({ page }) => {
      await openWorkbench(page, 'light');
      await loadFixture(page, fixture, fixture.directions[0]);
      await assertLabelsVisible(page, expectedLabels(fixture));
      await assertSemanticLayout(page, fixture);
      await expectDiagramScreenshot(page, `${fixture.id}-root-light.png`);
    });

    test(`${fixture.id} root-dark`, async ({ page }) => {
      await openWorkbench(page, 'dark');
      await loadFixture(page, fixture, fixture.directions[0]);
      await assertLabelsVisible(page, expectedLabels(fixture));
      await expectDiagramScreenshot(page, `${fixture.id}-root-dark.png`);
    });

    test(`${fixture.id} debug-overlay`, async ({ page }) => {
      await openWorkbench(page, 'light');
      await loadFixture(page, fixture, fixture.directions[0], true);
      await expect(page.getByTestId('layout-debug-overlay')).toBeVisible();
      await expectDiagramScreenshot(page, `${fixture.id}-debug-overlay.png`);
    });

    for (const scope of fixture.scopes ?? []) {
      test(`${fixture.id} scope-${scope.scopeId}`, async ({ page }) => {
        await openWorkbench(page, 'light');
        await loadFixture(page, fixture, fixture.directions[0]);
        await openScope(page, fixture, scope.scopeId);
        await assertLabelsVisible(page, expectedLabels(fixture, scope.scopeId));
        expect(await page.locator('.react-flow__node').count()).toBeGreaterThanOrEqual(scope.expectedVisibleCount);
        await assertSemanticLayout(page, fixture);
        await expectDiagramScreenshot(page, `${fixture.id}-scope-${scope.scopeId}.png`);
      });
    }

    for (const flowMeta of fixture.flows ?? []) {
      const stepIndexes = [0, Math.max(Math.floor((flowMeta.stepCount - 1) / 2), 0), Math.max(flowMeta.stepCount - 1, 0)];
      const uniqueStepIndexes = Array.from(new Set(stepIndexes));

      for (const stepIndex of uniqueStepIndexes) {
        test(`${fixture.id} flow-${flowMeta.flowId}-step-${stepIndex + 1}`, async ({ page }) => {
          await openWorkbench(page, 'light');
          await loadFixture(page, fixture, fixture.directions[0]);
          await openFlowStep(page, fixture, flowMeta.flowId, stepIndex);
          // Verify flow edges are highlighted
          expect(await page.locator('.relationship-path--flow').count()).toBeGreaterThan(0);
          // Verify active flow step has highlighted node or edge
          const highlightedNodes = await page.locator('.react-flow__node--flow-active').count();
          const highlightedEdges = await page.locator('.react-flow__edge--flow-active, .relationship-path--flow').count();
          expect(highlightedNodes + highlightedEdges).toBeGreaterThan(0);
          await expectDiagramScreenshot(page, `${fixture.id}-flow-${flowMeta.flowId}-step-${stepIndex + 1}.png`);
        });
      }
    }

    for (const direction of fixture.directions.slice(1)) {
      test(`${fixture.id} direction-${direction.toLowerCase()}`, async ({ page }) => {
        await openWorkbench(page, 'light');
        await loadFixture(page, fixture, direction);
        await assertSemanticLayout(page, fixture);
        await expectDiagramScreenshot(page, `${fixture.id}-direction-${direction.toLowerCase()}.png`);
      });
    }
  }
});
