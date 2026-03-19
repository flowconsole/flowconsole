// Type declarations for @flowconsole/web
// This file is a minimal stub for use by the Next.js SaaS app.
// The full implementation is built from source in the OSS package.

import type * as React from 'react';

// --- Core types ---

export type CodeSample = {
  id: string;
  title: string;
  description: string;
  code: string;
};

export type EvaluationResult =
  | { ok: true; model: ArchitectureDiagramModel }
  | { ok: false; error: string };

export type EvaluationContext = {
  apiBaseUrl: string;
};

export type LanguageDefinition = {
  id: string;
  label: string;
  monacoLanguage: string;
  monacoSetup?: (monaco: unknown) => void;
  samples: CodeSample[];
  defaultSampleId?: string;
  evaluate: (source: string, context: EvaluationContext) => Promise<EvaluationResult>;
};

// --- Diagram types ---

export type ElementShape = 'person' | 'service' | 'database' | 'queue' | 'storage' | 'boundary';
export type ElementTone = 'primary' | 'muted' | 'success' | 'warning' | 'danger';
export type ElementStatus = 'operational' | 'degraded' | 'down';
export type RelationshipKind = 'sync' | 'async' | 'event' | 'dependency';

export type ElementNodeData = {
  title: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  badge?: string;
  tone?: ElementTone;
  status?: ElementStatus;
  flowHighlighted?: boolean;
  flowCurrent?: 'source' | 'target';
  shape?: ElementShape;
  icon?: string;
  clickable?: boolean;
};

export type ContainerNodeData = {
  title: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  shape?: 'container';
  footer?: string;
  muted?: boolean;
  expanded?: boolean;
  childCount?: number;
  showOpenButton?: boolean;
};

export type ArchitectureNodeData = ElementNodeData | ContainerNodeData;

export type RelationshipEdgeData = {
  label?: string;
  kind?: RelationshipKind;
  description?: string;
  async?: boolean;
  protocol?: string;
};

export type ArchitectureNode = {
  id: string;
  type?: string;
  data: ArchitectureNodeData;
  position?: { x: number; y: number };
  parentId?: string;
  parentNode?: string;
  extent?: 'parent' | [[ number, number ], [ number, number ]];
  [key: string]: unknown;
};

export type ArchitectureEdge = {
  id: string;
  source: string;
  target: string;
  data?: RelationshipEdgeData;
};

export type ArchitectureDiagramModel = {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
};

// --- Components ---

export declare const ArchitectureDiagram: React.ComponentType<{
  model: ArchitectureDiagramModel;
  nodeTypes?: Record<string, React.ComponentType>;
  edgeTypes?: Record<string, React.ComponentType>;
  onNodeClick?: (event: React.SyntheticEvent, node: ArchitectureNode) => void;
  className?: string;
  [key: string]: unknown;
}>;

export declare const CodeDiagramWorkbench: React.ComponentType<{
  language?: LanguageDefinition;
  modelId?: string;
  [key: string]: unknown;
}>;

// --- Registry ---

export declare const architectureNodeTypes: Record<string, React.ComponentType>;
export declare const architectureEdgeTypes: Record<string, React.ComponentType>;

// --- Language ---

export declare const DEFAULT_LANGUAGE: LanguageDefinition;

// --- Theme ---

export declare const ThemeProvider: React.ComponentType<{
  children?: React.ReactNode;
  defaultTheme?: string;
  [key: string]: unknown;
}>;

export declare function useTheme(): {
  theme: string;
  setTheme: (theme: string) => void;
};

// --- Other exports ---

export declare const FlowConsoleLogo: React.ComponentType<{
  className?: string;
  [key: string]: unknown;
}>;

export declare const NavigationPanel: React.ComponentType<{
  [key: string]: unknown;
}>;
