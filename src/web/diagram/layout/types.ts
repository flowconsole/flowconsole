import type { ArchitectureDiagramModel, ArchitectureNode, ArchitectureEdge } from '../types';

export interface LayoutConfig {
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly layerGap: number;
  readonly nodeGap: number;
  readonly direction: 'DOWN' | 'RIGHT';
  readonly padding: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeWidth: 240,
  nodeHeight: 100,
  layerGap: 150,
  nodeGap: 50,
  direction: 'DOWN',
  padding: 60,
};

export interface LayoutResult {
  readonly nodes: ArchitectureNode[];
  readonly edges: ArchitectureEdge[];
  readonly bounds: {
    readonly width: number;
    readonly height: number;
  };
}

export type NodeWithLayer = {
  readonly id: string;
  readonly layer: number;
};

export type LayeredGraph = {
  readonly layers: ReadonlyArray<ReadonlyArray<string>>;
  readonly adjacency: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly reverseAdjacency: ReadonlyMap<string, ReadonlyArray<string>>;
};

export type { ArchitectureDiagramModel, ArchitectureNode, ArchitectureEdge };
