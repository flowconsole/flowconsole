import type { RoutedEdge, RoutedGraph } from './edgeRouter';
import type { PositionedNode } from './positioningEngine';
import { computeQualityScore } from './qualityScore';

const GRID_SIZE = 8;
const CONTAINER_PADDING = 32;
const COMPONENT_GAP = 48;

function snap(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function cloneGraph(graph: RoutedGraph): RoutedGraph {
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
      routing: { ...edge.routing },
    })) as RoutedEdge[],
  };
}

function nodeMap(graph: RoutedGraph) {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function fitContainers(graph: RoutedGraph) {
  const byId = nodeMap(graph);
  for (const parent of graph.nodes.filter((node) => node.type === 'container')) {
    const children = graph.nodes.filter((node) => node.parentId === parent.id);
    if (!children.length) {
      continue;
    }
    const minX = Math.min(...children.map((node) => node.absolutePosition.x));
    const minY = Math.min(...children.map((node) => node.absolutePosition.y));
    const maxX = Math.max(...children.map((node) => node.absolutePosition.x + node.size.width));
    const maxY = Math.max(...children.map((node) => node.absolutePosition.y + node.size.height));
    parent.absolutePosition.x = Math.min(parent.absolutePosition.x, minX - CONTAINER_PADDING);
    parent.absolutePosition.y = Math.min(parent.absolutePosition.y, minY - CONTAINER_PADDING);
    parent.size.width = Math.max(parent.size.width, maxX - parent.absolutePosition.x + CONTAINER_PADDING);
    parent.size.height = Math.max(parent.size.height, maxY - parent.absolutePosition.y + CONTAINER_PADDING);
    parent.style = {
      ...parent.style,
      width: parent.size.width,
      height: parent.size.height,
    };
    for (const child of children) {
      child.position = {
        x: child.absolutePosition.x - parent.absolutePosition.x,
        y: child.absolutePosition.y - parent.absolutePosition.y,
      };
      byId.set(child.id, child);
    }
  }
}

function balanceWhitespace(graph: RoutedGraph) {
  const topLevel = graph.nodes.filter((node) => !node.parentId).sort((a, b) => a.absolutePosition.x - b.absolutePosition.x);
  let cursorX = 0;
  for (const node of topLevel) {
    node.absolutePosition.x = Math.max(cursorX, node.absolutePosition.x);
    node.position.x = node.absolutePosition.x;
    cursorX = node.absolutePosition.x + node.size.width + COMPONENT_GAP;
  }
}

function alignSiblingBaselines(graph: RoutedGraph) {
  const groups = new Map<string, typeof graph.nodes>();
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
        node.absolutePosition.y = baseline;
        if (!node.parentId) {
          node.position.y = baseline;
        }
      });
    } else {
      const baseline = Math.round(group.reduce((sum, node) => sum + node.absolutePosition.x, 0) / group.length);
      group.forEach((node) => {
        node.absolutePosition.x = baseline;
        if (!node.parentId) {
          node.position.x = baseline;
        }
      });
    }
  }
}

function snapToGrid(graph: RoutedGraph) {
  for (const node of graph.nodes) {
    node.absolutePosition.x = snap(node.absolutePosition.x);
    node.absolutePosition.y = snap(node.absolutePosition.y);
    if (!node.parentId) {
      node.position = { ...node.absolutePosition };
    }
  }
}

function mitigateLabelOverlaps(graph: RoutedGraph) {
  for (const edge of graph.edges) {
    const label = edge.data?.labelPos;
    if (!label) {
      continue;
    }
    const overlappingNode = graph.nodes.find((node) => {
      const x1 = label.x - 36;
      const y1 = label.y - 10;
      const x2 = label.x + 36;
      const y2 = label.y + 10;
      return !(
        x2 <= node.absolutePosition.x ||
        node.absolutePosition.x + node.size.width <= x1 ||
        y2 <= node.absolutePosition.y ||
        node.absolutePosition.y + node.size.height <= y1
      );
    });
    if (overlappingNode) {
      edge.data = {
        ...edge.data,
        labelPos: {
          x: label.x,
          y: label.y - 16,
        },
      };
    }
  }
}

function packDisconnectedComponents(graph: RoutedGraph) {
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

function normalizeBounds(graph: RoutedGraph) {
  const minX = Math.min(...graph.nodes.map((node) => node.absolutePosition.x), 0);
  const minY = Math.min(...graph.nodes.map((node) => node.absolutePosition.y), 0);
  for (const node of graph.nodes) {
    node.absolutePosition.x -= minX;
    node.absolutePosition.y -= minY;
    if (!node.parentId) {
      node.position = { ...node.absolutePosition };
    }
  }
  for (const edge of graph.edges) {
    if (edge.data?.layoutPoints) {
      edge.data.layoutPoints = edge.data.layoutPoints.map((point) => ({
        x: point.x - minX,
        y: point.y - minY,
      }));
    }
    if (edge.data?.labelPos) {
      edge.data.labelPos = {
        x: edge.data.labelPos.x - minX,
        y: edge.data.labelPos.y - minY,
      };
    }
  }
}

export function refineLayout(graph: RoutedGraph): RoutedGraph {
  const next = cloneGraph(graph);
  fitContainers(next);
  balanceWhitespace(next);
  alignSiblingBaselines(next);
  snapToGrid(next);
  mitigateLabelOverlaps(next);
  packDisconnectedComponents(next);
  normalizeBounds(next);
  next.qualityScore = graph.qualityScore;
  return next;
}

export function refineAndScoreLayout(graph: RoutedGraph) {
  const refined = refineLayout(graph);
  return {
    refined,
    score: computeQualityScore(refined),
  };
}
