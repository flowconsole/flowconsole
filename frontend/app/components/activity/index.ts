/**
 * Activity module — operational activity rail for background job visibility.
 *
 * The rail aggregates sync, scan, IR load, and graph rebuild jobs into a single
 * chronological feed visible across all model workspace pages.
 */

export { ActivityRail } from "./activity-rail";
export type { ActivityRailProps } from "./activity-rail";
export { ActivityRailSlot } from "./activity-rail-slot";
