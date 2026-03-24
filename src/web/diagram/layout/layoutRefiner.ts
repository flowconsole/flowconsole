import type { PositionedGraph, PositionedNode } from './positioningEngine';
import { computeQualityScore } from './qualityScore';

const GRID_SIZE = 8;
const CONTAINER_PADDING = 32;
const COMPONENT_GAP = 48;

function snap(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function cloneGraph(graph: PositionedGraph): PositionedGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      absolutePosition: { ...node.absolutePosition },
      size: { ...node.size },
      data: { ...node.data },
      style: { ...node.style },
      layout: { ...node.layout },
    })) as PositionedNode[],
    edges: graph.edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        layoutPoints: edge.data?.layoutPoints?.map((point) => ({ ...point })),
        labelPos: edge.data?.labelPos ? { ...edge.data.labelPos } : undefined,
      },
    })),
  };
}

function nodeMap(graph: PositionedGraph) {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function childrenOf(parentId: string, nodes: PositionedNode[]) {
  return nodes.filter((node) => node.parentId === parentId);
}

function descendantsOf(parentId: string, nodes: PositionedNode[]): PositionedNode[] {
  const direct = childrenOf(parentId, nodes);
  const result: PositionedNode[] = [...direct];
  for (const child of direct) {
    result.push(...descendantsOf(child.id, nodes));
  }
  return result;
}

function fitContainers(graph: PositionedGraph) {
  for (const parent of graph.nodes.filter((node) => node.type === 'container')) {
    const children = childrenOf(parent.id, graph.nodes);
    if (!children.length) {
      continue;
    }
    const minX = Math.min(...children.map((node) => node.absolutePosition.x));
    const minY = Math.min(...children.map((node) => node.absolutePosition.y));
    const maxX = Math.max(...children.map((node) => node.absolutePosition.x + node.size.width));
    const maxY = Math.max(...children.map((node) => node.absolutePosition.y + node.size.height));
    parent.absolutePosition.x = Math.min(parent.absolutePosition.x, minX - CONTAINER_PADDING);
    parent.absolutePosition.y = Math.min(parent.absolutePosition.y, minY - CONTAINER_PADDING);
    if (!parent.parentId) {
      parent.position = { ...parent.absolutePosition };
    }
    parent.size.width = Math.max(parent.size.width, maxX - parent.absolutePosition.x + CONTAINER_PADDING);
    parent.size.height = Math.max(parent.size.height, maxY - parent.absolutePosition.y + CONTAINER_PADDING);
    parent.style = {
      ...parent.style,
      width: parent.size.width,
      height: parent.size.height,
    };
  }
}

function balanceWhitespace(graph: PositionedGraph) {
  const topLevel = graph.nodes.filter((node) => !node.parentId).sort((a, b) => a.absolutePosition.x - b.absolutePosition.x);
  let cursorX = 0;
  for (const node of topLevel) {
    const oldX = node.absolutePosition.x;
    node.absolutePosition.x = Math.max(cursorX, node.absolutePosition.x);
    node.position.x = node.absolutePosition.x;
    const deltaX = node.absolutePosition.x - oldX;
    if (deltaX !== 0) {
      for (const desc of descendantsOf(node.id, graph.nodes)) {
        desc.absolutePosition.x += deltaX;
      }
    }
    cursorX = node.absolutePosition.x + node.size.width + COMPONENT_GAP;
  }
}

function alignSiblingBaselines(graph: PositionedGraph) {
  const groups = new Map<string, PositionedNode[]>();
  for (const node of graph.nodes) {
    const key = `${node.parentId ?? '__root__'}:${node.layout.lane}`;
    const group = groups.get(key) ?? [];
    group.push(node);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }
    if (graph.direction === 'LR' || graph.direction === 'RL') {
      const baseline = Math.round(group.reduce((sum, node) => sum + node.absolutePosition.y, 0) / group.length);
      group.forEach((node) => {
        const deltaY = baseline - node.absolutePosition.y;
        node.absolutePosition.y = baseline;
        if (!node.parentId) {
          node.position.y = baseline;
        }
        if (deltaY !== 0) {
          for (const desc of descendantsOf(node.id, graph.nodes)) {
            desc.absolutePosition.y += deltaY;
          }
        }
      });
    } else {
      const baseline = Math.round(group.reduce((sum, node) => sum + node.absolutePosition.x, 0) / group.length);
      group.forEach((node) => {
        const deltaX = baseline - node.absolutePosition.x;
        node.absolutePosition.x = baseline;
        if (!node.parentId) {
          node.position.x = baseline;
        }
        if (deltaX !== 0) {
          for (const desc of descendantsOf(node.id, graph.nodes)) {
            desc.absolutePosition.x += deltaX;
          }
        }
      });
    }
  }
}

function snapToGrid(graph: PositionedGraph) {
  for (const node of graph.nodes) {
    const oldX = node.absolutePosition.x;
    const oldY = node.absolutePosition.y;
    node.absolutePosition.x = snap(oldX);
    node.absolutePosition.y = snap(oldY);
    if (!node.parentId) {
      node.position = { ...node.absolutePosition };
    }
    const deltaX = node.absolutePosition.x - oldX;
    const deltaY = node.absolutePosition.y - oldY;
    if (deltaX !== 0 || deltaY !== 0) {
      for (const desc of descendantsOf(node.id, graph.nodes)) {
        desc.absolutePosition.x += deltaX;
        desc.absolutePosition.y += deltaY;
      }
    }
  }
}

function packDisconnectedComponents(graph: PositionedGraph) {
  const components = graph.profile.disconnectedComponents;
  if (components.length <= 1) {
    return;
  }

  let cursorX = 0;
  for (const component of components) {
    const nodes = graph.nodes.filter((node) => component.has(node.id));
    if (!nodes.length) {
      continue;
    }
    const minX = Math.min(...nodes.map((node) => node.absolutePosition.x));
    const maxX = Math.max(...nodes.map((node) => node.absolutePosition.x + node.size.width));
    const shiftX = cursorX - minX;
    nodes.forEach((node) => {
      node.absolutePosition.x += shiftX;
      if (!node.parentId) {
        node.position.x = node.absolutePosition.x;
      }
    });
    cursorX += maxX - minX + COMPONENT_GAP;
  }
}

function recalcRelativePositions(graph: PositionedGraph) {
  const byId = nodeMap(graph);
  for (const node of graph.nodes) {
    if (!node.parentId) {
      node.position = { ...node.absolutePosition };
      continue;
    }
    const parent = byId.get(node.parentId);
    if (!parent) continue;
    node.position = {
      x: node.absolutePosition.x - parent.absolutePosition.x,
      y: node.absolutePosition.y - parent.absolutePosition.y,
    };
  }
}

function normalizeBounds(graph: PositionedGraph) {
  const minX = Math.min(...graph.nodes.map((node) => node.absolutePosition.x), 0);
  const minY = Math.min(...graph.nodes.map((node) => node.absolutePosition.y), 0);
  for (const node of graph.nodes) {
    node.absolutePosition.x -= minX;
    node.absolutePosition.y -= minY;
    if (!node.parentId) {
      node.position = { ...node.absolutePosition };
    }
  }
}

export function refineLayout(graph: PositionedGraph): PositionedGraph {
  const next = cloneGraph(graph);
  fitContainers(next);
  balanceWhitespace(next);
  alignSiblingBaselines(next);
  snapToGrid(next);
  packDisconnectedComponents(next);
  recalcRelativePositions(next);
  normalizeBounds(next);
  recalcRelativePositions(next);
  next.qualityScore = graph.qualityScore;
  return next;
}

export function refineAndScoreLayout(graph: PositionedGraph) {
  const refined = refineLayout(graph);
  return {
    refined,
    score: computeQualityScore(refined),
  };
}
