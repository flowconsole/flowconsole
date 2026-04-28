import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { ModelSnapshotWire } from '@flowconsole/web/architecture';

vi.mock('@flowconsole/web/architecture', () => ({
  ArchitectureDiagram: (props: Record<string, unknown>) => (
    <div data-testid="diagram" data-editable={String(props.editable)} />
  ),
  architectureNodeTypes: {},
  architectureEdgeTypes: {},
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ resolvedScheme: 'dark' }),
  mapSnapshotToDiagram: (s: ModelSnapshotWire) => ({
    nodes: s.elements.map((el) => ({
      id: el.id,
      type: 'element',
      position: { x: 0, y: 0 },
      data: { title: el.name },
    })),
    edges: [],
  }),
}));

vi.mock('@flowconsole/web/style.css', () => ({}));
vi.mock('@xyflow/react/dist/style.css', () => ({}));

const MINIMAL_SNAPSHOT: ModelSnapshotWire = {
  $schema: 'https://flowconsole.tech/contracts/model-snapshot/v1/schema.json',
  schemaVersion: '1.0.0',
  source: 'CodeScan',
  elements: [
    { id: 'svc-1', kind: 'Service', name: 'User Service' },
    { id: 'db-1', kind: 'Database', name: 'PostgreSQL' },
  ],
  relationships: [
    { id: 'r-1', sourceId: 'svc-1', targetId: 'db-1', kind: 'Calls' },
  ],
};

const EMPTY_SNAPSHOT: ModelSnapshotWire = {
  $schema: 'https://flowconsole.tech/contracts/model-snapshot/v1/schema.json',
  schemaVersion: '1.0.0',
  source: 'CodeScan',
  elements: [],
  relationships: [],
};

function mockFetchResponse(status: number, body?: unknown) {
  (globalThis.fetch as Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function mockFetchJsonError() {
  (globalThis.fetch as Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.reject(new SyntaxError('Unexpected token')),
  } as unknown as Response);
}

function mockFetchNetworkError() {
  (globalThis.fetch as Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

async function renderApp() {
  const { default: App } = await import('../../src/App');
  return render(<App />);
}

describe('App', () => {
  it('shows loading state initially', async () => {
    (globalThis.fetch as Mock).mockReturnValueOnce(new Promise(() => {}));
    await renderApp();
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders diagram on successful fetch', async () => {
    mockFetchResponse(200, MINIMAL_SNAPSHOT);
    await renderApp();
    await waitFor(() => {
      expect(screen.getByTestId('diagram')).toBeInTheDocument();
    });
    expect(screen.getByText('CodeScan')).toBeInTheDocument();
    expect(screen.getByText('2 elements')).toBeInTheDocument();
  });

  it('renders diagram with editable=false', async () => {
    mockFetchResponse(200, MINIMAL_SNAPSHOT);
    await renderApp();
    await waitFor(() => {
      expect(screen.getByTestId('diagram')).toHaveAttribute('data-editable', 'false');
    });
  });

  it('shows not-found error on 404', async () => {
    mockFetchResponse(404);
    await renderApp();
    await waitFor(() => {
      expect(screen.getByTestId('error-not-found')).toBeInTheDocument();
    });
    expect(screen.getByText('Snapshot not found')).toBeInTheDocument();
  });

  it('shows too-large error on 413', async () => {
    mockFetchResponse(413);
    await renderApp();
    await waitFor(() => {
      expect(screen.getByTestId('error-too-large')).toBeInTheDocument();
    });
  });

  it('shows parse-error on invalid JSON', async () => {
    mockFetchJsonError();
    await renderApp();
    await waitFor(() => {
      expect(screen.getByTestId('error-parse-error')).toBeInTheDocument();
    });
  });

  it('shows io-error on network failure', async () => {
    mockFetchNetworkError();
    await renderApp();
    await waitFor(() => {
      expect(screen.getByTestId('error-io-error')).toBeInTheDocument();
    });
  });

  it('shows empty state for zero-element snapshot', async () => {
    mockFetchResponse(200, EMPTY_SNAPSHOT);
    await renderApp();
    await waitFor(() => {
      expect(screen.getByTestId('empty')).toBeInTheDocument();
    });
    expect(screen.getByText('Empty snapshot')).toBeInTheDocument();
  });
});
