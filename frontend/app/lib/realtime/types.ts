// Realtime event types for FlowConsole SignalR integration

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

// --- Model-level events ---
// Wire: modelUpdated, irLoaded, graphRebuilt → ModelHub

export type ModelEventType = "ModelUpdated" | "IRLoaded" | "GraphRebuilt";

export type ModelEvent = {
  type: ModelEventType;
  modelId: string;
  source?: string;
  occurredAt: string;
  // IRLoaded
  elementCount?: number;
  relationshipCount?: number;
};

// --- Project-level events ---
// Wire: driftDetected, validationFailed, … → NotificationHub (project room)
// All payloads include modelId + occurredAt. No projectId on wire — events
// are already scoped to the project room via joinProjectRoom.

export type ProjectEventType =
  | "DriftDetected"
  | "ValidationFailed"
  | "ValidationPassed"
  | "ScanStarted"
  | "ScanCompleted"
  | "ScanFailed"
  | "ImportCompleted"
  | "MetricsComputed"
  | "AdrViolationDetected";

export type ProjectEvent = {
  type: ProjectEventType;
  modelId: string;
  occurredAt: string;
  // DriftDetected
  snapshotId?: string;
  scanSource?: string;
  driftScore?: number;
  // ValidationFailed
  runId?: string;
  failCount?: number;
  // ValidationPassed
  passCount?: number;
  // ScanStarted / ScanCompleted / ScanFailed
  scanId?: string;
  scanType?: string;
  error?: string;
  // ImportCompleted
  importId?: string;
  format?: string;
  elementsImported?: number;
  // MetricsComputed
  totalElements?: number;
  totalRelationships?: number;
  // AdrViolationDetected
  violations?: Array<{
    adrId: string;
    adrTitle: string;
    missingCanonicalIds: string[];
  }>;
};

export type RealtimeConfig = {
  hubUrl: string;
  accessToken?: () => string | Promise<string>;
};
