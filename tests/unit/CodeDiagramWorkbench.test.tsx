import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CodeDiagramWorkbench } from '../../src/web/components/Workbench/CodeDiagramWorkbench';
import React from 'react';
import { ThemeProvider } from '../../src/theme/ThemeProvider';

vi.mock('@monaco-editor/react', () => ({
  Editor: ({
    value,
    onChange,
    beforeMount,
  }: {
    value: string;
    onChange?: (val: string) => void;
    beforeMount?: (monaco: unknown) => void; 



  }) => {
    beforeMount?.({
      languages: {
        typescript: {
          ModuleResolutionKind: { NodeJs: 2 },
          typescriptDefaults: {
            getCompilerOptions: vi.fn().mockReturnValue({}),
            setCompilerOptions: vi.fn(),
            addExtraLib: vi.fn(),
          },
          javascriptDefaults: {
            setCompilerOptions: vi.fn(),
            addExtraLib: vi.fn(),
          },
        },
      },
    });
    return (
      <textarea
        data-testid="code-editor"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    );
  },
}));

const mockEvaluate = vi.fn();
vi.mock('../../src/web/languages/typescript/evaluateDiagramCode', () => ({
  evaluateDiagramCode: (...args: unknown[]) => mockEvaluate(...args),
}));

vi.mock('../../src/web/components/ArchitectureDiagram', () => ({
  ArchitectureDiagram: ({ model }: { model: { nodes: unknown[] } }) => (
    <div data-testid="diagram">nodes:{model.nodes.length}</div>
  ),
})); 

vi.mock('../../src/web/components/VerticalSplit', () => {
  const Pane = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const Split = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  Split.Pane = Pane;
  return { VerticalSplit: Split };
});

vi.mock('../../src/theme/ThemeProvider', () => ({
  useTheme: () => ({ resolvedScheme: 'dark' })
}));

describe('CodeDiagramWorkbench', () => {
  beforeEach(() => {
    mockEvaluate.mockResolvedValue({ ok: true, model: { nodes: [], edges: [] } });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    mockEvaluate.mockReset();
  });

  it('triggers evaluation when mounted', async () => {
    render(
        <CodeDiagramWorkbench apiBaseUrl="http://localhost:5000" />
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
  });

  it('shows error when evaluation fails', async () => {
    mockEvaluate.mockResolvedValueOnce({ ok: false, error: 'Syntax error' });
    render(<CodeDiagramWorkbench apiBaseUrl="http://localhost:5000" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
    const evaluationPromise = mockEvaluate.mock.results.at(-1)?.value as Promise<unknown>;
    await act(async () => {
      await evaluationPromise;
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Syntax error')).toBeInTheDocument();
  });

  it('switches samples via dropdown', () => {
    render(<CodeDiagramWorkbench apiBaseUrl="http://localhost:5000" />);
    const select = screen.getByTestId('sample-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'simple-arch' } });
    expect(select.value).toBe('simple-arch');
    expect(screen.getByTestId('sample-description')).toHaveTextContent('Minimal two-service architecture example');
  });

  it('debounces rapid code changes into a single evaluation', async () => {
    render(<CodeDiagramWorkbench apiBaseUrl="http://localhost:5000" />);

    // initial evaluation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
    mockEvaluate.mockClear();

    // Rapid sample switches change the code state, triggering debounced re-evaluation
    const select = screen.getByTestId('sample-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'simple-arch' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    fireEvent.change(select, { target: { value: 'test-sample' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(mockEvaluate).toHaveBeenCalledTimes(1);
  });

  it('hides overlay after successful evaluation', async () => {
    render(<CodeDiagramWorkbench apiBaseUrl="http://localhost:5000" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    const evaluationPromise = mockEvaluate.mock.results.at(-1)?.value as Promise<unknown>;
    await act(async () => {
      await evaluationPromise;
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(screen.queryByTestId('progress-overlay')).not.toBeInTheDocument();
  });
});
