import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { clearTokens, hasTokens, setTokens } from "@/lib/api/auth";
import { useLazyGetCurrentUserQuery } from "@/lib/api/rtk/auth-api";
import {
  identifyOpenReplayUser,
  setOpenReplayUserMetadata,
} from "@/lib/analytics/openreplay";

import type { AuthState, AuthUser, ProductRole } from "./types";
import { hasMinimumRole } from "./types";

interface AuthContextValue {
  state: AuthState;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (required: ProductRole) => boolean;
  /** Store tokens and fetch user profile — transitions state to "authorized". */
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  /** Clear tokens and reset state to "anonymous". */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fetchCurrentUser] = useLazyGetCurrentUserQuery();

  const fetchProfile = useCallback(async () => {
    const profile = await fetchCurrentUser().unwrap();
    const authUser: AuthUser = {
      id: profile.id,
      email: profile.email,
      name: profile.displayName ?? profile.email,
      role: profile.role as ProductRole,
    };
    setUser(authUser);
    setAuthState("authorized");
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (hasTokens()) {
      fetchProfile().catch(() => {
        // baseQueryWithReauth already attempted token refresh on 401,
        // so if we still fail the session is truly expired.
        clearTokens();
        setAuthState("expired");
        setUser(null);
      });
    } else {
      setAuthState("anonymous");
      setUser(null);
    }
  }, [fetchProfile]);

  useEffect(() => {
    identifyOpenReplayUser(user?.email);
    setOpenReplayUserMetadata({
      role: user?.role,
    });
  }, [user]);

  const login = useCallback(
    async (accessToken: string, refreshToken: string) => {
      setTokens(accessToken, refreshToken);
      await fetchProfile();
    },
    [fetchProfile],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setAuthState("anonymous");
  }, []);

  const hasRole = useCallback(
    (required: ProductRole): boolean => {
      if (!user) return false;
      return hasMinimumRole(user.role, required);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      state: authState,
      user,
      isLoading: authState === "loading",
      isAuthenticated: authState === "authorized",
      hasRole,
      login,
      logout,
    }),
    [authState, user, hasRole, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state from any client component.
 *
 * Must be used within an `<AuthProvider>`.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
