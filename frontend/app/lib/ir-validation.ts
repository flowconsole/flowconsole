/**
 * Client-side validation for FlowConsole model snapshot documents.
 *
 * Validates structure and required fields; emits errors and warnings without
 * touching any backend. Real schema enforcement happens server-side.
 */

import { ALL_ELEMENT_SOURCES } from "./api/view-models";
import type {
  IrValidationIssue,
  IrValidationResult,
} from "./api/view-models";

/** Valid ElementKind values (must match backend enum) */
const VALID_ELEMENT_KINDS = new Set([
  "Class", "Interface", "Endpoint", "Function", "Producer", "Consumer",
  "Deployment", "Database", "Queue", "Cache", "Ingress", "Namespace",
  "Service", "Application", "Module", "External", "Gateway", "Worker",
]);

/** Valid RelationKind values (must match backend enum) */
const VALID_RELATION_KINDS = new Set([
  "Contains", "DeployedOn", "Uses", "Calls", "DependsOn",
  "Imports", "Implements", "Produces", "Consumes", "Exposes", "RoutesTo",
]);

/**
 * Validate a parsed model snapshot document object.
 * Returns errors (blocking) and warnings (non-blocking) with path pointers.
 */
export function validateIrDocument(json: unknown): IrValidationResult {
  const issues: IrValidationIssue[] = [];
  let elementCount = 0;
  let relationshipCount = 0;

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    issues.push({ severity: "error", message: "Snapshot must be a JSON object at the top level." });
    return { valid: false, issues, elementCount, relationshipCount };
  }

  const doc = json as Record<string, unknown>;

  // elements
  if (!Array.isArray(doc.elements)) {
    issues.push({
      severity: "error",
      path: "elements",
      message: "elements must be an array.",
    });
  } else {
    elementCount = doc.elements.length;
    let withoutCanonical = 0;
    for (let i = 0; i < doc.elements.length; i++) {
      const el = doc.elements[i] as Record<string, unknown>;
      if (!el || typeof el !== "object") {
        issues.push({ severity: "error", path: `elements[${i}]`, message: `Element at index ${i} is not an object.` });
        continue;
      }
      if (!el.kind || typeof el.kind !== "string") {
        issues.push({ severity: "error", path: `elements[${i}].kind`, message: `Element at index ${i} is missing kind.` });
      } else if (!VALID_ELEMENT_KINDS.has(el.kind)) {
        issues.push({ severity: "warning", path: `elements[${i}].kind`, message: `Element at index ${i} has unknown kind "${el.kind}".` });
      }
      if (!el.name || typeof el.name !== "string") {
        issues.push({ severity: "error", path: `elements[${i}].name`, message: `Element at index ${i} is missing name.` });
      }
      if (!el.canonicalId) {
        withoutCanonical++;
      }
    }
    if (withoutCanonical > 0) {
      issues.push({
        severity: "warning",
        message: `${withoutCanonical} element(s) have no canonicalId — deduplication against other sources will be limited.`,
      });
    }
  }

  // relationships
  if (!Array.isArray(doc.relationships)) {
    issues.push({
      severity: "error",
      path: "relationships",
      message: "relationships must be an array.",
    });
  } else {
    relationshipCount = doc.relationships.length;
    for (let i = 0; i < doc.relationships.length; i++) {
      const rel = doc.relationships[i] as Record<string, unknown>;
      if (!rel || typeof rel !== "object") {
        issues.push({ severity: "error", path: `relationships[${i}]`, message: `Relationship at index ${i} is not an object.` });
        continue;
      }
      if (!rel.kind || typeof rel.kind !== "string") {
        issues.push({ severity: "error", path: `relationships[${i}].kind`, message: `Relationship at index ${i} is missing kind.` });
      } else if (!VALID_RELATION_KINDS.has(rel.kind)) {
        issues.push({ severity: "warning", path: `relationships[${i}].kind`, message: `Relationship at index ${i} has unknown kind "${rel.kind}".` });
      }
      if (!rel.sourceId || typeof rel.sourceId !== "string") {
        issues.push({ severity: "error", path: `relationships[${i}].sourceId`, message: `Relationship at index ${i} is missing sourceId.` });
      }
      if (!rel.targetId || typeof rel.targetId !== "string") {
        issues.push({ severity: "error", path: `relationships[${i}].targetId`, message: `Relationship at index ${i} is missing targetId.` });
      }
    }
  }

  const valid = issues.filter((i) => i.severity === "error").length === 0;
  return { valid, issues, elementCount, relationshipCount };
}

/**
 * Parse a JSON string. Returns the parsed value or a parse error message.
 */
export function parseIrJson(text: string): { parsed: unknown; parseError: string | null } {
  try {
    return { parsed: JSON.parse(text), parseError: null };
  } catch (e) {
    return { parsed: null, parseError: e instanceof Error ? e.message : "Invalid JSON" };
  }
}
