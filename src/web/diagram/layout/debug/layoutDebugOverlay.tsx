import type { LayoutRunDiagnostics } from '../layoutPipeline';

type LayoutDebugOverlayProps = {
  diagnostics: LayoutRunDiagnostics;
};

const ROLE_COLORS: Record<string, string> = {
  entry: '#22c55e',
  store: '#3b82f6',
  gateway: '#f97316',
  processor: '#6b7280',
  worker: '#8b5cf6',
  queue: '#eab308',
  frontend: '#06b6d4',
  external: '#ef4444',
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

function summarizeRoles(nodeRoles: ReadonlyMap<string, string> | undefined) {
  if (!nodeRoles || nodeRoles.size === 0) {
    return null;
  }

  const counts = new Map<string, number>();
  for (const role of nodeRoles.values()) {
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([role, count]) => ({ role, count }));
}

export function LayoutDebugOverlay({ diagnostics }: LayoutDebugOverlayProps) {
  const roleSummary = summarizeRoles(diagnostics.nodeRoles);
  const overrides = diagnostics.containerOverrides;

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

      {roleSummary && (
        <div data-testid="debug-node-roles" style={{ fontSize: 12 }}>
          <div style={{ opacity: 0.7, marginBottom: 4 }}>Node Roles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {roleSummary.map(({ role, count }) => (
              <span
                key={role}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: `${ROLE_COLORS[role] ?? '#6b7280'}22`,
                  border: `1px solid ${ROLE_COLORS[role] ?? '#6b7280'}44`,
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: ROLE_COLORS[role] ?? '#6b7280',
                  }}
                />
                {role} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {overrides && overrides.size > 0 && (
        <div data-testid="debug-container-overrides" style={{ fontSize: 12 }}>
          <div style={{ opacity: 0.7, marginBottom: 4 }}>Container Overrides</div>
          {Array.from(overrides.entries()).map(([id, override]) => (
            <div key={id} style={{ fontSize: 11, padding: '1px 0' }}>
              {id}: {override.strategy} {override.direction}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--diagram-text-muted)' }}>
        {summarizeQuality(diagnostics)}
      </div>
    </div>
  );
}

export default LayoutDebugOverlay;
