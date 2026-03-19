// @flowconsole/web — stub ESM bundle
// This stub satisfies Next.js webpack bundling.
// The full interactive workbench requires the package to be built from source.

export const architectureNodeTypes = {};
export const architectureEdgeTypes = {};

export const ArchitectureDiagram = function ArchitectureDiagram() {
  return null;
};

export const CodeDiagramWorkbench = function CodeDiagramWorkbench() {
  return null;
};

export const DEFAULT_LANGUAGE = {
  id: 'typescript',
  label: 'TypeScript',
  monacoLanguage: 'typescript',
  samples: [],
  defaultSampleId: '',
  evaluate: async () => ({ ok: false, error: 'Package not built' }),
};

export const FlowConsoleLogo = function FlowConsoleLogo() {
  return null;
};

export const NavigationPanel = function NavigationPanel() {
  return null;
};

export const ThemeProvider = function ThemeProvider({ children }) {
  return children ?? null;
};

export const useTheme = () => ({
  theme: 'light',
  setTheme: () => {},
});
