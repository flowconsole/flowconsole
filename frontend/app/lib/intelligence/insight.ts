/**
 * Shared insight model for cross-surface intelligence navigation.
 *
 * InsightRef is a unified pointer to any findable entity within an intelligence
 * surface (query result, drift item, validation violation, analytics hotspot).
 * URL builder helpers translate refs into navigable destinations without
 * requiring each surface to know about others.
 */

export type InsightSource = "query" | "drift" | "validation" | "analytics";

export interface InsightRef {
  /** Which intelligence surface produced this insight */
  source: InsightSource;
  /** The model this insight belongs to */
  modelId: string;
  /** ID of the architectural element or entity */
  entityId: string;
  /** Human-readable name */
  entityName: string;
  /** Element type (service, database, etc.) */
  entityType?: string;
  /** Short label for the insight (e.g., rule name, drift bucket) */
  label?: string;
  /** Human-readable context (e.g., "Violates: No Direct DB Access") */
  context?: string;
}

/**
 * Deep-link an element into the explorer focus view.
 * Produces: /models/{modelId}/explorer?element={entityId}
 */
export function buildExplorerFocusUrl(modelId: string, entityId: string): string {
  return `/models/${encodeURIComponent(modelId)}/explorer?element=${encodeURIComponent(entityId)}`;
}

/**
 * Build a URL to the drift center for a model, optionally selecting a snapshot.
 */
export function buildDriftUrl(modelId: string, snapshotId?: string): string {
  const base = `/models/${encodeURIComponent(modelId)}/drift`;
  return snapshotId ? `${base}?snapshot=${encodeURIComponent(snapshotId)}` : base;
}

/**
 * Build a URL to the validation center for a model, optionally selecting a run.
 */
export function buildValidationUrl(modelId: string, runId?: string): string {
  const base = `/models/${encodeURIComponent(modelId)}/validations`;
  return runId ? `${base}?run=${encodeURIComponent(runId)}` : base;
}

/**
 * Build a URL to the analytics workspace for a model, optionally with a tab.
 */
export function buildAnalyticsUrl(modelId: string, tab?: string): string {
  const base = `/models/${encodeURIComponent(modelId)}/analytics`;
  return tab ? `${base}?tab=${encodeURIComponent(tab)}` : base;
}
