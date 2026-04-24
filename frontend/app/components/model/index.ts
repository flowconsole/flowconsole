/**
 * Model module — model overview, model cards, status chips, and model-scoped page composition.
 *
 * Owns: /models/[modelId] page composition, model status display, model list items,
 *       inspector panels for element/relationship detail.
 * Does NOT own: graph canvas rendering (see `diagram/`), DSL editing (see flowconsole/).
 */

export {
  ModelCard,
  ModelCardGrid,
  ModelListRow,
  type ModelCardStatus,
} from "./model-card";

export {
  SourceFreshnessChip,
  DriftStatusChip,
  ValidationStatusChip,
  type SourceFreshness,
  type DriftStatus,
  type ValidationStatus,
} from "./model-status-chip";

export { ModelOverviewSkeleton } from "./model-overview-skeleton";
