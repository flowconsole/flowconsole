import { Popover } from '../ui';
import { useReactFlow } from '@xyflow/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavigationPanelControls } from './NavigationPanelControls';
import { NavigationPanelDropdown } from './NavigationPanelDropdown';
import SearchOverlay from './SearchOverlay';
import type { ArchitectureNode, ArchitectureDiagramModel, FlowDefinition } from '../../diagram/types';
import { useHoverPopover, useNavigationHistory } from '../../hooks/hooks';
import './styles.css';

export type NavigationItem = {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  type: ArchitectureNode['type'];
  parentId?: string;
  children: NavigationItem[];
};

type Props = {
  model: ArchitectureDiagramModel;
  viewId?: string;
  viewTitle?: string;
  viewDescription?: string;
  flows?: FlowDefinition[];
  activeFlowId?: string;
  activeFlowStep?: number;
  nodeTitles?: Map<string, string>;
  onSelectFlow?: (id: string | undefined) => void;
  onFlowStepChange?: (step: number) => void;
  onNavigate?: (id: string) => void;
  onToggleFlowPanel?: () => void;
  scopeTrail?: ReadonlyArray<{ id: string; title: string }>;
  scopeId?: string;
  parentScopeId?: string;
  onGoUp?: () => void;
  onGoRoot?: () => void;
  onGoToScope?: (id: string) => void;
};

function shouldIncludeInTree() {
  return true;
}

function buildSearchTree(model: ArchitectureDiagramModel) {
  const index = new Map<string, NavigationItem>();
  const roots: NavigationItem[] = [];

  model.nodes.forEach((node) => {
    const entry: NavigationItem = {
      id: node.id,
      title: node.data.title,
      description: 'description' in node.data ? node.data.description : undefined,
      badge: 'badge' in node.data ? node.data.badge : undefined,
      type: node.type,
      parentId: node.parentId,
      children: [],
    };
    index.set(node.id, entry);
  });

  index.forEach((item) => {
    if (item.parentId && index.has(item.parentId)) {
      index.get(item.parentId)?.children.push(item);
    } else {
      roots.push(item);
    }
  });

  return { roots, index };
}

function buildNavigationTree(model: ArchitectureDiagramModel) {
  const index = new Map<string, NavigationItem>();
  const roots: NavigationItem[] = [];

  model.nodes.forEach((node) => {
    if (!shouldIncludeInTree()) return;
    const entry: NavigationItem = {
      id: node.id,
      title: node.data.title,
      description: node.data.description ?? node.data.subtitle,
      badge: node.data.badge,
      type: node.type,
      parentId: node.parentId,
      children: [],
    };
    index.set(node.id, entry);
  });

  index.forEach((item) => {
    if (item.parentId && index.has(item.parentId)) {
      index.get(item.parentId)?.children.push(item);
    } else {
      roots.push(item);
    }
  });

  return { roots, index };
}

function collectFlat(items: NavigationItem[]) {
  const result: NavigationItem[] = [];
  const walk = (nodes: NavigationItem[]) => {
    nodes.forEach((n) => {
      result.push(n);
      if (n.children.length) walk(n.children);
    });
  };
  walk(items);
  return result;
}


export function NavigationPanel({
  model,
  onNavigate,
  onToggleFlowPanel,
  scopeTrail,
  scopeId,
  onGoRoot,
  onGoToScope,
}: Props) {
  const { roots, index } = useMemo(() => buildNavigationTree(model), [model]);
  const flat = useMemo(() => collectFlat(roots), [roots]);
  const firstId = flat[0]?.id;
  const searchTrees = useMemo(() => buildSearchTree(model), [model]);
  const searchFlat = useMemo(() => collectFlat(searchTrees.roots), [searchTrees.roots]);

  const [activeId, setActiveId] = useState<string | undefined>(firstId);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(roots.map((r) => r.id))
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const flow = useReactFlow<ArchitectureNode>();
  const hoverPopover = useHoverPopover();
  const history = useNavigationHistory(firstId);

  const focusNode = (id: string) => {
    if (onNavigate) {
      onNavigate(id);
      return;
    }
    const node = flow.getNode(id);
    if (!node) return;
    flow.fitView({ nodes: [{ id: node.id }], padding: 0.3, duration: 400 });
  };

  useEffect(() => {
    if (activeId && !index.has(activeId)) {
      const fallback = flat[0]?.id;
      setActiveId(fallback);
      if (fallback) history.visit(fallback);
    }
  }, [activeId, flat, history, index]);

  useEffect(() => {
    if (history.current && history.current !== activeId) {
      setActiveId(history.current);
      focusNode(history.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.current]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectItem = (id: string) => {
    setActiveId(id);
    history.visit(id);
    focusNode(id);
    setSearch('');
    hoverPopover.setOpened(false);
    setSearchOverlayOpen(false);
  };


  return (
    <div className="navigation-panel">
      <Popover
        opened={hoverPopover.opened}
        onClose={hoverPopover.close}
        position="bottom-start"
        withArrow
        offset={4}
      >
        <Popover.Target>
          <div
            onClick={(e) => {
              e.stopPropagation();
              hoverPopover.toggleByClick();
            }}
          >
            <NavigationPanelControls
              onToggle={() => hoverPopover.toggleByClick()}
              onOpenSearch={() => {
                setSearchOverlayOpen(true);
              }}
              onOpenFlows={() => onToggleFlowPanel?.()}
              onHomeHoverStart={hoverPopover.openByHover}
              onHomeHoverEnd={hoverPopover.closeByHover}
              scopeTrail={scopeTrail}
              scopeId={scopeId}
              onGoRoot={onGoRoot}
              onGoToScope={onGoToScope}
            />
          </div>
        </Popover.Target>

        <Popover.Dropdown
          className="navpanel-shell"
          onMouseEnter={hoverPopover.openByHover}
          onMouseLeave={hoverPopover.closeByHover}
        >
          <NavigationPanelDropdown
            tree={roots}
            flat={flat}
            activeId={activeId}
            search={search}
            onSearch={setSearch}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onSelect={selectItem}
            searchInputRef={searchInputRef}
          />
        </Popover.Dropdown>
      </Popover>
      <SearchOverlay
        opened={isSearchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        tree={searchTrees.roots}
        items={searchFlat}
        activeId={activeId}
        onSelect={selectItem}
      />
    </div>
  );
}

export default NavigationPanel;
