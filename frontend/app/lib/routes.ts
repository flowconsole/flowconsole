/**
 * Centralized route definitions for FlowConsole product navigation.
 *
 * Route conventions:
 * - Vite SPA with React Router v7 — client-side routing only, no SSR
 * - Auth guard applied via ProtectedLayout wrapper in product/router.tsx
 * - Project routes: /projects, /projects/:projectId
 * - Model routes: /models/:modelId, /models/:modelId/explorer, etc.
 * - Dashboard: /dashboard (landing hub, not a parent for model routes)
 * - No locale prefix — i18n via react-i18next (language detection, no URL prefix)
 *
 */

export const routes = {
  home: "/",
  login: "/login",
  register: "/register",

  // Product hub
  dashboard: "/dashboard",

  // Projects
  projects: "/projects",
  projectOverview: (projectId: string) => `/projects/${projectId}`,
  projectSettings: (projectId: string) => `/projects/${projectId}/settings`,
  projectAdr: (projectId: string) => `/projects/${projectId}/adr`,
  projectNotifications: (projectId: string) =>
    `/projects/${projectId}/notifications`,

  // Models
  modelOverview: (modelId: string) => `/models/${modelId}`,
  modelExplorer: (modelId: string) => `/models/${modelId}/explorer`,
  modelEditor: (modelId: string) => `/models/${modelId}/editor`,
  modelQuery: (modelId: string) => `/models/${modelId}/query`,
  modelDrift: (modelId: string) => `/models/${modelId}/drift`,
  modelValidations: (modelId: string) => `/models/${modelId}/validations`,
  modelAnalytics: (modelId: string) => `/models/${modelId}/analytics`,
  modelAdr: (modelId: string) => `/models/${modelId}/adr`,
  modelExports: (modelId: string) => `/models/${modelId}/exports`,
  modelSettings: (modelId: string) => `/models/${modelId}/settings`,

  // Account settings
  settings: "/dashboard/settings",

  // Docs
  docs: "/docs",
} as const;
