import { useEffect, useRef, useState } from 'react';
import { fetchStatus, type WatchState } from '../api';

export type WatchStatusInfo =
  | { mode: 'no-watch' }
  | { mode: 'watch'; version: number; state: WatchState; lastError: string | null };

const POLL_INTERVAL_MS = 750;

/**
 * Polls the local viewer's /api/status endpoint while a watch session runs.
 * Returns 'no-watch' (polling disabled) when the endpoint answers 404 —
 * plain `fcon view` sessions do not serve it. Invokes `onVersionChange`
 * on every version bump so the caller can refetch the snapshot; the first
 * observed version does not trigger a refetch (the mount-time fetch owns it).
 */
export function useSnapshotStatus(onVersionChange: () => void): WatchStatusInfo {
  const [info, setInfo] = useState<WatchStatusInfo>({ mode: 'no-watch' });
  const versionRef = useRef<number | null>(null);
  const callbackRef = useRef(onVersionChange);
  callbackRef.current = onVersionChange;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const poll = async () => {
      const result = await fetchStatus();
      if (cancelled) return;

      if (!result.ok && result.error === 'no-watch') {
        stopPolling();
        setInfo({ mode: 'no-watch' });
        return;
      }

      if (!result.ok) {
        // Transient failure: keep polling, do not change mode.
        return;
      }

      setInfo({ mode: 'watch', ...result.data });

      const previous = versionRef.current;
      versionRef.current = result.data.version;
      if (previous !== null && previous !== result.data.version) {
        callbackRef.current();
      }
    };

    void poll();
    timer = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, []);

  return info;
}
