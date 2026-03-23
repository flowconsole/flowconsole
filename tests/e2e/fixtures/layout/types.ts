import type {
  ArchitectureDiagramModel,
  ArchitectureEdge,
  ArchitectureNode,
  ContainerNodeData,
  ElementNodeData,
  FlowDefinition,
  RelationshipEdgeData,
} from '../../../../src/web/diagram/types';
import type { LayoutDirection, ShapeDefinition } from '../../../../src/web/diagram/layout';

export type LayoutFixture = {
  readonly id: string;
  readonly name: string;
  readonly model: ArchitectureDiagramModel;
  readonly directions: readonly LayoutDirection[];
  readonly expectations: {
    readonly maxOverlapRatio: number;
    readonly maxEdgeCrossings: number;
    readonly semanticOrder?: readonly [string, 'above' | 'below' | 'left-of' | 'right-of', string][];
    readonly containersMustEnclose: boolean;
  };
  readonly scopes?: readonly {
    readonly scopeId: string;
    readonly expectedVisibleCount: number;
  }[];
  readonly flows?: readonly {
    readonly flowId: string;
    readonly stepCount: number;
  }[];
  readonly customShapes?: readonly ShapeDefinition[];
};

type ElementOverrides = Partial<ElementNodeData> & {
  parentId?: string;
};

type ContainerOverrides = Partial<ContainerNodeData> & {
  parentId?: string;
};

type EdgeOverrides = Partial<RelationshipEdgeData> & {
  type?: ArchitectureEdge['type'];
};

type FlowStepInput = Omit<FlowDefinition['steps'][number], 'id'>;

export function element(id: string, title: string, overrides: ElementOverrides = {}): ArchitectureNode {
  const { parentId, ...data } = overrides;
  return {
    id,
    type: 'element',
    parentId,
    position: { x: 0, y: 0 },
    data: {
      title,
      ...data,
    },
  };
}

export function container(id: string, title: string, overrides: ContainerOverrides = {}): ArchitectureNode {
  const { parentId, ...data } = overrides;
  return {
    id,
    type: 'container',
    parentId,
    position: { x: 0, y: 0 },
    data: {
      title,
      expanded: false,
      ...data,
    },
  };
}

export function edge(
  id: string,
  source: string,
  target: string,
  label: string,
  overrides: EdgeOverrides = {}
): ArchitectureEdge {
  return {
    id,
    type: overrides.type ?? 'relationship',
    source,
    target,
    data: {
      label,
      kind: 'sync',
      ...overrides,
    },
  };
}

export function flow(id: string, steps: readonly FlowStepInput[], name?: string): FlowDefinition {
  return {
    id,
    name,
    steps: steps.map((step, index) => ({
      id: `${id}-step-${index + 1}`,
      ...step,
    })),
  };
}

export function fixture(definition: LayoutFixture) {
  return definition;
}
