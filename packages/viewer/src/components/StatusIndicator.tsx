import type { WatchStatusInfo } from '../hooks/useSnapshotStatus';

/**
 * Watch-session status surface: a subtle building indicator while a rebuild
 * runs and an error banner when the last rebuild failed. Absent entirely in
 * plain `fcon view` sessions (no watch status endpoint).
 */
export function StatusIndicator({ status }: { status: WatchStatusInfo }) {
  if (status.mode === 'no-watch') {
    return null;
  }

  if (status.state === 'building') {
    return (
      <div className="viewer-status-indicator viewer-status-indicator--building" data-testid="status-building">
        Rebuilding...
      </div>
    );
  }

  if (status.state === 'build-failed') {
    return (
      <div className="viewer-status-indicator viewer-status-indicator--failed" data-testid="status-failed" role="alert">
        <span className="viewer-status-indicator-title">Build failed</span>
        {status.lastError && <span className="viewer-status-indicator-detail">{status.lastError}</span>}
      </div>
    );
  }

  return null;
}
