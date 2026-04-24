import { describe, it, expect } from "vitest";
import type {
  ConnectionState,
  ModelEvent,
  ModelEventType,
  ProjectEvent,
  ProjectEventType,
} from "@/lib/realtime/types";

describe("realtime types", () => {
  it("ConnectionState values are assignable", () => {
    const states: ConnectionState[] = [
      "disconnected",
      "connecting",
      "connected",
      "reconnecting",
      "offline",
    ];
    expect(states).toHaveLength(5);
  });

  it("ModelEvent has required fields", () => {
    const event: ModelEvent = {
      type: "ModelUpdated",
      modelId: "model-1",
      occurredAt: new Date().toISOString(),
      source: "git",
    };
    expect(event.type).toBe("ModelUpdated");
    expect(event.modelId).toBe("model-1");
  });

  it("all ModelEventTypes are valid", () => {
    const types: ModelEventType[] = ["ModelUpdated", "IRLoaded", "GraphRebuilt"];
    expect(types).toHaveLength(3);
  });

  it("ProjectEvent has required fields matching backend wire format", () => {
    const event: ProjectEvent = {
      type: "DriftDetected",
      modelId: "model-1",
      occurredAt: new Date().toISOString(),
      driftScore: 0.42,
    };
    expect(event.type).toBe("DriftDetected");
    expect(event.driftScore).toBe(0.42);
  });

  it("all ProjectEventTypes are valid", () => {
    const types: ProjectEventType[] = [
      "DriftDetected",
      "ValidationFailed",
      "ValidationPassed",
      "ScanStarted",
      "ScanCompleted",
      "ScanFailed",
      "ImportCompleted",
      "MetricsComputed",
      "AdrViolationDetected",
    ];
    expect(types).toHaveLength(9);
  });

  it("ModelEvent optional fields are optional", () => {
    const minimal: ModelEvent = {
      type: "GraphRebuilt",
      modelId: "m1",
      occurredAt: "2026-01-01T00:00:00Z",
    };
    expect(minimal.source).toBeUndefined();
    expect(minimal.elementCount).toBeUndefined();
    expect(minimal.relationshipCount).toBeUndefined();
  });

  it("ProjectEvent optional fields are optional", () => {
    const minimal: ProjectEvent = {
      type: "MetricsComputed",
      modelId: "m1",
      occurredAt: "2026-01-01T00:00:00Z",
    };
    expect(minimal.driftScore).toBeUndefined();
    expect(minimal.scanId).toBeUndefined();
  });

  it("ScanFailed event uses error field (not errorMessage)", () => {
    const event: ProjectEvent = {
      type: "ScanFailed",
      modelId: "m1",
      occurredAt: "2026-01-01T00:00:00Z",
      scanId: "scan-1",
      scanType: "CodeScan",
      error: "Parser failed",
    };
    expect(event.error).toBe("Parser failed");
  });
});
