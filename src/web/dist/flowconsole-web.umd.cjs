"use strict";

// @flowconsole/web — stub CJS bundle
Object.defineProperty(exports, "__esModule", { value: true });

exports.architectureNodeTypes = {};
exports.architectureEdgeTypes = {};

exports.ArchitectureDiagram = function ArchitectureDiagram() {
  return null;
};

exports.CodeDiagramWorkbench = function CodeDiagramWorkbench() {
  return null;
};

exports.DEFAULT_LANGUAGE = {
  id: 'typescript',
  label: 'TypeScript',
  monacoLanguage: 'typescript',
  samples: [],
  defaultSampleId: '',
  evaluate: async () => ({ ok: false, error: 'Package not built' }),
};

exports.FlowConsoleLogo = function FlowConsoleLogo() {
  return null;
};

exports.NavigationPanel = function NavigationPanel() {
  return null;
};

exports.ThemeProvider = function ThemeProvider({ children }) {
  return children ?? null;
};

exports.useTheme = () => ({
  theme: 'light',
  setTheme: () => {},
});
