import type { LayoutRunDiagnostics } from '../layoutPipeline';

type LayoutDebugOverlayProps = {
  diagnostics: LayoutRunDiagnostics;
};

function summarizeQuality(diagnostics: LayoutRunDiagnostics) {
  const qualityFlags = Object.entries(diagnostics.qualityScore)
    .filter(([metric, value]) => (metric.endsWith('Score') ? value < 0.7 : value > 0))
    .slice(0, 3)
    .map(([metric, value]) => `${metric}: ${value}`);

  if (qualityFlags.length === 0) {
    return 'clean';
  }

  return qualityFlags.join(' · ');
}

export function LayoutDebugOverlay({ diagnostics }: LayoutDebugOverlayProps) {
  return (
    <div
      data-testid="layout-debug-overlay"
      style={{
        minWidth: 240,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--diagram-surface)',
        color: 'var(--diagram-text)',
        border: '1px solid var(--diagram-border)',
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: 'var(--diagram-card-shadow)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <strong style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Layout Debug
        </strong>
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          Q {diagnostics.qualityValue.toFixed(2)}
        </span>
      </div>
      <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }}>
        <span style={{ opacity: 0.7 }}>Notation</span>
        <span>{diagnostics.notation}</span>
        <span style={{ opacity: 0.7 }}>Direction</span>
        <span>{diagnostics.direction}</span>
        <span style={{ opacity: 0.7 }}>Strategy</span>
        <span>{diagnostics.strategy}</span>
        <span style={{ opacity: 0.7 }}>Reason</span>
        <span>{diagnostics.reason}</span>
        <span style={{ opacity: 0.7 }}>Engine</span>
        <span>{diagnostics.fallbackEngineUsed ? `${diagnostics.engine} fallback` : diagnostics.engine}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--diagram-text-muted)' }}>
        {summarizeQuality(diagnostics)}
      </div>
    </div>
  );
}

export default LayoutDebugOverlay;
