import { ActionIcon, Group, Tooltip } from '../ui';
import { IconChevronRight, IconGitBranch, IconHome, IconSearch } from '@tabler/icons-react';

type Props = {
  onToggle: () => void;
  onOpenSearch?: () => void;
  onOpenFlows?: () => void;
  onHomeHoverStart?: () => void;
  onHomeHoverEnd?: () => void;
  scopeTrail?: ReadonlyArray<{ id: string; title: string }>;
  scopeId?: string;
  onGoRoot?: () => void;
  onGoToScope?: (id: string) => void;
};

export function NavigationPanelControls({
  onToggle,
  onOpenSearch,
  onOpenFlows,
  onHomeHoverStart,
  onHomeHoverEnd,
  scopeTrail,
  scopeId,
  onGoRoot,
  onGoToScope,
}: Props) {
  return (
    <div className="navpanel-controls" onClick={onToggle}>
      <Group gap={8} style={{ flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>

        <button
          className="navpanel-scope__crumb navpanel-scope__crumb--link navpanel-home"
          onClick={(e) => { e.stopPropagation(); scopeId ? onGoRoot?.() : onToggle(); }}
          onMouseEnter={onHomeHoverStart}
          onMouseLeave={onHomeHoverEnd}
        >
          <IconHome size={15} />
        </button>

        {/* Scope breadcrumbs — shown when drilled into a container */}
        {scopeId && scopeTrail?.length ? (
          <div className="navpanel-scope">
            {scopeTrail.map((item, idx) => {
              const isLast = idx === scopeTrail.length - 1;
              return (
                <span key={item.id} className="navpanel-scope__segment">
                  <IconChevronRight size={12} stroke={2} style={{ opacity: 0.4 }} />
                  {isLast ? (
                    <span className="navpanel-scope__crumb navpanel-scope__crumb--current">{item.title}</span>
                  ) : (
                    <button
                      className="navpanel-scope__crumb navpanel-scope__crumb--link"
                      onClick={(e) => { e.stopPropagation(); onGoToScope?.(item.id); }}
                    >
                      {item.title}
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        ) : null}

        <Group gap={6} className="navpanel-actions">
          <Tooltip label="Search views" openDelay={300}>
            <ActionIcon
              variant="filled"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSearch?.();
              }}
              aria-label="Search views"
            >
              <IconSearch size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Flows" openDelay={300}>
            <ActionIcon
              variant="light"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFlows?.();
              }}
              aria-label="Flows"
            >
              <IconGitBranch size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </div>
  );
}

export default NavigationPanelControls;
