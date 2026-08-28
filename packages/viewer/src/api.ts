import type { ModelSnapshotWire } from '@flowconsole/web/architecture';

export type SnapshotError = 'not-found' | 'too-large' | 'parse-error' | 'io-error';

export type SnapshotResult =
  | { ok: true; data: ModelSnapshotWire }
  | { ok: false; error: SnapshotError };

export type WatchState = 'idle' | 'building' | 'build-failed';

export type WatchStatus = {
  version: number;
  state: WatchState;
  lastError: string | null;
};

export type StatusResult =
  | { ok: true; data: WatchStatus }
  | { ok: false; error: 'no-watch' | 'parse-error' | 'io-error' };

export async function fetchSnapshot(): Promise<SnapshotResult> {
  let response: Response;
  try {
    response = await fetch('/api/snapshot');
  } catch {
    return { ok: false, error: 'io-error' };
  }

  if (response.status === 404) return { ok: false, error: 'not-found' };
  if (response.status === 413) return { ok: false, error: 'too-large' };
  if (!response.ok) return { ok: false, error: 'io-error' };

  try {
    const data = (await response.json()) as ModelSnapshotWire;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'parse-error' };
  }
}

export async function fetchStatus(): Promise<StatusResult> {
  let response: Response;
  try {
    response = await fetch('/api/status');
  } catch {
    return { ok: false, error: 'io-error' };
  }

  if (response.status === 404) return { ok: false, error: 'no-watch' };
  if (!response.ok) return { ok: false, error: 'io-error' };

  try {
    const data = (await response.json()) as WatchStatus;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'parse-error' };
  }
}
