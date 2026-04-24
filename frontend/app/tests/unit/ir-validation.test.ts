// @vitest-environment node
import { describe, it, expect } from "vitest";
import { validateIrDocument, parseIrJson } from "@/lib/ir-validation";

const VALID_SNAPSHOT = {
  elements: [
    { kind: "Service", name: "Auth Service", canonicalId: "auth-service" },
    { kind: "Service", name: "API Gateway", canonicalId: "api-gateway" },
  ],
  relationships: [
    {
      kind: "Calls",
      sourceId: "api-gateway",
      targetId: "auth-service",
    },
  ],
};

describe("validateIrDocument", () => {
  it("accepts a valid snapshot document", () => {
    const result = validateIrDocument(VALID_SNAPSHOT);
    expect(result.valid).toBe(true);
    expect(result.elementCount).toBe(2);
    expect(result.relationshipCount).toBe(1);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("rejects non-object input", () => {
    const result = validateIrDocument("not an object");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("rejects array input", () => {
    const result = validateIrDocument([]);
    expect(result.valid).toBe(false);
  });

  it("rejects null input", () => {
    const result = validateIrDocument(null);
    expect(result.valid).toBe(false);
  });

  it("errors when elements is not an array", () => {
    const result = validateIrDocument({ ...VALID_SNAPSHOT, elements: "not-array" });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === "elements" && i.severity === "error")).toBe(true);
  });

  it("errors when an element is missing kind", () => {
    const result = validateIrDocument({
      ...VALID_SNAPSHOT,
      elements: [{ name: "No Kind" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path?.includes("kind") && i.severity === "error")).toBe(true);
  });

  it("warns for unknown element kind", () => {
    const result = validateIrDocument({
      ...VALID_SNAPSHOT,
      elements: [{ kind: "UnknownKind", name: "Test" }],
    });
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.path?.includes("kind") && i.severity === "warning")).toBe(true);
  });

  it("errors when an element is missing name", () => {
    const result = validateIrDocument({
      ...VALID_SNAPSHOT,
      elements: [{ kind: "Service" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path?.includes("name") && i.severity === "error")).toBe(true);
  });

  it("warns when elements lack canonicalId", () => {
    const result = validateIrDocument({
      ...VALID_SNAPSHOT,
      elements: [{ kind: "Service", name: "No Canonical" }],
    });
    expect(result.valid).toBe(true); // warning only
    expect(result.issues.some((i) => i.severity === "warning" && i.message.includes("canonicalId"))).toBe(true);
  });

  it("errors when relationships is not an array", () => {
    const result = validateIrDocument({ ...VALID_SNAPSHOT, relationships: null });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === "relationships" && i.severity === "error")).toBe(true);
  });

  it("errors when a relationship is missing kind", () => {
    const result = validateIrDocument({
      ...VALID_SNAPSHOT,
      relationships: [{ sourceId: "a", targetId: "b" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path?.includes("kind") && i.severity === "error")).toBe(true);
  });

  it("warns for unknown relationship kind", () => {
    const result = validateIrDocument({
      ...VALID_SNAPSHOT,
      relationships: [{ kind: "UnknownRel", sourceId: "a", targetId: "b" }],
    });
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.path?.includes("kind") && i.severity === "warning")).toBe(true);
  });

  it("errors when a relationship is missing sourceId", () => {
    const result = validateIrDocument({
      ...VALID_SNAPSHOT,
      relationships: [{ kind: "Calls", targetId: "b" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path?.includes("sourceId") && i.severity === "error")).toBe(true);
  });

  it("errors when a relationship is missing targetId", () => {
    const result = validateIrDocument({
      ...VALID_SNAPSHOT,
      relationships: [{ kind: "Calls", sourceId: "a" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path?.includes("targetId") && i.severity === "error")).toBe(true);
  });

  it("counts elements and relationships correctly", () => {
    const result = validateIrDocument(VALID_SNAPSHOT);
    expect(result.elementCount).toBe(2);
    expect(result.relationshipCount).toBe(1);
  });

  it("handles empty arrays", () => {
    const result = validateIrDocument({
      elements: [],
      relationships: [],
    });
    expect(result.valid).toBe(true);
    expect(result.elementCount).toBe(0);
    expect(result.relationshipCount).toBe(0);
  });
});

describe("parseIrJson", () => {
  it("parses valid JSON", () => {
    const { parsed, parseError } = parseIrJson('{"key": "value"}');
    expect(parseError).toBeNull();
    expect(parsed).toEqual({ key: "value" });
  });

  it("returns parseError for invalid JSON", () => {
    const { parsed, parseError } = parseIrJson("{ not valid json");
    expect(parsed).toBeNull();
    expect(parseError).toBeTruthy();
    expect(typeof parseError).toBe("string");
  });

  it("parses arrays", () => {
    const { parsed, parseError } = parseIrJson("[1, 2, 3]");
    expect(parseError).toBeNull();
    expect(parsed).toEqual([1, 2, 3]);
  });
});
