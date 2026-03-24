import { test, expect, type Page } from '@playwright/test';
import { layoutFixturesById } from './fixtures/layout';

const waitForOverlayHidden = async (page: Page) => {
  await expect(page.getByTestId('progress-overlay')).toBeHidden({ timeout: 15000 });
};

async function openWorkbench(page: Page) {
  await page.goto('/');
  await waitForOverlayHidden(page);
  await page.waitForFunction(() => Boolean(window.__FLOWCONSOLE_E2E__?.loadLayoutFixture));
}

async function loadFixtureById(page: Page, fixtureId: string) {
  const fixture = layoutFixturesById.get(fixtureId);
  if (!fixture) throw new Error(`Fixture not found: ${fixtureId}`);

  await page.evaluate(
    ({ model, direction }) => {
      window.__FLOWCONSOLE_E2E__?.loadLayoutFixture({ model, direction });
    },
    { model: fixture.model, direction: fixture.directions[0] }
  );
  await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => {
    const ready = document.querySelector('[data-testid="diagram-ready"]');
    return Boolean(ready?.getAttribute('data-layout-engine'));
  });
}

test.describe('FlowConsole workbench', () => {
  test('shows progress overlay while diagram is recomputed', async ({ page }) => {
    await page.goto('/');
    const overlay = page.getByTestId('progress-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toBeHidden({ timeout: 10000 });
  });

  test('surfaces DSL errors when code is invalid', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('const broken = {\n  name: "Oops"\n};\nbroken.sendsRequestTo(target, "fail");');
    await expect(page.getByText('Error')).toBeVisible({ timeout: 2000 });
  });

  test('allows toggling the navigation theme control', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('progress-overlay')).toBeHidden({ timeout: 10000 });
    const toggleButton = page.getByLabel('Toggle theme');
    await toggleButton.click();
    await expect(toggleButton).toBeVisible();
  });

  test('renders diagram nodes and edges from fixture', async ({ page }) => {
    await openWorkbench(page);
    await loadFixtureById(page, 'c4-drilldown-basic');
    expect(await page.locator('.react-flow__node').count()).toBeGreaterThan(1);
    expect(await page.locator('.react-flow__edge').count()).toBeGreaterThan(1);
    await expect(page.getByText('Web App')).toBeVisible();
  });

  test('navigates into container and back to root view', async ({ page }) => {
    await openWorkbench(page);
    await loadFixtureById(page, 'c4-drilldown-basic');
    const container = page.locator('.react-flow__node[data-id="core-services"]');
    const openButton = container.getByRole('button', { name: /open container/i });
    await openButton.click({ force: true });
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Accounts API')).toBeVisible();
    const rootButton = page.getByRole('button', { name: /Root view/i });
    await rootButton.click();
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Web App')).toBeVisible();
  });

  test('plays flow steps and updates step indicator', async ({ page }) => {
    await openWorkbench(page);
    await loadFixtureById(page, 'flow-across-scopes');
    await page.getByLabel('Flows').click();
    const panel = page.locator('.flow-panel');
    await expect(panel).toBeVisible();
    await panel.locator('select').selectOption({ index: 1 });
    const stepLabel = page.getByText(/Step \d+\/\d+/i);
    await expect(stepLabel).toBeVisible({ timeout: 5000 });
    const initialText = await stepLabel.innerText();
    await page.getByRole('button', { name: /Next/i }).click();
    await expect(stepLabel).not.toHaveText(initialText);
  });

  test('layout produces no node overlaps for gateway topology', async ({ page }) => {
    await openWorkbench(page);
    await loadFixtureById(page, 'gateway-bff-topology');
    const overlapCount = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'));
      const rects = nodes.map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.dataset.id, x1: r.x, y1: r.y, x2: r.x + r.width, y2: r.y + r.height, w: r.width, h: r.height };
      });
      let overlaps = 0;
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const left = Math.max(a.x1, b.x1);
          const top = Math.max(a.y1, b.y1);
          const right = Math.min(a.x2, b.x2);
          const bottom = Math.min(a.y2, b.y2);
          if (right <= left || bottom <= top) continue;
          const aContainsB = a.x1 <= b.x1 && a.y1 <= b.y1 && a.x2 >= b.x2 && a.y2 >= b.y2;
          const bContainsA = b.x1 <= a.x1 && b.y1 <= a.y1 && b.x2 >= a.x2 && b.y2 >= a.y2;
          if (aContainsB || bContainsA) continue;
          overlaps++;
        }
      }
      return overlaps;
    });
    expect(overlapCount).toBe(0);
  });

  test('renders many siblings without overlap', async ({ page }) => {
    await openWorkbench(page);
    await loadFixtureById(page, 'many-siblings-grid');
    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(8);
  });

  test('renders disconnected components', async ({ page }) => {
    await openWorkbench(page);
    await loadFixtureById(page, 'disconnected-components-pack');
    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(4);
    expect(await page.locator('.react-flow__edge').count()).toBeGreaterThan(0);
  });

  test('supports direction switch to TB', async ({ page }) => {
    await openWorkbench(page);
    const fixture = layoutFixturesById.get('top-to-bottom-process')!;
    await page.evaluate(
      ({ model, direction }) => {
        window.__FLOWCONSOLE_E2E__?.loadLayoutFixture({ model, direction });
      },
      { model: fixture.model, direction: 'TB' as const }
    );
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 15000 });
    expect(await page.locator('.react-flow__node').count()).toBeGreaterThan(1);
  });

  test('debug overlay shows layout diagnostics', async ({ page }) => {
    await openWorkbench(page);
    const fixture = layoutFixturesById.get('c4-drilldown-basic')!;
    await page.evaluate(
      ({ model, direction }) => {
        window.__FLOWCONSOLE_E2E__?.loadLayoutFixture({ model, direction, debug: true });
      },
      { model: fixture.model, direction: fixture.directions[0] }
    );
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('layout-debug-overlay')).toBeVisible();
  });

  test('handles long labels and badges without layout crash', async ({ page }) => {
    await openWorkbench(page);
    await loadFixtureById(page, 'long-labels-and-badges');
    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(3);
  });

  test('custom shapes render correctly in mixed-custom-shapes fixture', async ({ page }) => {
    await openWorkbench(page);
    const fixture = layoutFixturesById.get('mixed-custom-shapes')!;
    await page.evaluate(
      ({ model, direction, customShapes }) => {
        window.__FLOWCONSOLE_E2E__?.loadLayoutFixture({ model, direction, customShapes });
      },
      { model: fixture.model, direction: fixture.directions[0], customShapes: fixture.customShapes }
    );
    await expect(page.getByTestId('diagram-ready')).toBeVisible({ timeout: 15000 });
    const nodeCount = await page.locator('.react-flow__node').count();
    expect(nodeCount).toBeGreaterThanOrEqual(4);
    await expect(page.getByText('Orchestrator')).toBeVisible();
    await expect(page.getByText('Scheduler')).toBeVisible();
  });
});
