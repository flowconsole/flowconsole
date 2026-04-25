import { type NodeProps } from '@xyflow/react';
import { useCallback, useRef } from 'react';
import { IconZoomIn } from '@tabler/icons-react';
import type { ContainerNodeType } from '../../diagram/types';
import { toneToColor, resolveNodeStyles } from '../../diagram/theme';
import { HiddenHandles } from './HiddenHandles';
import './styles.css';

export function ContainerNode({ id, data, selected }: NodeProps<ContainerNodeType>) {
  const resolved = resolveNodeStyles({
    tone: data.tone ?? 'muted',
    preset: data.preset,
    customColor: data.customColor,
    customBackgroundColor: data.customBackgroundColor,
    customBorderColor: data.customBorderColor,
  });
  const accent = toneToColor(data.tone ?? 'muted');
  const isCollapsed = data.expanded === false;
  const hasPresetClass = data.preset && data.preset !== 'default';
  // Containers are openable unless explicitly marked as having zero children.
  const canOpen = typeof data.childCount !== 'number' || data.childCount > 0;

  // Track mouse-down position to distinguish click from drag (pan/zoom).
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 4; // px

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    downPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      // Only fire if the click target is the container itself (not a child node).
      // ReactFlow child nodes are rendered as separate overlays, so clicks on them
      // won't hit this handler. But for safety, check currentTarget.
      if (event.target !== event.currentTarget) {
        // Allow clicks on container's own children (title, description, etc.)
        // by checking if the target is inside the container's DOM subtree.
        // Child *nodes* in ReactFlow are separate DOM trees and won't reach here.
      }

      // Ignore drags — only fire on genuine clicks (no movement).
      if (downPos.current) {
        const dx = Math.abs(event.clientX - downPos.current.x);
        const dy = Math.abs(event.clientY - downPos.current.y);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
          downPos.current = null;
          return;
        }
        downPos.current = null;
      }

      // Don't drill into containers with no children — it would blank the diagram.
      if (!canOpen) return;

      event.stopPropagation();
      window.dispatchEvent(new CustomEvent('container:open', { detail: { id } }));
    },
    [id, canOpen]
  );

  return (
    <div
      className={`diagram-container${hasPresetClass ? ` diagram-container--${data.preset}` : ''}`}
      style={{
        borderColor: resolved.borderColor,
        backgroundColor: resolved.backgroundColor,
        boxShadow: selected ? `0 0 0 2px ${resolved.borderColor}22, var(--diagram-card-shadow)` : undefined,
        opacity: resolved.opacity,
        position: 'relative',
        cursor: canOpen ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      {...(canOpen ? { role: 'button', 'aria-label': `Open container ${data.title}` } : {})}
    >
      {isCollapsed ? (
        <div className="diagram-container__collapsed">
          <div className="diagram-container__title-row">
            {canOpen ? (
              <span
                className="diagram-container__drill-icon"
                aria-hidden="true"
                style={{ color: resolved.color ?? accent }}
              >
                <IconZoomIn size={32} stroke={1.8} />
              </span>
            ) : null}
            <span
              className="diagram-card__title"
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                textAlign: 'center',
              }}
            >
              {data.title}
            </span>
          </div>
          {data.description ? (
            <span
              className="diagram-card__description"
              style={{
                textAlign: 'center',
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {data.description}
            </span>
          ) : null}
          {data.badge ? (
            <span className="diagram-badge" style={{ borderColor: resolved.borderColor, color: resolved.color ?? accent }}>
              {data.badge}
            </span>
          ) : null}
          {typeof data.childCount === 'number' && data.childCount > 0 ? (
            <span
              className="diagram-container__child-count"
              style={{ color: resolved.color ?? accent }}
            >
              {data.childCount} {data.childCount === 1 ? 'element' : 'elements'}
            </span>
          ) : null}
        </div>
      ) : (
        <>
          <div className="diagram-container__header" style={{ alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div className="diagram-card__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {data.title}
                </span>
              </div>
              {data.subtitle ? <div className="diagram-card__subtitle">{data.subtitle}</div> : null}
            </div>
            {data.badge ? (
              <span className="diagram-badge" style={{ borderColor: resolved.borderColor, color: resolved.color ?? accent }}>
                {data.badge}
              </span>
            ) : null}
          </div>
          {data.description ? <div className="diagram-container__body">{data.description}</div> : null}
        </>
      )}

      <HiddenHandles />
    </div>
  );
}
