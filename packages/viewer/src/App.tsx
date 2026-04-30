import { useEffect, useState } from 'react';
import {
  ArchitectureDiagram,
  architectureNodeTypes,
  architectureEdgeTypes,
  mapSnapshotToDiagram,
  ThemeProvider,
} from '@flowconsole/web/architecture';
import type { ModelSnapshotWire } from '@flowconsole/web/architecture';
import type { ArchitectureDiagramModel } from '@flowconsole/web/architecture';
import { fetchSnapshot, type SnapshotError } from './api';
import '@xyflow/react/dist/style.css';
import '@flowconsole/web/style.css';
import './styles.css';

type ViewState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; error: SnapshotError }
  | { kind: 'happy'; model: ArchitectureDiagramModel; snapshot: ModelSnapshotWire };

const ERROR_MESSAGES: Record<SnapshotError, { title: string; detail: string }> = {
  'not-found': { title: 'Snapshot not found', detail: 'The snapshot file was not found. Run fcon scan or fcon build first.' },
  'too-large': { title: 'Snapshot too large', detail: 'The snapshot exceeds the maximum allowed size.' },
  'parse-error': { title: 'Invalid snapshot', detail: 'The snapshot file contains invalid JSON.' },
  'io-error': { title: 'Connection error', detail: 'Could not reach the viewer server.' },
};

export default function App() {
  const [state, setState] = useState<ViewState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchSnapshot().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState({ kind: 'error', error: result.error });
        return;
      }
      if (result.data.elements.length === 0) {
        setState({ kind: 'empty' });
        return;
      }
      setState({
        kind: 'happy',
        model: mapSnapshotToDiagram(result.data),
        snapshot: result.data,
      });
    }).catch(() => {
      if (!cancelled) setState({ kind: 'error', error: 'io-error' });
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <ThemeProvider>
      <div className="viewer-topbar">
        {state.kind === 'happy' && (
          <>
            <span className="viewer-topbar-badge">{state.snapshot.source}</span>
            <span className="viewer-topbar-count">{state.snapshot.elements.length} elements</span>
          </>
        )}
      </div>
      {state.kind === 'loading' && (
        <div className="viewer-status" data-testid="loading">
          <div className="viewer-status-title">Loading snapshot...</div>
        </div>
      )}
      {state.kind === 'empty' && (
        <div className="viewer-status" data-testid="empty">
          <div className="viewer-status-title">Empty snapshot</div>
          <div>The snapshot contains no elements.</div>
        </div>
      )}
      {state.kind === 'error' && (
        <div className="viewer-status" data-testid={`error-${state.error}`}>
          <div className="viewer-status-title">{ERROR_MESSAGES[state.error].title}</div>
          <div>{ERROR_MESSAGES[state.error].detail}</div>
        </div>
      )}
      {state.kind === 'happy' && (
        <div className="viewer-diagram">
          <ArchitectureDiagram
            model={state.model}
            nodeTypes={architectureNodeTypes}
            edgeTypes={architectureEdgeTypes}
            editable={false}
            autoLayout={true}
          />
        </div>
      )}
    </ThemeProvider>
  );
}
