import { env } from "@/env.mjs";

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function buildUrl(baseUrl: string, path: string): string {
  return new URL(path, withTrailingSlash(baseUrl)).toString();
}

export function getBackendBaseUrl(): string {
  return env.VITE_BACKEND_URL;
}

export function getModelHubUrl(): string {
  return buildUrl(getBackendBaseUrl(), "/hubs/model");
}

export function getNotificationHubUrl(): string {
  return buildUrl(getBackendBaseUrl(), "/hubs/notifications");
}

export function getAppBaseUrl(): string {
  return env.VITE_APP_URL;
}

export function buildAppUrl(path: string): string {
  return buildUrl(getAppBaseUrl(), path);
}

export function getWebsiteBaseUrl(): string {
  return env.VITE_WEBSITE_URL;
}

export function buildWebsiteUrl(path: string): string {
  return buildUrl(getWebsiteBaseUrl(), path);
}
