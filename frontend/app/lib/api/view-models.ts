/**
 * Frontend-facing view models and UI state shapes.
 *
 * Raw API request/response DTOs should come from the generated RTK/OpenAPI
 * layers under `lib/api/rtk/`.
 */

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export type MemberRole = "viewer" | "editor" | "admin";

export interface ProjectMember {
  userId: string;
  userName: string | null;
  email: string;
  role: MemberRole;
  joinedAt: string;
}

interface PathPatterns {
  dsl: string[];
  code: string[];
  infra: string[];
}

export type GitProviderType = "direct";

export interface DirectGitProviderConfig {
  type: "direct";
  username?: string;
  password?: string;
}

export type GitProviderConfig = DirectGitProviderConfig;

export interface GitConfig {
  repoUrl: string;
  branch: string;
  pathPatterns: PathPatterns;
  providerConfig: GitProviderConfig | null;
}

export interface UpdateGitConfigRequest {
  repoUrl?: string;
  branch?: string;
  pathPatterns?: PathPatterns;
  providerConfig?: GitProviderConfig | null;
}

export type SyncStatus = "pending" | "running" | "completed" | "failed";

export interface SyncError {
  message: string;
  file?: string;
  line?: number;
  source?: string;
}

export interface SyncRecord {
  id: string;
  modelId: string;
  status: SyncStatus;
  startedAt: string | null;
  completedAt: string | null;
  changedFiles: string[];
  affectedSourceScopes: string[];
  modelUpdatedAt: string | null;
  errors: SyncError[];
}

export type ElementSource =
  | "Git"
  | "CodeScan"
  | "InfraScan"
  | "Import"
  | "Observability";

/** Detail-level kinds hidden from Explorer by default (internal components, code-level artifacts). */
export const DETAIL_KINDS: ReadonlySet<string> = new Set([
  "Class",
  "Interface",
  "Endpoint",
  "Function",
  "Producer",
  "Consumer",
]);

export const ALL_ELEMENT_SOURCES: ElementSource[] = [
  "Git",
  "CodeScan",
  "InfraScan",
  "Import",
  "Observability",
];

export interface Element {
  id: string;
  modelId: string;
  canonicalId: string | null;
  kind: string;
  name: string;
  description: string | null;
  technology: string | null;
  source: ElementSource;
  parentId: string | null;
  tags: string[];
  properties: Record<string, unknown>;
}

export interface Relationship {
  id: string;
  modelId: string;
  kind: string;
  sourceElementId: string;
  targetElementId: string;
  label: string | null;
  technology: string | null;
  source: ElementSource;
  properties: Record<string, unknown>;
}

export type IrValidationSeverity = "error" | "warning" | "info";

export interface IrValidationIssue {
  severity: IrValidationSeverity;
  path?: string;
  message: string;
}

export interface IrValidationResult {
  valid: boolean;
  issues: IrValidationIssue[];
  elementCount: number;
  relationshipCount: number;
}

export interface ModelSummary {
  modelId: string;
  elementCount: number;
  relationshipCount: number;
  sourceBreakdown: Record<ElementSource, number>;
}

export type DriftItemBucket = "added" | "removed" | "changed";

export type DriftSeverity = "critical" | "high" | "medium" | "low";

export interface DriftItemChange {
  field: string;
  expected: string | null;
  actual: string | null;
}

export interface DriftItem {
  id: string;
  snapshotId: string;
  canonicalId: string;
  bucket: DriftItemBucket;
  elementName: string;
  elementType: string;
  source: ElementSource;
  severity: DriftSeverity;
  ownerTags: string[];
  changes: DriftItemChange[];
  linkedAdrId?: string;
}

export interface DriftSnapshotSummary {
  id: string;
  modelId: string;
  createdAt: string;
  driftScore: number;
  addedCount: number;
  removedCount: number;
  changedCount: number;
  totalDriftCount: number;
}

export interface DriftFilter {
  source?: ElementSource;
  severity?: DriftSeverity;
  elementType?: string;
  bucket?: DriftItemBucket;
}

export interface CanonicalMappingOverrideRequest {
  canonicalId: string;
  targetElementId: string;
  note?: string;
}

export type ValidationRuleSeverity = "high" | "medium" | "low" | "warning";

export type ValidationRuleCategory =
  | "structural"
  | "security"
  | "naming"
  | "dependency"
  | "custom";

export type ValidationRuleSource = "builtin" | "custom";

export interface FitnessFunction {
  id: string;
  name: string;
  description: string;
  category: ValidationRuleCategory;
  severity: ValidationRuleSeverity;
  source: ValidationRuleSource;
  rationale: string;
  remediationGuidance: string;
  isEnabled: boolean;
  createdAt?: string;
}

export interface ValidationViolation {
  id: string;
  runId: string;
  ruleId: string;
  ruleName: string;
  ruleCategory: ValidationRuleCategory;
  elementId: string;
  elementName: string;
  elementType: string;
  severity: ValidationRuleSeverity;
  message: string;
  details?: string;
}

export interface ValidationRunSummary {
  id: string;
  modelId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  totalRules: number;
  passedRules: number;
  violationCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface ValidationFilter {
  severity?: ValidationRuleSeverity;
  category?: ValidationRuleCategory;
  ruleId?: string;
}

export interface AnalyticsSummary {
  modelId: string;
  elementCount: number;
  relationshipCount: number;
  driftScore: number | null;
  validationStatus: "passed" | "failed" | "unknown";
  snapshotStatus: "fresh" | "stale" | "missing";
  snapshotAt: string | null;
}

export interface CouplingEntry {
  elementId: string;
  elementName: string;
  elementType: string;
  fanIn: number;
  fanOut: number;
  coupling: number;
}

export interface BottleneckEntry {
  elementId: string;
  elementName: string;
  elementType: string;
  degree: number;
  inDegree: number;
  outDegree: number;
  isCritical: boolean;
}

export interface SpofCandidate {
  elementId: string;
  elementName: string;
  elementType: string;
  dependentCount: number;
  hasRedundancy: boolean;
  riskScore: number;
}

export interface DependencyConcentration {
  elementId: string;
  elementName: string;
  elementType: string;
  dependencyCount: number;
  percentageOfTotal: number;
}
