
import { type ReactNode } from "react";
import { useAuth } from "./auth-context";
import type { ProductRole } from "./types";

/**
 * Renders children only when the user is authenticated.
 * Shows `fallback` during loading, and `unauthorized` when not signed in.
 */
export function RequireAuth({
  children,
  fallback,
  unauthorized,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  unauthorized?: ReactNode;
}) {
  const { state } = useAuth();

  if (state === "loading") {
    return <>{fallback ?? null}</>;
  }

  if (state !== "authorized") {
    return <>{unauthorized ?? null}</>;
  }

  return <>{children}</>;
}

/**
 * Renders children only when the authenticated user meets the minimum role.
 * Shows `forbidden` content when the user lacks the required role.
 */
export function RequireRole({
  role,
  children,
  fallback,
  forbidden,
}: {
  role: ProductRole;
  children: ReactNode;
  fallback?: ReactNode;
  forbidden?: ReactNode;
}) {
  const { state, hasRole } = useAuth();

  if (state === "loading") {
    return <>{fallback ?? null}</>;
  }

  if (state !== "authorized") {
    return <>{forbidden ?? null}</>;
  }

  if (!hasRole(role)) {
    return <>{forbidden ?? null}</>;
  }

  return <>{children}</>;
}

/**
 * Conditionally renders content based on auth state.
 * Useful for showing different UI to different auth states without nesting guards.
 */
export function AuthSwitch({
  anonymous,
  loading,
  authorized,
  expired,
  forbidden,
}: {
  anonymous?: ReactNode;
  loading?: ReactNode;
  authorized?: ReactNode;
  expired?: ReactNode;
  forbidden?: ReactNode;
}) {
  const { state } = useAuth();

  switch (state) {
    case "anonymous":
      return <>{anonymous ?? null}</>;
    case "loading":
      return <>{loading ?? null}</>;
    case "authorized":
      return <>{authorized ?? null}</>;
    case "expired":
      return <>{expired ?? null}</>;
    case "forbidden":
      return <>{forbidden ?? null}</>;
  }
}
