/**
 * FlowConsole API surface.
 *
 * Transport lives in RTK Query slices under `lib/api/rtk/`.
 * This barrel only keeps shared error/types exports for non-RTK consumers.
 */

export { ApiError } from "./error";
export type * from "./view-models";
