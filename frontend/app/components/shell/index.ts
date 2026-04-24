/**
 * Shell module — workspace shell, navigation rail, command bar, top bar, and layout composition.
 *
 * This module owns the app-level chrome: left rail, top command bar, central workspace region,
 * and contextual right panel. It does NOT own page content or product-specific inspectors.
 */

export { WorkspaceShell } from "./workspace-shell";
export { NavigationRail } from "./navigation-rail";
export { CommandBar } from "./command-bar";
export { InspectorPanel } from "./inspector-panel";
