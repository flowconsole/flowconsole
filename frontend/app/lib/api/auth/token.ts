const ACCESS_KEY = "fc_access_token";
const REFRESH_KEY = "fc_refresh_token";

function storage(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function setTokens(access: string, refresh: string): void {
  storage()?.setItem(ACCESS_KEY, access);
  storage()?.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  storage()?.removeItem(ACCESS_KEY);
  storage()?.removeItem(REFRESH_KEY);
}

export function getAccessToken(): Promise<string | null> {
  return Promise.resolve(readAccessToken());
}

export function getRefreshToken(): string | null {
  return storage()?.getItem(REFRESH_KEY) ?? null;
}

export function readAccessToken(): string | null {
  return storage()?.getItem(ACCESS_KEY) ?? null;
}

export function hasTokens(): boolean {
  return Boolean(storage()?.getItem(ACCESS_KEY));
}
