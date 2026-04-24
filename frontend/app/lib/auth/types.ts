/**
 * Auth types aligned with the OSS ASP.NET backend role model.
 *
 * The backend issues JWTs with role claims: "viewer", "editor", "admin".
 * These types provide a frontend-side mirror for role-based access control,
 * keeping the Prisma-era "ADMIN"/"USER" enum separate from the product auth model.
 */

/** Core product roles from ASP.NET Identity (OSS backend). */
export type ProductRole = "viewer" | "editor" | "admin";

/** All product roles ordered by ascending privilege level. */
export const PRODUCT_ROLES: readonly ProductRole[] = [
  "viewer",
  "editor",
  "admin",
] as const;

/**
 * Navigation/session state machine for auth-aware UI.
 *
 * - anonymous:   no token, show sign-in prompts
 * - loading:     token check in progress
 * - authorized:  valid session, user profile available
 * - expired:     session was valid but token expired / refresh failed
 * - forbidden:   valid session but insufficient permissions for the resource
 */
export type AuthState =
  | "anonymous"
  | "loading"
  | "authorized"
  | "expired"
  | "forbidden";

/** Authenticated user profile surfaced to the UI. */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: ProductRole;
}

/**
 * Returns true if `userRole` meets or exceeds the `requiredRole` in the
 * product role hierarchy (viewer < editor < admin).
 */
export function hasMinimumRole(
  userRole: ProductRole,
  requiredRole: ProductRole,
): boolean {
  return PRODUCT_ROLES.indexOf(userRole) >= PRODUCT_ROLES.indexOf(requiredRole);
}

