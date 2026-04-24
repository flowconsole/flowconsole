import { type TFunction } from "i18next";

import { type NavItem, type SidebarNavItem } from "types";
import type { ProductRole } from "@/lib/auth/types";

// Home sidebar — project/model-oriented workspace navigation (OSS product routes)
export function homeSidebarLinks(t: TFunction): SidebarNavItem[] {
  return [
    {
      title: t("nav:sectionWorkspace"),
      items: [
        { href: "/dashboard", icon: "dashboard", title: t("nav:dashboard") },
        { href: "/projects", icon: "projects", title: t("nav:projects") },
      ],
    },
  ];
}

/**
 * Model sidebar — shown when a model is active.
 *
 * The `authorizeOnly` field uses ASP.NET product roles (viewer/editor/admin)
 * for frontend visibility filtering.
 */
export function getModelSidebarLinks(
  modelId: string,
  t: TFunction,
): SidebarNavItem[] {
  const base = modelId ? `/models/${encodeURIComponent(modelId)}` : "/models";
  return [
    {
      title: t("nav:sectionModel"),
      items: [
        {
          href: base,
          icon: "workbench",
          title: t("nav:overview"),
        },
        {
          href: `${base}/editor`,
          icon: "workbench",
          title: t("nav:editor"),
        },
        {
          href: `${base}/explorer`,
          icon: "explorer",
          title: t("nav:explorer"),
        },
        {
          href: `${base}/settings`,
          icon: "settings",
          title: t("nav:settings"),
        },
      ],
    },
    {
      title: t("nav:sectionAnalysis"),
      items: [
        {
          href: `${base}/drift`,
          icon: "drift",
          title: t("nav:driftCenter"),
        },
        {
          href: `${base}/validations`,
          icon: "validations",
          title: t("nav:validations"),
        },
        {
          href: `${base}/analytics`,
          icon: "analytics",
          title: t("nav:analytics"),
        },
      ],
    },
  ];
}

/**
 * Minimum role required for specific route patterns (OSS product roles).
 * Used by auth guards to determine access before rendering page content.
 */
export const routeRoleRequirements: Record<string, ProductRole> = {} as const;

// Items for the user account dropdown
export const accountMenuItems: NavItem[] = [
  { href: "/dashboard/settings", icon: "settings", title: "Settings" },
  { href: "/docs", icon: "bookOpen", title: "Documentation" },
];

// All sidebar links combined — used by SearchCommand for full navigation
// Note: uses English fallback labels for search indexing
export function allSidebarLinks(t: TFunction): SidebarNavItem[] {
  return [...homeSidebarLinks(t), ...getModelSidebarLinks("", t)];
}

// Quick actions for the command palette
export type QuickAction = {
  id: string;
  title: string;
  icon: keyof typeof import("@/components/shared/icons").Icons;
  keywords?: string[];
};

export const quickActions: QuickAction[] = [
  {
    id: "new-project",
    title: "New Project",
    icon: "add",
    keywords: ["create", "project"],
  },
  {
    id: "switch-theme",
    title: "Toggle Theme",
    icon: "sun",
    keywords: ["dark", "light", "mode"],
  },
  {
    id: "open-settings",
    title: "Open Settings",
    icon: "settings",
    keywords: ["preferences", "config"],
  },
  {
    id: "open-docs",
    title: "Open Documentation",
    icon: "bookOpen",
    keywords: ["help", "docs"],
  },
];
