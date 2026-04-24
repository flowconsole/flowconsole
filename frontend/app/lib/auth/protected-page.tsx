
import { type ReactNode } from "react";
import { useAuth } from "./auth-context";
import type { ProductRole } from "./types";
import {
  AuthLoading,
  ForbiddenState,
  SessionExpired,
  SignInPrompt,
} from "@/components/auth";

/**
 * Page-level auth wrapper that renders appropriate auth state UIs.
 *
 * Usage:
 *   <ProtectedPage>
 *     <MyPageContent />
 *   </ProtectedPage>
 *
 *   <ProtectedPage requiredRole="editor">
 *     <EditContent />
 *   </ProtectedPage>
 */
export function ProtectedPage({
  children,
  requiredRole,
  resource,
}: {
  children: ReactNode;
  requiredRole?: ProductRole;
  resource?: string;
}) {
  const { state, hasRole } = useAuth();

  switch (state) {
    case "loading":
      return <AuthLoading />;
    case "anonymous":
      return <SignInPrompt />;
    case "expired":
      return <SessionExpired />;
    case "forbidden":
      return <ForbiddenState resource={resource} />;
    case "authorized":
      if (requiredRole && !hasRole(requiredRole)) {
        return <ForbiddenState resource={resource} />;
      }
      return <>{children}</>;
  }
}
