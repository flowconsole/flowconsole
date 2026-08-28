import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStatus } from '../../src/api';

describe('fetchStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns watch status on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ version: 3, state: 'building', lastError: null }), {
          status: 200,
        }),
      ),
    );

    const result = await fetchStatus();

    expect(result).toEqual({
      ok: true,
      data: { version: 3, state: 'building', lastError: null },
    });
  });

  it('maps 404 to no-watch sentinel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not found', { status: 404 })));

    const result = await fetchStatus();

    expect(result).toEqual({ ok: false, error: 'no-watch' });
  });

  it('maps non-ok to io-error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));

    const result = await fetchStatus();

    expect(result).toEqual({ ok: false, error: 'io-error' });
  });

  it('maps network failure to io-error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));

    const result = await fetchStatus();

    expect(result).toEqual({ ok: false, error: 'io-error' });
  });

  it('maps invalid JSON to parse-error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not json', { status: 200 })),
    );

    const result = await fetchStatus();

    expect(result).toEqual({ ok: false, error: 'parse-error' });
  });
});
