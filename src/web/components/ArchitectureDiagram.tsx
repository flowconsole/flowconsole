import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  applyNodeChanges,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type NodeChange,
  MiniMap,
  Panel,
} from '@xyflow/react';
import type {
  ArchitectureDiagramModel,
  ArchitectureEdgeTypes,
  ArchitectureNode,
  ArchitectureNodeTypes,
  ArchitectureEdge,
  FlowDefinition,
} from '../diagram/types';
import './styles.css';
import { FloatingConnectionLine } from '../reactflow/edges/FloatingConnectionLine';
import { buildScopedModel, scopeTrail } from '../diagram/utils/scopedModel';
import { computeLayout } from '../diagram/layout/computeLayout';
import { routeEdges } from '../diagram/layout/edgeRouting';
import { DEFAULT_LAYOUT_CONFIG } from '../diagram/layout/types';
import NavigationPanel from './NavigationPanel';
import type { ThemeControls } from '../types/theme';

export type ElementSelection =
  | { kind: 'node'; item: ArchitectureNode }
  | { kind: 'edge'; item: ArchitectureEdge }
  | null;

type ArchitectureDiagramProps = {
  model: ArchitectureDiagramModel;
  nodeTypes?: ArchitectureNodeTypes;
  edgeTypes?: ArchitectureEdgeTypes;
  editable?: boolean;
  autoLayout?: boolean;
  viewId?: string;
  viewTitle?: string;
  viewDescription?: string;
  resolvedScheme?: 'light' | 'dark';
  themeControls?: ThemeControls;
  /** Callback when a node or edge is clicked. null = click on empty pane (deselect). */
  onElementSelect?: (selection: ElementSelection) => void;
  /** When set, the diagram will focus (zoom/pan) to this node after layout. */
  focusElementId?: string;
};

const ROOT_FOCUS_ID = '__root__';

function sizeOf(node: ArchitectureDiagramModel['nodes'][number]) {
  const w =
    node.width ??
    (typeof node.style?.width === 'number' ? node.style.width : undefined) ??
    node.initialWidth ??
    140;
  const h =
    node.height ??
    (typeof node.style?.height === 'number' ? node.style.height : undefined) ??
    node.initialHeight ??
    100;
  return { width: w, height: h };
}

// --- Highlight state ---

type HighlightState = {
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  connectedNodeIds: Set<string>;
  connectedEdgeIds: Set<string>;
};

const EMPTY_HIGHLIGHT: HighlightState = {
  hoveredNodeId: null,
  hoveredEdgeId: null,
  connectedNodeIds: new Set(),
  connectedEdgeIds: new Set(),
};

export function ArchitectureDiagram({
  model,
  nodeTypes = {},
  edgeTypes = {},
  editable = true,
  autoLayout = true,
  viewId,
  viewTitle,
  viewDescription,
  themeControls,
  onElementSelect,
  focusElementId,
}: ArchitectureDiagramProps) {
  const effectiveScheme = themeControls?.resolvedScheme;

  // --- Drill-down state ---
  const [scopeId, setScopeId] = useState<string | undefined>();
  const modelToRender = useMemo(() => buildScopedModel(model, scopeId), [model, scopeId]);
  const trail = useMemo(() => scopeTrail(model, scopeId), [model, scopeId]);
  const parentScopeId = trail.length > 1 ? trail[trail.length - 2].id : undefined;

  // --- React Flow state ---
  const [nodes, setNodes] = useNodesState<ArchitectureNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ArchitectureEdge>([]);
  const [pendingFocus, setPendingFocus] = useState<string | string[] | undefined>();

  // Apply external focus request — center viewport and select the node
  useEffect(() => {
    if (focusElementId) {
      setPendingFocus(focusElementId);
      setNodes((prev) =>
        prev.map((n) => ({ ...n, selected: n.id === focusElementId }))
      );
    }
  }, [focusElementId, setNodes]);

  // --- Flow panel ---
  const flows = model.flows ?? [];
  const [isFlowPanelVisible, setFlowPanelVisible] = useState(false);
  const defaultFlow = useMemo(
    () => ({ id: '__all__', name: 'All flows', steps: [] as FlowDefinition['steps'] }),
    []
  );
  const flowOptions = useMemo(() => [defaultFlow, ...flows], [defaultFlow, flows]);
  const [activeFlowId, setActiveFlowId] = useState<string | undefined>(defaultFlow.id);
  const [activeFlowStep, setActiveFlowStep] = useState(-1);
  const [flowAnimationTick, setFlowAnimationTick] = useState(0);

  // --- Lookup maps ---
  const nodeTitles = useMemo(() => {
    const map = new Map<string, string>();
    model.nodes.forEach((n) => map.set(n.id, n.data.title));
    return map;
  }, [model.nodes]);

  const nodeIndex = useMemo(() => {
    const map = new Map<string, ArchitectureNode>();
    model.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [model.nodes]);

  const visibleNodeMap = useMemo(() => {
    const map = new Map<string, ArchitectureNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // --- Highlight ---
  const [highlight, setHighlight] = useState<HighlightState>(EMPTY_HIGHLIGHT);
  const isHighlightActive = highlight.hoveredNodeId !== null || highlight.hoveredEdgeId !== null;

  const onNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: ArchitectureNode) => {
      const connEdges = edges.filter(
        (e) => e.source === node.id || e.target === node.id
      );
      const connNodes = new Set(connEdges.flatMap((e) => [e.source, e.target]));
      connNodes.add(node.id);
      setHighlight({
        hoveredNodeId: node.id,
        hoveredEdgeId: null,
        connectedNodeIds: connNodes,
        connectedEdgeIds: new Set(connEdges.map((e) => e.id)),
      });
    },
    [edges]
  );

  const onNodeMouseLeave = useCallback(() => {
    setHighlight(EMPTY_HIGHLIGHT);
  }, []);

  const onEdgeMouseEnter = useCallback(
    (_event: React.MouseEvent, edge: ArchitectureEdge) => {
      setHighlight({
        hoveredNodeId: null,
        hoveredEdgeId: edge.id,
        connectedNodeIds: new Set([edge.source, edge.target]),
        connectedEdgeIds: new Set([edge.id]),
      });
    },
    []
  );

  const onEdgeMouseLeave = useCallback(() => {
    setHighlight(EMPTY_HIGHLIGHT);
  }, []);

  const highlightedNodes = useMemo(() => {
    if (!isHighlightActive) return nodes;
    return nodes.map((node) => ({
      ...node,
      className: highlight.connectedNodeIds.has(node.id) ? 'highlight-active' : 'highlight-dimmed',
    }));
  }, [nodes, isHighlightActive, highlight.connectedNodeIds]);

  const highlightedEdges = useMemo(() => {
    if (!isHighlightActive) return edges;
    return edges.map((edge) => {
      const isConnected = highlight.connectedEdgeIds.has(edge.id);
      return {
        ...edge,
        className: isConnected ? 'highlight-active' : 'highlight-dimmed',
        data: {
          ...edge.data,
          hovered: isConnected,
        },
      };
    });
  }, [edges, isHighlightActive, highlight.connectedEdgeIds]);

  // --- Layout computation ---
  useEffect(() => {
    setScopeId(undefined);
  }, [model]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail?.id) return;
      setScopeId(detail.id);
    };
    window.addEventListener('container:open', handler as EventListener);
    return () => {
      window.removeEventListener('container:open', handler as EventListener);
    };
  }, []);

  const needsFitView = useRef(false);
  const layoutLayersRef = useRef<ReadonlyArray<ReadonlyArray<string>>>([]);
  const layoutEdgesRef = useRef<ReadonlyArray<ArchitectureEdge>>([]);

  useEffect(() => {
    const result = autoLayout
      ? computeLayout(modelToRender)
      : { nodes: modelToRender.nodes, edges: modelToRender.edges, layers: undefined };
    setNodes(result.nodes);
    setEdges(result.edges);
    layoutLayersRef.current = result.layers ?? [];
    layoutEdgesRef.current = modelToRender.edges;
    // Skip fitView when an external focus target is provided — ViewportController will center on it
    if (!focusElementId) {
      needsFitView.current = true;
    }
  }, [modelToRender, autoLayout, setNodes, setEdges, focusElementId]);

  // Re-route edges when nodes are dragged, avoiding obstacle nodes
  const rerouteEdges = useCallback(
    (updatedNodes: ArchitectureNode[]) => {
      const layers = layoutLayersRef.current;
      const originalEdges = layoutEdgesRef.current;
      if (!layers.length || !originalEdges.length) return;

      // Build position map from current node positions
      const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
      for (const node of updatedNodes) {
        const x = node.position?.x ?? 0;
        const y = node.position?.y ?? 0;
        const w = (node.measured?.width ?? (typeof node.style?.width === 'number' ? node.style.width : undefined)) ?? DEFAULT_LAYOUT_CONFIG.nodeWidth;
        const h = (node.measured?.height ?? (typeof node.style?.height === 'number' ? node.style.height : undefined)) ?? DEFAULT_LAYOUT_CONFIG.nodeHeight;
        positions.set(node.id, { x, y, width: w, height: h });
      }

      const routedMap = routeEdges(positions, originalEdges, layers, DEFAULT_LAYOUT_CONFIG);

      setEdges((eds) =>
        eds.map((edge) => {
          const routed = routedMap.get(edge.id);
          if (!routed) {
            // Remove stale routing data if edge is no longer routed
            if (edge.data?.pathType === 'smooth') {
              const { layoutPoints: _, pathType: __, labelPos: ___, sourceAnchor: ____, targetAnchor: _____, ...restData } = edge.data ?? {};
              return { ...edge, data: restData as typeof edge.data };
            }
            return edge;
          }
          return { ...edge, data: { ...edge.data, ...routed } };
        })
      );
    },
    [setEdges]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<ArchitectureNode>[]) => {
      setNodes((nds) => {
        const updated = applyNodeChanges<ArchitectureNode>(changes, nds);
        // Re-route on position changes (drag)
        const hasDrag = changes.some((c) => c.type === 'position' && c.dragging);
        if (hasDrag) {
          rerouteEdges(updated);
        }
        return updated;
      });
    },
    [setNodes, rerouteEdges]
  );

  // --- Scope/focus transitions ---
  const [scopeTransition, setScopeTransition] = useState(false);
  useEffect(() => {
    setFlowAnimationTick((tick) => tick + 1);
    setScopeTransition(true);
    const timer = setTimeout(() => setScopeTransition(false), 450);
    return () => clearTimeout(timer);
  }, [scopeId]);

  // --- Flow panel logic ---
  useEffect(() => {
    if (!activeFlowId && flows.length) {
      setActiveFlowId(flows[0]?.id);
    }
  }, [activeFlowId, flows]);

  useEffect(() => {
    const flow = flows.find((f) => f.id === activeFlowId);
    if (!isFlowPanelVisible) {
      if (activeFlowStep !== -1) setActiveFlowStep(-1);
      return;
    }
    if (!flow) {
      if (activeFlowStep !== 0) setActiveFlowStep(0);
      return;
    }
    const bounded = Math.min(Math.max(activeFlowStep, 0), Math.max(flow.steps.length - 1, 0));
    if (bounded !== activeFlowStep) setActiveFlowStep(bounded);
  }, [activeFlowId, flows, activeFlowStep, isFlowPanelVisible]);

  useEffect(() => {
    if (!isFlowPanelVisible && !focusElementId) needsFitView.current = true;
  }, [isFlowPanelVisible, needsFitView, focusElementId]);

  useEffect(() => {
    const flow = flows.find((f) => f.id === activeFlowId);
    const currentStep = flow?.steps[activeFlowStep];
    setEdges((eds) => {
      let changed = false;
      const next = eds.map((edge) => {
        const originalIds = edge.data?.originalEdgeIds ?? [edge.id];
        const inFlow = flow?.steps.some((s) => originalIds.includes(s.edgeId)) ?? false;
        const isCurrent = currentStep ? originalIds.includes(currentStep.edgeId) : false;
        const flowTick = isCurrent ? flowAnimationTick : edge.data?.flowTick;
        const nextData = {
          ...(edge.data ?? {}),
          flowHighlighted: inFlow || undefined,
          flowCurrent: isCurrent || undefined,
          flowTick,
        };
        if (
          edge.data?.flowHighlighted === nextData.flowHighlighted &&
          edge.data?.flowCurrent === nextData.flowCurrent
        ) {
          return edge;
        }
        changed = true;
        return { ...edge, data: nextData };
      });
      return changed ? next : eds;
    });
  }, [activeFlowId, activeFlowStep, flows, setEdges, scopeId, flowAnimationTick]);

  useEffect(() => {
    const flow = flows.find((f) => f.id === activeFlowId);
    const currentStep = flow?.steps[activeFlowStep];
    const involved = new Set<string>();
    flow?.steps.forEach((s) => {
      involved.add(s.sourceId);
      involved.add(s.targetId);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNodes((nds: any) => {
      let changed = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const next = nds.map((node: any) => {
        const highlighted = involved.has(node.id);
        const currentRole =
          currentStep?.sourceId === node.id
            ? 'source'
            : currentStep?.targetId === node.id
              ? 'target'
              : undefined;
        const nextData = {
          ...node.data,
          flowHighlighted: highlighted || undefined,
          flowCurrent: currentRole,
        } as typeof node.data;
        if (
          node.data.flowHighlighted === nextData.flowHighlighted &&
          node.data.flowCurrent === nextData.flowCurrent
        ) {
          return node;
        }
        changed = true;
        return { ...node, data: nextData };
      });
      return changed ? next : nds;
    });
  }, [activeFlowId, activeFlowStep, flows, setNodes, scopeId]);

  useEffect(() => {
    const flow = flows.find((f) => f.id === activeFlowId);
    const currentStep = flow?.steps[activeFlowStep];
    if (currentStep) {
      const resolveVisible = (id: string | undefined) => {
        if (!id) return undefined;
        let currentId: string | undefined = id;
        while (currentId) {
          if (visibleNodeMap.has(currentId)) return currentId;
          currentId = nodeIndex.get(currentId)?.parentId;
        }
        return undefined;
      };
      const targets = [resolveVisible(currentStep.sourceId), resolveVisible(currentStep.targetId)].filter(
        Boolean
      ) as string[];
      setPendingFocus((prev) => {
        if (Array.isArray(prev) && prev.length === targets.length && prev.every((id, idx) => id === targets[idx])) {
          return prev;
        }
        if (!Array.isArray(prev) && prev === targets[0] && targets.length === 1) return prev;
        if (targets.length === 0) return prev;
        return targets;
      });
    }
  }, [activeFlowId, activeFlowStep, flows, nodeIndex, visibleNodeMap]);

  // --- Navigation ---
  const findClosestContainer = useCallback(
    (nodeId: string) => {
      let current = nodeIndex.get(nodeId);
      while (current?.parentId) {
        const parent = nodeIndex.get(current.parentId);
        if (!parent) break;
        if (parent.type === 'container') return parent.id;
        current = parent;
      }
      return undefined;
    },
    [nodeIndex]
  );

  const handleNavigate = useCallback(
    (nodeId: string) => {
      const target = nodeIndex.get(nodeId);
      if (!target) return;
      const targetScope =
        target.type === 'container' ? target.id : findClosestContainer(nodeId);
      if (targetScope !== scopeId) setScopeId(targetScope);
      setPendingFocus(nodeId);
    },
    [findClosestContainer, nodeIndex, scopeId]
  );

  // Click node → ghost navigation or element selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: ArchitectureNode) => {
      if (node.data.ghost) {
        const originalId = node.id.replace(/^ghost:/, '');
        const original = nodeIndex.get(originalId);
        if (!original) return;
        if (original.type === 'container') {
          setScopeId(originalId);
        } else {
          setScopeId(original.parentId);
        }
        return;
      }
      onElementSelect?.({ kind: 'node', item: node });
    },
    [nodeIndex, onElementSelect]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: ArchitectureEdge) => {
      onElementSelect?.({ kind: 'edge', item: edge });
    },
    [onElementSelect]
  );

  const onPaneClick = useCallback(() => {
    onElementSelect?.(null);
  }, [onElementSelect]);

  // --- Theme ---
  const minimapTheme = useMemo(
    () =>
      effectiveScheme === 'light'
        ? {
            background: '#f6f8fb',
            node: '#cbd5e1',
            stroke: '#0f172a',
            mask: 'rgba(15,23,42,0.08)',
          }
        : {
            background: '#0b0f1a',
            node: '#1f2a3d',
            stroke: '#f8fafc',
            mask: 'rgba(255,255,255,0.08)',
          },
    [effectiveScheme]
  );

  return (
    <ReactFlow
      className={`architecture-diagram theme-${effectiveScheme}${scopeTransition ? ' scope-transition' : ''}`}
      nodes={highlightedNodes}
      edges={highlightedEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      proOptions={{ hideAttribution: true }}
      elevateNodesOnSelect={false}
      selectNodesOnDrag={editable}
      nodesDraggable={editable}
      nodesConnectable={editable}
      elementsSelectable={editable}
      edgesReconnectable={editable}
      panOnDrag={editable}
      minZoom={0.1}
      maxZoom={2}
      connectionLineComponent={FloatingConnectionLine}
      panActivationKeyCode={'Shift'}
      onNodeClick={onNodeClick}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      onEdgeClick={onEdgeClick}
      onEdgeMouseEnter={onEdgeMouseEnter}
      onEdgeMouseLeave={onEdgeMouseLeave}
      onPaneClick={onPaneClick}
    >
        <MiniMap
          pannable
          zoomable
          style={{ background: minimapTheme.background, border: '1px solid var(--diagram-border)' }}
          nodeColor={() => minimapTheme.node}
          nodeStrokeColor={() => minimapTheme.stroke}
          maskColor={minimapTheme.mask}
        />
        <NavigationPanel
          model={model}
          viewId={viewId}
          viewTitle={viewTitle}
          viewDescription={viewDescription}
          flows={flows}
          activeFlowId={activeFlowId}
          activeFlowStep={activeFlowStep}
          nodeTitles={nodeTitles}
          onSelectFlow={(id: string | undefined) => {
            setActiveFlowId(id);
            setActiveFlowStep(-1);
          }}
          onFlowStepChange={(step: number) => setActiveFlowStep(step)}
          onNavigate={handleNavigate}
          onToggleFlowPanel={() => setFlowPanelVisible((v) => !v)}
          scopeTrail={trail}
          scopeId={scopeId}
          parentScopeId={parentScopeId}
          onGoUp={() => setScopeId(parentScopeId)}
          onGoRoot={() => setScopeId(undefined)}
          onGoToScope={(id: string) => setScopeId(id)}
        />

        {/* Flow step panel */}
        {flows.length && isFlowPanelVisible ? (
          <Panel position="top-left" style={{ marginTop: 36 }}>
            <FlowStepPanel
              flows={flows}
              activeFlowId={activeFlowId}
              activeFlowStep={activeFlowStep}
              flowOptions={flowOptions}
              nodeTitles={nodeTitles}
              onSelectFlow={(id: string | undefined) => {
                setActiveFlowId(id);
                setActiveFlowStep(-1);
              }}
              onStepChange={setActiveFlowStep}
            />
          </Panel>
        ) : null}

        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />

        <ViewportController
          focusTarget={pendingFocus}
          onFocused={() => setPendingFocus(undefined)}
          nodes={nodes}
          rootMarker={ROOT_FOCUS_ID}
          needsFitView={needsFitView}
        />
      </ReactFlow>
  );
}

// --- Flow step panel ---

type FlowStepPanelProps = {
  flows: FlowDefinition[];
  activeFlowId?: string;
  activeFlowStep: number;
  flowOptions: FlowDefinition[];
  nodeTitles: Map<string, string>;
  onSelectFlow: (id: string | undefined) => void;
  onStepChange: (step: number) => void;
};

function FlowStepPanel({
  flows,
  activeFlowId,
  activeFlowStep,
  flowOptions,
  nodeTitles,
  onSelectFlow,
  onStepChange,
}: FlowStepPanelProps) {
  const flow = flows.find((f) => f.id === activeFlowId);
  const steps = flow?.steps ?? [];
  const current =
    activeFlowStep >= 0 && steps.length
      ? steps[Math.min(activeFlowStep, Math.max(steps.length - 1, 0))]
      : undefined;

  return (
    <div className="flow-panel">
      <div className="flow-panel__row" style={{ justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 12 }}>Flow</strong>
        <select
          value={activeFlowId ?? ''}
          onChange={(e) => onSelectFlow(e.target.value || undefined)}
        >
          {flowOptions.map((f, idx) => (
            <option key={f.id} value={f.id}>
              {f.name || `Flow ${idx}`}
            </option>
          ))}
        </select>
      </div>
      {flow && current ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="flow-panel__row" style={{ justifyContent: 'space-between' }}>
            <button
              onClick={() => onStepChange(Math.max(activeFlowStep - 1, 0))}
              disabled={activeFlowStep <= 0}
            >
              Prev
            </button>
            <span style={{ fontSize: 12 }}>
              Step {activeFlowStep + 1}/{steps.length}
            </span>
            <button
              onClick={() =>
                onStepChange(Math.min(
                  activeFlowStep < 0 ? 0 : activeFlowStep + 1,
                  Math.max(steps.length - 1, 0)
                ))
              }
              disabled={activeFlowStep >= steps.length - 1}
            >
              Next
            </button>
          </div>
          <div style={{ fontSize: 12 }}>
            <div>
              <strong>Source:</strong> {nodeTitles.get(current.sourceId) ?? current.sourceId}
            </div>
            <div>
              <strong>Target:</strong> {nodeTitles.get(current.targetId) ?? current.targetId}
            </div>
            {current.label ? (
              <div>
                <strong>Action:</strong> {current.label}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--diagram-text-muted)' }}>
          No steps in this flow
        </div>
      )}
    </div>
  );
}

// --- Viewport controller ---

type ViewportControllerProps = {
  focusTarget?: string | string[];
  onFocused: () => void;
  nodes: ArchitectureNode[];
  rootMarker: string;
  needsFitView: React.RefObject<boolean>;
};

function ViewportController({
  focusTarget,
  onFocused,
  nodes,
  rootMarker,
  needsFitView,
}: ViewportControllerProps) {
  const reactFlow = useReactFlow<ArchitectureNode, ArchitectureEdge>();

  // fitView after scope change — wait for ReactFlow to measure new nodes
  useEffect(() => {
    if (!needsFitView.current || !nodes.length) return;
    // Double rAF: first lets React commit DOM, second lets ReactFlow measure
    const outer = requestAnimationFrame(() => {
      const inner = requestAnimationFrame(() => {
        needsFitView.current = false;
        reactFlow.fitView({ padding: 0.15, duration: 300 });
      });
      cancelRef.current = inner;
    });
    const cancelRef = { current: outer };
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(cancelRef.current);
    };
  }, [nodes, reactFlow, needsFitView]);

  // Focus on specific node(s) — flow steps, navigation
  useEffect(() => {
    if (!focusTarget || !nodes.length) return;
    const frame = requestAnimationFrame(() => {
      const ids = Array.isArray(focusTarget) ? focusTarget : [focusTarget];
      if (ids.length === 1 && ids[0] === rootMarker) {
        onFocused();
        return;
      }
      const targets = nodes.filter((n) => ids.includes(n.id)).map((n) => ({ id: n.id }));
      if (!targets.length) return;
      if (targets.length === 1) {
        const node = nodes.find((n) => n.id === targets[0].id);
        if (!node) return;
        const { width, height } = sizeOf(node);
        const centerX = node.position.x + width / 2;
        const centerY = node.position.y + height / 2;
        reactFlow.setCenter(centerX, centerY, { zoom: 0.95, duration: 400 });
        onFocused();
        return;
      }
      reactFlow.fitView({ nodes: targets, padding: 0.3, duration: 400 });
      onFocused();
    });
    return () => cancelAnimationFrame(frame);
  }, [focusTarget, nodes, onFocused, reactFlow, rootMarker]);

  return null;
}
