import type { RelayoutReason } from '../types';
import type { LayoutRunDiagnostics } from '../layoutPipeline';

const relayoutEvents: LayoutRunDiagnostics[] = [];

export function logRelayoutRun(diagnostics: LayoutRunDiagnostics, enabled = false) {
  relayoutEvents.push(diagnostics);
  if (relayoutEvents.length > 50) {
    relayoutEvents.shift();
  }

  if (enabled) {
    // Keep debug output compact because layout runs often.
    console.debug('[layout]', {
      reason: diagnostics.reason,
      cacheHit: diagnostics.cacheHit,
      strategy: diagnostics.strategy,
      direction: diagnostics.direction,
      engine: diagnostics.engine,
      fallbackEngineUsed: diagnostics.fallbackEngineUsed,
      qualityValue: diagnostics.qualityValue,
    });
  }

  return diagnostics;
}

export function getRelayoutLog() {
  return [...relayoutEvents];
}

export function clearRelayoutLog() {
  relayoutEvents.length = 0;
}

export function toRelayoutReason(reason: RelayoutReason | undefined) {
  return reason ?? 'cache_miss';
}
