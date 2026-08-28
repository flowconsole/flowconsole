import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSnapshotStatus } from '../../src/hooks/useSnapshotStatus';
import { StatusIndicator } from '../../src/components/StatusIndicator';
import { render, screen } from '@testing-library/react';

function statusResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as Response;
}

describe('useSnapshotStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('disables polling when status endpoint answers 404', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404 }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSnapshotStatus(vi.fn()));

    await waitFor(() => {
      expect(result.current).toEqual({ mode: 'no-watch' });
    });

    const callsAfter404 = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(fetchMock.mock.calls.length).toBe(callsAfter404);
  });

  it('reports watch status and calls onVersionChange on version bump', async () => {
    let version = 1;
    const onVersionChange = vi.fn();
    const fetchMock = vi.fn(async () =>
      statusResponse({ version, state: 'idle', lastError: null }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSnapshotStatus(onVersionChange));

    await waitFor(() => {
      expect(result.current).toEqual({
        mode: 'watch',
        version: 1,
        state: 'idle',
        lastError: null,
      });
    });
    expect(onVersionChange).not.toHaveBeenCalled();

    version = 2;
    fetchMock.mockImplementation(async () =>
      statusResponse({ version, state: 'building', lastError: null }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() => {
      expect(onVersionChange).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps polling on transient io failure', async () => {
    let failing = true;
    const fetchMock = vi.fn(async () => {
      if (failing) throw new TypeError('network down');
      return statusResponse({ version: 1, state: 'idle', lastError: null });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSnapshotStatus(vi.fn()));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    failing = false;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        mode: 'watch',
        version: 1,
        state: 'idle',
        lastError: null,
      });
    });
  });
});

describe('StatusIndicator', () => {
  it('renders nothing in no-watch mode', () => {
    const { container } = render(
      <StatusIndicator status={{ mode: 'no-watch' }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders building indicator while rebuilding', () => {
    render(
      <StatusIndicator status={{ mode: 'watch', version: 1, state: 'building', lastError: null }} />,
    );
    expect(screen.getByTestId('status-building')).toBeInTheDocument();
  });

  it('renders error banner with last build error', () => {
    render(
      <StatusIndicator
        status={{ mode: 'watch', version: 1, state: 'build-failed', lastError: 'error CS1002: ; expected' }}
      />,
    );
    expect(screen.getByTestId('status-failed')).toBeInTheDocument();
    expect(screen.getByText('error CS1002: ; expected')).toBeInTheDocument();
  });

  it('renders nothing when idle', () => {
    const { container } = render(
      <StatusIndicator status={{ mode: 'watch', version: 1, state: 'idle', lastError: null }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
